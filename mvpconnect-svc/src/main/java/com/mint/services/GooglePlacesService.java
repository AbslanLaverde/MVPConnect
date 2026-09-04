package com.mint.services;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.mint.config.GooglePlacesProperties;
import com.mint.dto.response.location.LocationSuggestionResponse;
import com.mint.dto.response.location.ResolvedLocationResponse;
import com.mint.exceptions.LocationLookupException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class GooglePlacesService {

    private static final Logger log = LoggerFactory.getLogger(GooglePlacesService.class);
    private static final String AUTOCOMPLETE_FIELD_MASK =
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text";
    private static final String DETAILS_FIELD_MASK =
            "id,formattedAddress,addressComponents,location";

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
            return response.suggestions().stream()
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
            return toResolvedLocation(response);
        } catch (LocationLookupException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn("Google Places details request failed: {}", exception.getClass().getSimpleName());
            throw LocationLookupException.unavailable();
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

    private record GoogleSuggestion(GooglePlacePrediction placePrediction) {
    }

    private record GooglePlacePrediction(String placeId, GoogleText text) {
    }

    private record GoogleText(String text) {
    }

    private record GooglePlaceDetails(
            String id,
            String formattedAddress,
            List<GoogleAddressComponent> addressComponents,
            GooglePoint location
    ) {
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
