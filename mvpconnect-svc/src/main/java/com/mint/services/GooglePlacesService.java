package com.mint.services;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.mint.config.GooglePlacesProperties;
import com.mint.dto.response.location.LocationSuggestionResponse;
import com.mint.dto.response.location.ResolvedLocationResponse;
import com.mint.exceptions.LocationLookupException;
import com.mint.exceptions.VenueIdentityException;
import com.mint.googleplaces.GooglePhotoAuthorAttributionData;
import com.mint.googleplaces.GooglePhotoPresentationData;
import com.mint.googleplaces.GoogleVenueIdentityData;
import com.mint.identity.IdentityNameNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.net.URI;
import java.util.Optional;

@Service
public class GooglePlacesService {

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesService.class);
    private static final String AUTOCOMPLETE_FIELD_MASK =
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text";
    private static final String DETAILS_FIELD_MASK =
            "id,formattedAddress,addressComponents,location";
    private static final String VENUE_SEARCH_FIELD_MASK =
            "places.id,places.displayName,places.formattedAddress,places.addressComponents,"
                    + "places.location,places.googleMapsUri,places.websiteUri,places.businessStatus,"
                    + "places.photos";
    private static final String VENUE_DETAILS_FIELD_MASK =
            "id,displayName,formattedAddress,addressComponents,location,googleMapsUri,"
                    + "websiteUri,businessStatus,photos";
    private static final String VENUE_PHOTO_DETAILS_FIELD_MASK = "id,googleMapsUri,photos";
    private static final int VENUE_SEARCH_LIMIT = 10;
    private static final int VENUE_PHOTO_MAX_WIDTH = 640;
    private static final int VENUE_PHOTO_MAX_HEIGHT = 480;

    private final RestClient restClient;
    private final GooglePlacesProperties properties;

    public GooglePlacesService(
            @Qualifier("googlePlacesRestClient") RestClient restClient,
            GooglePlacesProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public List<LocationSuggestionResponse> suggest(String rawQuery, String rawMode) {
        String query = normalizeQuery(rawQuery);
        LocationSearchMode mode = LocationSearchMode.from(rawMode);
        if (!configured()) {
            return List.of();
        }

        GoogleAutocompleteRequest request = new GoogleAutocompleteRequest(
                query,
                mode == LocationSearchMode.CITY ? List.of("(cities)") : null,
                "en"
        );

        try {
            GoogleAutocompleteResponse response = restClient.post()
                    .uri("/v1/places:autocomplete")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .header("X-Goog-FieldMask", AUTOCOMPLETE_FIELD_MASK)
                    .body(request)
                    .retrieve()
                    .body(GoogleAutocompleteResponse.class);
            if (response == null || response.suggestions() == null) {
                return List.of();
            }
            List<LocationSuggestionResponse> suggestions = response.suggestions().stream()
                    .map(GoogleSuggestion::placePrediction)
                    .filter(prediction -> prediction != null
                            && StringUtils.hasText(prediction.placeId())
                            && prediction.text() != null
                            && StringUtils.hasText(prediction.text().text()))
                    .limit(6)
                    .map(prediction -> new LocationSuggestionResponse(
                            prediction.placeId(),
                            prediction.text().text()
                    ))
                    .toList();
            log.debug("location.suggestions.received mode={} count={}", mode, suggestions.size());
            return suggestions;
        } catch (RestClientException exception) {
            log.warn("Google Places autocomplete request failed: {}", exception.getClass().getSimpleName());
            throw LocationLookupException.unavailable();
        }
    }

    public ResolvedLocationResponse resolve(String rawPlaceId) {
        String placeId = normalizePlaceId(rawPlaceId);
        if (!configured()) {
            throw LocationLookupException.unavailable();
        }

        try {
            GooglePlaceDetails response = restClient.get()
                    .uri("/v1/places/{placeId}", placeId)
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .header("X-Goog-FieldMask", DETAILS_FIELD_MASK)
                    .retrieve()
                    .body(GooglePlaceDetails.class);
            if (response == null || !StringUtils.hasText(response.id())) {
                throw LocationLookupException.unavailable();
            }
            ResolvedLocationResponse resolved = toResolvedLocation(response);
            log.debug("location.place.resolved hasCoordinates={}",
                    resolved.latitude() != null && resolved.longitude() != null);
            return resolved;
        } catch (LocationLookupException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn("Google Places details request failed: {}", exception.getClass().getSimpleName());
            throw LocationLookupException.unavailable();
        }
    }

    public List<GoogleVenueIdentityData> searchVenues(String rawQuery) {
        String query = normalizeVenueQuery(rawQuery);
        if (!configured()) {
            throw VenueIdentityException.googleUnavailable();
        }

        try {
            GoogleTextSearchResponse response = restClient.post()
                    .uri("/v1/places:searchText")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .header("X-Goog-FieldMask", VENUE_SEARCH_FIELD_MASK)
                    .body(new GoogleTextSearchRequest(query, VENUE_SEARCH_LIMIT, "en"))
                    .retrieve()
                    .body(GoogleTextSearchResponse.class);
            if (response == null || response.places() == null) {
                return List.of();
            }
            List<GoogleVenueIdentityData> venues = response.places().stream()
                    .filter(GooglePlacesService::usableVenue)
                    .limit(VENUE_SEARCH_LIMIT)
                    .map(this::toVenueIdentityData)
                    .toList();
            log.debug("venue_identity.google.search.received count={}", venues.size());
            return venues;
        } catch (VenueIdentityException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn("venue_identity.google.search.failed exception={}",
                    exception.getClass().getSimpleName());
            throw VenueIdentityException.googleUnavailable();
        }
    }

    public GoogleVenueIdentityData resolveVenue(String rawPlaceId) {
        String placeId = normalizePlaceId(rawPlaceId);
        if (!configured()) {
            throw VenueIdentityException.googleUnavailable();
        }

        try {
            GooglePlaceDetails response = restClient.get()
                    .uri("/v1/places/{placeId}", placeId)
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .header("X-Goog-FieldMask", VENUE_DETAILS_FIELD_MASK)
                    .retrieve()
                    .body(GooglePlaceDetails.class);
            if (!usableVenue(response)) {
                throw VenueIdentityException.googleVenueNotFound();
            }
            GoogleVenueIdentityData venue = toVenueIdentityData(response);
            log.debug("venue_identity.google.place.resolved hasCoordinates={}",
                    venue.locationLatitude() != null && venue.locationLongitude() != null);
            return venue;
        } catch (HttpClientErrorException.NotFound exception) {
            throw VenueIdentityException.googleVenueNotFound();
        } catch (VenueIdentityException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn("venue_identity.google.resolve.failed exception={}",
                    exception.getClass().getSimpleName());
            throw VenueIdentityException.googleUnavailable();
        }
    }

    /**
     * Loads transient provider-owned photo presentation for a durable Google-backed identity.
     * A photo problem is deliberately represented as no presentation data; it must never make
     * a local VenueIdentity unusable.
     */
    public GooglePhotoPresentationData presentVenuePhoto(String rawPlaceId) {
        String placeId;
        try {
            placeId = normalizePlaceId(rawPlaceId);
        } catch (IllegalArgumentException exception) {
            return null;
        }
        if (!configured()) {
            return null;
        }

        try {
            GooglePlaceDetails response = restClient.get()
                    .uri("/v1/places/{placeId}", placeId)
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .header("X-Goog-FieldMask", VENUE_PHOTO_DETAILS_FIELD_MASK)
                    .retrieve()
                    .body(GooglePlaceDetails.class);
            if (response == null || !placeId.equals(response.id())) {
                return null;
            }
            return resolveFirstPhoto(response.id(), response.googleMapsUri(), response.photos());
        } catch (RestClientException exception) {
            log.debug("venue_identity.google.photo.presentation_unavailable exception={}",
                    exception.getClass().getSimpleName());
            return null;
        }
    }

    private boolean configured() {
        return StringUtils.hasText(properties.getApiKey());
    }

    private static String normalizeQuery(String rawQuery) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() < 2 || query.length() > 200) {
            throw new IllegalArgumentException("Location query must be between 2 and 200 characters.");
        }
        return query;
    }

    private static String normalizeVenueQuery(String rawQuery) {
        String query = IdentityNameNormalizer.displayName(rawQuery);
        if (query.length() < 2 || query.length() > 100) {
            throw VenueIdentityException.invalid(
                    "Venue search must be between 2 and 100 characters."
            );
        }
        return query;
    }

    private static String normalizePlaceId(String rawPlaceId) {
        String placeId = rawPlaceId == null ? "" : rawPlaceId.trim();
        if (placeId.isEmpty() || placeId.length() > 512 || placeId.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("A valid Google place ID is required.");
        }
        return placeId;
    }

    private static ResolvedLocationResponse toResolvedLocation(GooglePlaceDetails place) {
        List<GoogleAddressComponent> components = place.addressComponents() == null
                ? List.of()
                : place.addressComponents();
        String streetNumber = component(components, "street_number", false);
        String route = component(components, "route", false);
        String city = firstNonBlank(
                component(components, "locality", false),
                component(components, "postal_town", false),
                component(components, "administrative_area_level_2", false),
                component(components, "sublocality_level_1", false)
        );
        String state = firstNonBlank(
                component(components, "administrative_area_level_1", true),
                component(components, "administrative_area_level_1", false)
        );
        String country = component(components, "country", false);
        String postalCode = component(components, "postal_code", false);
        String neighborhood = firstNonBlank(
                component(components, "neighborhood", false),
                component(components, "sublocality_level_1", false)
        );
        String addressLine1 = String.join(" ", nonBlank(streetNumber, route));
        GooglePoint point = place.location();

        return new ResolvedLocationResponse(
                blankToNull(place.formattedAddress()),
                blankToNull(addressLine1),
                null,
                valueOrEmpty(city),
                valueOrEmpty(state),
                blankToNull(postalCode),
                valueOrEmpty(country),
                point == null ? null : point.latitude(),
                point == null ? null : point.longitude(),
                blankToNull(neighborhood),
                place.id()
        );
    }

    private static boolean usableVenue(GooglePlaceDetails place) {
        return place != null
                && StringUtils.hasText(place.id())
                && place.displayName() != null
                && StringUtils.hasText(place.displayName().text());
    }

    private GoogleVenueIdentityData toVenueIdentityData(GooglePlaceDetails place) {
        ResolvedLocationResponse location = toResolvedLocation(place);
        return new GoogleVenueIdentityData(
                place.id(),
                IdentityNameNormalizer.displayName(place.displayName().text()),
                blankToNull(place.googleMapsUri()),
                blankToNull(place.websiteUri()),
                blankToNull(place.businessStatus()),
                location.displayName(),
                location.addressLine1(),
                location.addressLine2(),
                location.city(),
                location.state(),
                location.postalCode(),
                location.country(),
                location.latitude(),
                location.longitude(),
                location.neighborhood(),
                resolveFirstPhoto(place.id(), place.googleMapsUri(), place.photos())
        );
    }

    private GooglePhotoPresentationData resolveFirstPhoto(
            String expectedPlaceId,
            String placeGoogleMapsUri,
            List<GooglePhoto> photos) {
        if (photos == null || photos.isEmpty()) {
            return null;
        }
        GooglePhoto photo = photos.stream()
                .filter(candidate -> candidate != null && StringUtils.hasText(candidate.name()))
                .findFirst()
                .orElse(null);
        if (photo == null) {
            return null;
        }
        Optional<GooglePhotoNameParts> nameParts = photoNameParts(photo.name(), expectedPlaceId);
        if (nameParts.isEmpty()) {
            log.debug("venue_identity.google.photo.invalid_resource_name");
            return null;
        }

        try {
            GooglePhotoNameParts parts = nameParts.get();
            GooglePhotoMedia media = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/places/{placeId}/photos/{photoReference}/media")
                            .queryParam("maxWidthPx", VENUE_PHOTO_MAX_WIDTH)
                            .queryParam("maxHeightPx", VENUE_PHOTO_MAX_HEIGHT)
                            .queryParam("skipHttpRedirect", true)
                            .build(parts.placeId(), parts.photoReference()))
                    .header("X-Goog-Api-Key", properties.getApiKey())
                    .retrieve()
                    .body(GooglePhotoMedia.class);
            String photoUri = media == null ? null : safeHttpsUri(media.photoUri());
            if (photoUri == null) {
                return null;
            }
            List<GooglePhotoAuthorAttributionData> attributions = photo.authorAttributions() == null
                    ? List.of()
                    : photo.authorAttributions().stream()
                            .filter(attribution -> attribution != null)
                            .map(attribution -> new GooglePhotoAuthorAttributionData(
                                    blankToNull(attribution.displayName()),
                                    safeHttpsUri(attribution.uri()),
                                    safeHttpsUri(attribution.photoUri())
                            ))
                            .toList();
            return new GooglePhotoPresentationData(
                    photoUri,
                    attributions,
                    firstNonBlank(
                            safeHttpsUri(photo.googleMapsUri()),
                            safeHttpsUri(placeGoogleMapsUri)
                    )
            );
        } catch (RestClientException | IllegalArgumentException exception) {
            log.debug("venue_identity.google.photo.media_unavailable exception={}",
                    exception.getClass().getSimpleName());
            return null;
        }
    }

    private static Optional<GooglePhotoNameParts> photoNameParts(
            String rawPhotoName,
            String expectedPlaceId) {
        String[] segments = rawPhotoName == null ? new String[0] : rawPhotoName.trim().split("/");
        if (segments.length != 4
                || !"places".equals(segments[0])
                || !"photos".equals(segments[2])
                || !expectedPlaceId.equals(segments[1])
                || !StringUtils.hasText(segments[3])
                || segments[3].chars().anyMatch(Character::isISOControl)) {
            return Optional.empty();
        }
        return Optional.of(new GooglePhotoNameParts(segments[1], segments[3]));
    }

    private static String safeHttpsUri(String rawUri) {
        if (!StringUtils.hasText(rawUri)) {
            return null;
        }
        try {
            URI uri = URI.create(rawUri.trim());
            return "https".equalsIgnoreCase(uri.getScheme()) && StringUtils.hasText(uri.getHost())
                    ? uri.toString()
                    : null;
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private static String component(
            List<GoogleAddressComponent> components,
            String type,
            boolean shortValue) {
        return components.stream()
                .filter(component -> component.types() != null && component.types().contains(type))
                .map(component -> shortValue ? component.shortText() : component.longText())
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse(null);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private static List<String> nonBlank(String... values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                result.add(value);
            }
        }
        return result;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private enum LocationSearchMode {
        CITY,
        ADDRESS;

        private static LocationSearchMode from(String rawMode) {
            try {
                return valueOf((rawMode == null ? "CITY" : rawMode).trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Location mode must be CITY or ADDRESS.");
            }
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record GoogleAutocompleteRequest(
            String input,
            List<String> includedPrimaryTypes,
            String languageCode
    ) {
    }

    private record GoogleAutocompleteResponse(List<GoogleSuggestion> suggestions) {
    }

    private record GoogleTextSearchRequest(
            String textQuery,
            Integer pageSize,
            String languageCode
    ) {
    }

    private record GoogleTextSearchResponse(List<GooglePlaceDetails> places) {
    }

    private record GoogleSuggestion(GooglePlacePrediction placePrediction) {
    }

    private record GooglePlacePrediction(String placeId, GoogleText text) {
    }

    private record GoogleText(String text) {
    }

    private record GooglePlaceDetails(
            String id,
            GoogleText displayName,
            String formattedAddress,
            List<GoogleAddressComponent> addressComponents,
            GooglePoint location,
            String googleMapsUri,
            String websiteUri,
            String businessStatus,
            List<GooglePhoto> photos
    ) {
    }

    private record GooglePhoto(
            String name,
            Integer widthPx,
            Integer heightPx,
            List<GoogleAuthorAttribution> authorAttributions,
            String googleMapsUri
    ) {
    }

    private record GoogleAuthorAttribution(
            String displayName,
            String uri,
            String photoUri
    ) {
    }

    private record GooglePhotoMedia(String photoUri) {
    }

    private record GooglePhotoNameParts(String placeId, String photoReference) {
    }

    private record GoogleAddressComponent(
            String longText,
            String shortText,
            List<String> types
    ) {
    }

    private record GooglePoint(Double latitude, Double longitude) {
    }
}
