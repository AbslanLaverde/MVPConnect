package com.mint.services;

import com.mint.dto.onboarding.artist.ArtistSoundStepRequest;
import com.mint.dto.onboarding.promoter.PromoterSpecialtiesStepRequest;
import com.mint.dto.onboarding.promoter.PromoterNetworkStepRequest;
import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.onboarding.venue.VenueMusicStepRequest;
import com.mint.dto.response.OnboardingCompletionValidationDetails;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.EntityType;
import com.mint.onboarding.taxonomy.EventTypeCode;
import com.mint.onboarding.taxonomy.GenreCode;
import com.mint.onboarding.taxonomy.VibeCode;
import com.mint.repositories.ExternalArtistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExternalArtistRelationshipServiceTest {

    @Mock private ExternalArtistRepository repository;
    private ExternalArtistRelationshipService service;

    @BeforeEach
    void setUp() {
        service = new ExternalArtistRelationshipService(repository);
    }

    @Test
    void validatesAllReferencesBeforeCreatingAnyRelationship() {
        when(repository.findExistingIds(List.of("missing-id"))).thenReturn(List.of());
        var references = serviceData(PersonaType.MUSICIAN, "missing-id");

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.validate(PersonaType.MUSICIAN, references));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        verify(repository, never()).linkSoundsLike(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void createsEachPersonaRelationshipUsingTheValidatedStableId() {
        for (PersonaType persona : PersonaType.values()) {
            String id = "artist-" + persona.name().toLowerCase();
            when(repository.findExistingIds(List.of(id))).thenReturn(List.of(id));
            if (persona == PersonaType.PROMOTER) {
                when(repository.findExistingIds(List.of("roster-promoter")))
                        .thenReturn(List.of("roster-promoter"));
            }
            var references = service.validate(persona, serviceData(persona, id));
            service.createRelationships("owner-1", references);
        }

        verify(repository).linkSoundsLike("owner-1", "artist-musician");
        verify(repository).linkHasBooked("owner-1", "artist-venue");
        verify(repository).linkHasWorkedWith("owner-1", "artist-promoter");
        verify(repository).linkHasOnRoster("owner-1", "roster-promoter");
    }

    @Test
    void rejectsMissingStableRosterArtistIdBeforeCreatingRelationships() {
        when(repository.findExistingIds(List.of("worked-with"))).thenReturn(List.of("worked-with"));

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.validate(
                        PersonaType.PROMOTER,
                        promoterData("worked-with", new EntityReferenceDto(
                                EntityType.ARTIST, null, "Unresolved Artist", true))));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        OnboardingCompletionValidationDetails details =
                (OnboardingCompletionValidationDetails) exception.getDetails();
        assertEquals("rosterArtists[0].entityId",
                details.steps().getFirst().errors().getFirst().field());
        verify(repository, never()).linkHasWorkedWith(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        verify(repository, never()).linkHasOnRoster(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void rejectsUnknownRosterArtistIdBeforeCreatingRelationships() {
        when(repository.findExistingIds(List.of("worked-with"))).thenReturn(List.of("worked-with"));
        when(repository.findExistingIds(List.of("unknown-roster-id"))).thenReturn(List.of());

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.validate(
                        PersonaType.PROMOTER,
                        promoterData("worked-with", new EntityReferenceDto(
                                EntityType.ARTIST,
                                "unknown-roster-id",
                                "Unknown Artist",
                                true))));

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        OnboardingCompletionValidationDetails details =
                (OnboardingCompletionValidationDetails) exception.getDetails();
        assertEquals("NOT_FOUND", details.steps().getFirst().errors().getFirst().code());
        verify(repository, never()).linkHasWorkedWith(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        verify(repository, never()).linkHasOnRoster(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    private Map<String, Object> serviceData(PersonaType persona, String externalArtistId) {
        EntityReferenceDto reference = new EntityReferenceDto(
                EntityType.ARTIST, externalArtistId, "Artist", true);
        return switch (persona) {
            case MUSICIAN -> Map.of("sound", new ArtistSoundStepRequest(
                    List.of(GenreCode.ROCK), List.of(VibeCode.ENERGETIC),
                    List.of(EventTypeCode.CONCERT), List.of(reference)));
            case VENUE -> Map.of("music", new VenueMusicStepRequest(
                    List.of(GenreCode.ROCK), List.of(VibeCode.ENERGETIC),
                    List.of(EventTypeCode.CONCERT), List.of(reference)));
            case PROMOTER -> promoterData(externalArtistId, new EntityReferenceDto(
                    EntityType.ARTIST, "roster-promoter", "Roster Artist", true));
        };
    }

    private Map<String, Object> promoterData(
            String workedWithArtistId,
            EntityReferenceDto rosterArtist) {
        return Map.of(
                "specialties", new PromoterSpecialtiesStepRequest(
                        List.of(GenreCode.ROCK), List.of(EventTypeCode.CONCERT),
                        List.of(VibeCode.ENERGETIC), List.of(new EntityReferenceDto(
                                EntityType.ARTIST,
                                workedWithArtistId,
                                "Worked With Artist",
                                true))),
                "network", new PromoterNetworkStepRequest(
                        null, null, List.of(rosterArtist), List.of(), List.of(), List.of()));
    }
}
