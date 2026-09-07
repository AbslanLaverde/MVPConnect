package com.mint.services;

import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.request.CreateFreeFormVenueIdentityRequest;
import com.mint.dto.request.ResolveVenueIdentityRequest;
import com.mint.googleplaces.GoogleVenueIdentityData;
import com.mint.googleplaces.GooglePhotoAuthorAttributionData;
import com.mint.googleplaces.GooglePhotoPresentationData;
import com.mint.nodes.VenueIdentity;
import com.mint.repositories.VenueIdentityRepository;
import com.mint.venueidentity.GoogleAttemptStatus;
import com.mint.venueidentity.VenueIdentityEnrichmentStatus;
import com.mint.venueidentity.VenueIdentityProvider;
import com.mint.venueidentity.VenueIdentityResolutionStatus;
import com.mint.venueidentity.VenueIdentitySource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VenueIdentityServiceTest {

    @Mock private VenueIdentityRepository repository;
    @Mock private VenueIdentityPersistenceService persistenceService;
    @Mock private GooglePlacesService googlePlacesService;

    private VenueIdentityService service;

    @BeforeEach
    void setUp() {
        service = new VenueIdentityService(repository, persistenceService, googlePlacesService);
    }

    @Test
    void localSearchNormalizesQueryUsesBoundAndIncludesLocationContext() {
        VenueIdentity identity = googleIdentity("venue-1", "place-1", "Baby's All Right");
        when(repository.searchByName("baby's all right", VenueIdentityService.SEARCH_LIMIT))
                .thenReturn(List.of(identity));
        when(googlePlacesService.presentVenuePhoto("place-1")).thenReturn(photo());

        var result = service.searchLocal("  Baby's   All Right ").getFirst();

        assertEquals("venue-1", result.id());
        assertEquals("Brooklyn", result.location().city());
        assertEquals("NY", result.location().state());
        assertEquals("https://lh3.googleusercontent.com/venue-photo", result.photo().url());
        verify(repository).searchByName("baby's all right", 10);
    }

    @Test
    void localFreeFormIdentityUsesPlaceholderWithoutCallingGoogle() {
        VenueIdentity identity = freeFormIdentity("manual-1", "Tiny Local Room");
        when(repository.searchByName("tiny local room", VenueIdentityService.SEARCH_LIMIT))
                .thenReturn(List.of(identity));

        var result = service.searchLocal("Tiny Local Room").getFirst();

        assertNull(result.photo());
        verify(googlePlacesService, never()).presentVenuePhoto(any());
    }

    @Test
    void googleSelectionCreatesResolvedPendingIdentityWithStructuredLocation() {
        AtomicReference<VenueIdentity> created = new AtomicReference<>();
        when(repository.findByGooglePlaceId("place-1")).thenReturn(Optional.empty());
        when(googlePlacesService.resolveVenue("place-1")).thenReturn(providerVenue("place-1"));
        when(persistenceService.create(any(VenueIdentity.class))).thenAnswer(invocation -> {
            VenueIdentity identity = invocation.getArgument(0);
            created.set(identity);
            identity.setId("venue-1");
            return identity;
        });

        var result = service.resolveGoogle(new ResolveVenueIdentityRequest(
                VenueIdentityProvider.GOOGLE, "place-1"));

        assertEquals("venue-1", result.id());
        assertEquals("Baby's All Right", result.name());
        assertEquals(VenueIdentitySource.GOOGLE, result.source());
        assertEquals(VenueIdentityResolutionStatus.RESOLVED, result.resolutionStatus());
        assertEquals(VenueIdentityEnrichmentStatus.PENDING, created.get().getEnrichmentStatus());
        assertEquals("baby's all right", created.get().getNormalizedName());
        assertEquals("Brooklyn", result.location().city());
        assertNotNull(result.googleMapsUri());
    }

    @Test
    void repeatResolveReturnsStableExistingIdentityWithoutProviderCall() {
        when(repository.findByGooglePlaceId("place-1"))
                .thenReturn(Optional.of(googleIdentity("venue-1", "place-1", "Baby's All Right")));

        var result = service.resolveGoogle(new ResolveVenueIdentityRequest(
                VenueIdentityProvider.GOOGLE, "place-1"));

        assertEquals("venue-1", result.id());
        verify(googlePlacesService, never()).resolveVenue("place-1");
    }

    @Test
    void concurrentGoogleInsertCollisionReturnsWinningIdentity() {
        VenueIdentity winner = googleIdentity("winner-id", "place-1", "Baby's All Right");
        when(repository.findByGooglePlaceId("place-1"))
                .thenReturn(Optional.empty(), Optional.of(winner));
        when(googlePlacesService.resolveVenue("place-1")).thenReturn(providerVenue("place-1"));
        when(persistenceService.create(any(VenueIdentity.class)))
                .thenThrow(new DataIntegrityViolationException("unique collision"));

        var result = service.resolveGoogle(new ResolveVenueIdentityRequest(
                VenueIdentityProvider.GOOGLE, "place-1"));

        assertEquals("winner-id", result.id());
    }

    @Test
    void reachableNoMatchCreatesReusableUnresolvedFreeFormIdentity() {
        AtomicReference<VenueIdentity> created = new AtomicReference<>();
        LocationDto location = location();
        when(repository.findReusableFreeForm("tiny local room", "brooklyn", "ny"))
                .thenReturn(Optional.empty());
        when(repository.save(any(VenueIdentity.class))).thenAnswer(invocation -> {
            VenueIdentity identity = invocation.getArgument(0);
            created.set(identity);
            identity.setId("manual-1");
            return identity;
        });

        var result = service.createFreeForm(new CreateFreeFormVenueIdentityRequest(
                "  Tiny   Local Room ", GoogleAttemptStatus.NO_MATCH, location));

        assertEquals("Tiny Local Room", result.name());
        assertEquals(VenueIdentitySource.FREE_FORM, result.source());
        assertEquals(VenueIdentityResolutionStatus.UNRESOLVED, result.resolutionStatus());
        assertEquals(VenueIdentityEnrichmentStatus.PENDING, created.get().getEnrichmentStatus());
        assertEquals("tiny local room", created.get().getNormalizedName());
        assertNull(result.googlePlaceId());
    }

    @Test
    void unavailableGoogleCreatesRetryableFreeFormIdentity() {
        AtomicReference<VenueIdentity> created = new AtomicReference<>();
        when(repository.findReusableFreeForm("tiny local room", null, null))
                .thenReturn(Optional.empty());
        when(repository.save(any(VenueIdentity.class))).thenAnswer(invocation -> {
            VenueIdentity identity = invocation.getArgument(0);
            created.set(identity);
            identity.setId("manual-1");
            return identity;
        });

        var result = service.createFreeForm(new CreateFreeFormVenueIdentityRequest(
                "Tiny Local Room", GoogleAttemptStatus.UNAVAILABLE, null));

        assertEquals(VenueIdentitySource.FREE_FORM_GOOGLE_UNAVAILABLE, result.source());
        assertEquals(VenueIdentityResolutionStatus.RETRY_GOOGLE, result.resolutionStatus());
        assertEquals(VenueIdentityEnrichmentStatus.PENDING, created.get().getEnrichmentStatus());
    }

    @Test
    void normalizedFreeFormReuseReturnsExistingIdentity() {
        VenueIdentity existing = freeFormIdentity("manual-1", "Tiny Local Room");
        when(repository.findReusableFreeForm("tiny local room", null, null))
                .thenReturn(Optional.of(existing));

        var result = service.createFreeForm(new CreateFreeFormVenueIdentityRequest(
                " TINY  LOCAL ROOM ", GoogleAttemptStatus.NO_MATCH, null));

        assertEquals("manual-1", result.id());
        verify(repository, never()).save(any(VenueIdentity.class));
    }

    @Test
    void sameNameGoogleVenuesWithDifferentPlaceIdsRemainDistinct() {
        when(repository.findByGooglePlaceId("place-1")).thenReturn(Optional.empty());
        when(repository.findByGooglePlaceId("place-2")).thenReturn(Optional.empty());
        when(googlePlacesService.resolveVenue("place-1")).thenReturn(providerVenue("place-1"));
        when(googlePlacesService.resolveVenue("place-2")).thenReturn(providerVenue("place-2"));
        when(persistenceService.create(any(VenueIdentity.class))).thenAnswer(invocation -> {
            VenueIdentity identity = invocation.getArgument(0);
            identity.setId("identity-for-" + identity.getGooglePlaceId());
            return identity;
        });

        var first = service.resolveGoogle(new ResolveVenueIdentityRequest(
                VenueIdentityProvider.GOOGLE, "place-1"));
        var second = service.resolveGoogle(new ResolveVenueIdentityRequest(
                VenueIdentityProvider.GOOGLE, "place-2"));

        assertEquals("identity-for-place-1", first.id());
        assertEquals("identity-for-place-2", second.id());
        verify(repository, never()).findReusableFreeForm(any(), any(), any());
    }

    private VenueIdentity googleIdentity(String id, String placeId, String name) {
        VenueIdentity identity = new VenueIdentity();
        identity.setId(id);
        identity.setName(name);
        identity.setNormalizedName(name.toLowerCase());
        identity.setSource(VenueIdentitySource.GOOGLE);
        identity.setResolutionStatus(VenueIdentityResolutionStatus.RESOLVED);
        identity.setEnrichmentStatus(VenueIdentityEnrichmentStatus.PENDING);
        identity.setGooglePlaceId(placeId);
        identity.setGoogleMapsUri("https://maps.google.com/?q=place-1");
        identity.setLocationCity("Brooklyn");
        identity.setLocationState("NY");
        return identity;
    }

    private VenueIdentity freeFormIdentity(String id, String name) {
        VenueIdentity identity = new VenueIdentity();
        identity.setId(id);
        identity.setName(name);
        identity.setNormalizedName(name.toLowerCase());
        identity.setSource(VenueIdentitySource.FREE_FORM);
        identity.setResolutionStatus(VenueIdentityResolutionStatus.UNRESOLVED);
        identity.setEnrichmentStatus(VenueIdentityEnrichmentStatus.PENDING);
        return identity;
    }

    private GoogleVenueIdentityData providerVenue(String placeId) {
        return new GoogleVenueIdentityData(
                placeId,
                "Baby's All Right",
                "https://maps.google.com/?q=place-1",
                "https://babysallright.com",
                "OPERATIONAL",
                "146 Broadway, Brooklyn, NY 11211, USA",
                "146 Broadway",
                null,
                "Brooklyn",
                "NY",
                "11211",
                "United States",
                40.71,
                -73.96,
                "Williamsburg",
                photo()
        );
    }

    private GooglePhotoPresentationData photo() {
        return new GooglePhotoPresentationData(
                "https://lh3.googleusercontent.com/venue-photo",
                List.of(new GooglePhotoAuthorAttributionData(
                        "Venue Owner",
                        "https://maps.google.com/contributor/owner",
                        "https://lh3.googleusercontent.com/avatar"
                )),
                "https://maps.google.com/photo/photo-1"
        );
    }

    private LocationDto location() {
        return new LocationDto(
                "Brooklyn, NY", null, null, "Brooklyn", "NY", null,
                "United States", null, null, null, null
        );
    }
}
