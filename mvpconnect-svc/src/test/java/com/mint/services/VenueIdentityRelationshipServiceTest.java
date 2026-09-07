package com.mint.services;

import com.mint.dto.onboarding.artist.ArtistLiveStepRequest;
import com.mint.dto.onboarding.promoter.PromoterNetworkStepRequest;
import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.ArtistBookingStatus;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.EntityType;
import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.repositories.VenueIdentityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VenueIdentityRelationshipServiceTest {

    @Mock private VenueIdentityRepository repository;

    private VenueIdentityRelationshipService service;

    @BeforeEach
    void setUp() {
        service = new VenueIdentityRelationshipService(repository);
    }

    @Test
    void musicianRealVenueReferencesValidateAndCreatePlayedAtOncePerUniqueId() {
        when(repository.findExistingIds(List.of("venue-1"))).thenReturn(List.of("venue-1"));
        var canonical = service.validate(PersonaType.MUSICIAN, Map.of(
                "live", artistLive(List.of(reference("venue-1"), reference("venue-1")))
        ));

        service.createRelationships("musician-1", canonical);

        assertEquals(List.of("venue-1"), canonical.venueIdentityIds());
        verify(repository, times(1)).linkPlayedAt("musician-1", "venue-1");
    }

    @Test
    void promoterRealVenueReferenceCreatesWorksWith() {
        when(repository.findExistingIds(List.of("venue-1"))).thenReturn(List.of("venue-1"));
        var canonical = service.validate(PersonaType.PROMOTER, Map.of(
                "network", promoterNetwork(List.of(reference("venue-1")))
        ));

        service.createRelationships("promoter-1", canonical);

        verify(repository).linkWorksWith("promoter-1", "venue-1");
    }

    @Test
    void nonexistentVenueIdentityFailsSafeCompletionValidation() {
        when(repository.findExistingIds(List.of("missing"))).thenReturn(List.of());

        OnboardingException exception = assertThrows(OnboardingException.class, () ->
                service.validate(PersonaType.MUSICIAN, Map.of(
                        "live", artistLive(List.of(reference("missing")))
                )));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
    }

    @Test
    void resolverReferenceRequiresStableVenueIdentityIdAtCompletion() {
        OnboardingException exception = assertThrows(OnboardingException.class, () ->
                service.validate(PersonaType.PROMOTER, Map.of(
                        "network", promoterNetwork(List.of(new EntityReferenceDto(
                                EntityType.VENUE, null, "Unresolved Room", true)))
                )));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
    }

    @Test
    void venueReferenceFieldsRejectOtherEntityTypes() {
        OnboardingException exception = assertThrows(OnboardingException.class, () ->
                service.validate(PersonaType.MUSICIAN, Map.of(
                        "live", artistLive(List.of(new EntityReferenceDto(
                                EntityType.ARTIST, "venue-1", "Wrong Type", true)))
                )));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
    }

    private EntityReferenceDto reference(String id) {
        return new EntityReferenceDto(EntityType.VENUE, id, "Baby's All Right", true);
    }

    private ArtistLiveStepRequest artistLive(List<EntityReferenceDto> venues) {
        return new ArtistLiveStepRequest(
                ArtistBookingStatus.ACTIVELY_BOOKING,
                DrawRangeCode.FROM_50_TO_100,
                null,
                false,
                null,
                List.of(),
                venues,
                List.of()
        );
    }

    private PromoterNetworkStepRequest promoterNetwork(List<EntityReferenceDto> venues) {
        return new PromoterNetworkStepRequest(
                PromoterAcceptingStatus.ACTIVELY_ACCEPTING,
                null,
                List.of(),
                venues,
                List.of(),
                List.of()
        );
    }
}
