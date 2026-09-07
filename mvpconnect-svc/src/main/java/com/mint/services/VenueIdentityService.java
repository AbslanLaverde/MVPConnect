package com.mint.services;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.request.CreateFreeFormVenueIdentityRequest;
import com.mint.dto.request.ResolveVenueIdentityRequest;
import com.mint.dto.response.venueidentity.GoogleVenueSearchResponse;
import com.mint.dto.response.venueidentity.VenueIdentityResponse;
import com.mint.dto.response.venueidentity.VenuePhotoPresentationResponse;
import com.mint.exceptions.VenueIdentityException;
import com.mint.googleplaces.GoogleVenueIdentityData;
import com.mint.identity.IdentityNameNormalizer;
import com.mint.nodes.VenueIdentity;
import com.mint.repositories.VenueIdentityRepository;
import com.mint.venueidentity.GoogleAttemptStatus;
import com.mint.venueidentity.VenueIdentityEnrichmentStatus;
import com.mint.venueidentity.VenueIdentityProvider;
import com.mint.venueidentity.VenueIdentityResolutionStatus;
import com.mint.venueidentity.VenueIdentitySource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class VenueIdentityService {

    static final int SEARCH_LIMIT = 10;
    private static final int MAX_GOOGLE_PLACE_ID_LENGTH = 512;
    private static final Logger LOGGER = LoggerFactory.getLogger(VenueIdentityService.class);

    private final VenueIdentityRepository repository;
    private final VenueIdentityPersistenceService persistenceService;
    private final GooglePlacesService googlePlacesService;

    public VenueIdentityService(
            VenueIdentityRepository repository,
            VenueIdentityPersistenceService persistenceService,
            GooglePlacesService googlePlacesService) {
        this.repository = repository;
        this.persistenceService = persistenceService;
        this.googlePlacesService = googlePlacesService;
    }

    @Transactional(readOnly = true)
    public List<VenueIdentityResponse> searchLocal(String rawQuery) {
        String query = validatedQuery(rawQuery);
        return repository.searchByName(query, SEARCH_LIMIT).stream()
                .map(this::responseWithFreshPhoto)
                .toList();
    }

    public List<GoogleVenueSearchResponse> searchGoogle(String rawQuery) {
        validatedQuery(rawQuery);
        return googlePlacesService.searchVenues(rawQuery).stream()
                .map(GoogleVenueSearchResponse::from)
                .toList();
    }

    public VenueIdentityResponse resolveGoogle(ResolveVenueIdentityRequest request) {
        if (request.provider() != VenueIdentityProvider.GOOGLE) {
            throw VenueIdentityException.invalid("Only GOOGLE is supported as a venue provider.");
        }
        String googlePlaceId = validatedProviderPlaceId(request.providerPlaceId());
        return repository.findByGooglePlaceId(googlePlaceId)
                .map(this::responseWithFreshPhoto)
                .orElseGet(() -> resolveNewGoogleVenue(googlePlaceId));
    }

    @Transactional
    public VenueIdentityResponse createFreeForm(CreateFreeFormVenueIdentityRequest request) {
        String displayName = IdentityNameNormalizer.displayName(request.displayName());
        if (displayName.isEmpty()) {
            throw VenueIdentityException.invalid("A venue display name is required.");
        }
        String normalizedName = IdentityNameNormalizer.normalize(displayName);
        String city = normalizedLocationPart(request.location() == null
                ? null : request.location().city());
        String state = normalizedLocationPart(request.location() == null
                ? null : request.location().state());
        return repository.findReusableFreeForm(normalizedName, city, state)
                .map(VenueIdentityResponse::from)
                .orElseGet(() -> VenueIdentityResponse.from(repository.save(
                        newFreeFormIdentity(displayName, request.googleAttemptStatus(), request.location())
                )));
    }

    private VenueIdentityResponse resolveNewGoogleVenue(String googlePlaceId) {
        GoogleVenueIdentityData providerVenue = googlePlacesService.resolveVenue(googlePlaceId);
        VenueIdentity identity = newGoogleIdentity(providerVenue);
        try {
            return VenueIdentityResponse.from(
                    persistenceService.create(identity),
                    VenuePhotoPresentationResponse.from(providerVenue.photo())
            );
        } catch (DataIntegrityViolationException collision) {
            LOGGER.info("venue_identity.google.concurrent_reuse googlePlaceIdPresent=true");
            return repository.findByGooglePlaceId(googlePlaceId)
                    .map(winner -> VenueIdentityResponse.from(
                            winner,
                            VenuePhotoPresentationResponse.from(providerVenue.photo())
                    ))
                    .orElseThrow(VenueIdentityException::googleUnavailable);
        }
    }

    private VenueIdentityResponse responseWithFreshPhoto(VenueIdentity identity) {
        if (identity.getSource() != VenueIdentitySource.GOOGLE
                || identity.getGooglePlaceId() == null
                || identity.getGooglePlaceId().isBlank()) {
            return VenueIdentityResponse.from(identity);
        }
        return VenueIdentityResponse.from(
                identity,
                VenuePhotoPresentationResponse.from(
                        googlePlacesService.presentVenuePhoto(identity.getGooglePlaceId())
                )
        );
    }

    private VenueIdentity newGoogleIdentity(GoogleVenueIdentityData providerVenue) {
        VenueIdentity identity = baseIdentity(providerVenue.name());
        identity.setSource(VenueIdentitySource.GOOGLE);
        identity.setResolutionStatus(VenueIdentityResolutionStatus.RESOLVED);
        identity.setGooglePlaceId(providerVenue.googlePlaceId());
        identity.setGoogleMapsUri(providerVenue.googleMapsUri());
        identity.setProviderWebsiteUrl(providerVenue.websiteUri());
        identity.setGoogleBusinessStatus(providerVenue.businessStatus());
        applyProviderLocation(identity, providerVenue);
        identity.setGoogleLastSyncedAt(LocalDateTime.now());
        return identity;
    }

    private VenueIdentity newFreeFormIdentity(
            String displayName,
            GoogleAttemptStatus attemptStatus,
            LocationDto location) {
        VenueIdentity identity = baseIdentity(displayName);
        if (attemptStatus == GoogleAttemptStatus.UNAVAILABLE) {
            identity.setSource(VenueIdentitySource.FREE_FORM_GOOGLE_UNAVAILABLE);
            identity.setResolutionStatus(VenueIdentityResolutionStatus.RETRY_GOOGLE);
        } else {
            identity.setSource(VenueIdentitySource.FREE_FORM);
            identity.setResolutionStatus(VenueIdentityResolutionStatus.UNRESOLVED);
        }
        if (location != null) {
            applyLocation(identity, location);
        }
        return identity;
    }

    private VenueIdentity baseIdentity(String displayName) {
        VenueIdentity identity = new VenueIdentity();
        identity.setName(IdentityNameNormalizer.displayName(displayName));
        identity.setNormalizedName(IdentityNameNormalizer.normalize(displayName));
        identity.setEnrichmentStatus(VenueIdentityEnrichmentStatus.PENDING);
        identity.setEnrichmentVersion(VenueIdentity.CURRENT_ENRICHMENT_VERSION);
        return identity;
    }

    private void applyProviderLocation(VenueIdentity identity, GoogleVenueIdentityData venue) {
        identity.setLocationDisplay(venue.locationDisplay());
        identity.setLocationAddressLine1(venue.locationAddressLine1());
        identity.setLocationAddressLine2(venue.locationAddressLine2());
        identity.setLocationCity(venue.locationCity());
        identity.setLocationState(venue.locationState());
        identity.setLocationPostalCode(venue.locationPostalCode());
        identity.setLocationCountry(venue.locationCountry());
        identity.setLocationLatitude(venue.locationLatitude());
        identity.setLocationLongitude(venue.locationLongitude());
        identity.setLocationNeighborhood(venue.locationNeighborhood());
    }

    private void applyLocation(VenueIdentity identity, LocationDto location) {
        identity.setLocationDisplay(location.displayName());
        identity.setLocationAddressLine1(location.addressLine1());
        identity.setLocationAddressLine2(location.addressLine2());
        identity.setLocationCity(location.city());
        identity.setLocationState(location.state());
        identity.setLocationPostalCode(location.postalCode());
        identity.setLocationCountry(location.country());
        identity.setLocationLatitude(location.latitude());
        identity.setLocationLongitude(location.longitude());
        identity.setLocationNeighborhood(location.neighborhood());
    }

    private String validatedQuery(String rawQuery) {
        String query = IdentityNameNormalizer.normalize(rawQuery);
        if (query.length() < 2 || query.length() > 100) {
            throw VenueIdentityException.invalid(
                    "Venue search must be between 2 and 100 characters."
            );
        }
        return query;
    }

    private String validatedProviderPlaceId(String rawId) {
        String placeId = rawId == null ? "" : rawId.trim();
        if (placeId.isEmpty()
                || placeId.length() > MAX_GOOGLE_PLACE_ID_LENGTH
                || placeId.chars().anyMatch(Character::isISOControl)) {
            throw VenueIdentityException.invalid("A valid Google place ID is required.");
        }
        return placeId;
    }

    private String normalizedLocationPart(String value) {
        String normalized = IdentityNameNormalizer.normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }
}
