package com.mint.services;

import com.mint.dto.onboarding.artist.ArtistSoundStepRequest;
import com.mint.dto.onboarding.promoter.PromoterSpecialtiesStepRequest;
import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.onboarding.venue.VenueMusicStepRequest;
import com.mint.dto.response.OnboardingCompletionStepError;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.ExternalArtistRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ExternalArtistRelationshipService {

    private final ExternalArtistRepository repository;

    public ExternalArtistRelationshipService(ExternalArtistRepository repository) {
        this.repository = repository;
    }

    public CanonicalArtistReferences validate(PersonaType persona, Map<String, Object> steps) {
        ReferenceSet referenceSet = referencesFor(persona, steps);
        List<EntityReferenceDto> references = referenceSet.references();
        List<OnboardingFieldError> errors = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int index = 0; index < references.size(); index++) {
            String id = references.get(index).entityId();
            if (id == null || id.isBlank()) {
                errors.add(new OnboardingFieldError(
                        referenceSet.fieldName() + "[" + index + "].entityId", "REQUIRED"));
            } else {
                ids.add(id);
            }
        }

        Set<String> uniqueIds = new LinkedHashSet<>(ids);
        Set<String> existingIds = uniqueIds.isEmpty()
                ? Set.of()
                : new LinkedHashSet<>(repository.findExistingIds(List.copyOf(uniqueIds)));
        for (int index = 0; index < references.size(); index++) {
            String id = references.get(index).entityId();
            if (id != null && !id.isBlank() && !existingIds.contains(id)) {
                errors.add(new OnboardingFieldError(
                        referenceSet.fieldName() + "[" + index + "].entityId", "NOT_FOUND"));
            }
        }
        if (!errors.isEmpty()) {
            throw OnboardingException.notReady(List.of(
                    new OnboardingCompletionStepError(referenceSet.stepKey(), errors)));
        }
        return new CanonicalArtistReferences(persona, List.copyOf(uniqueIds));
    }

    public void createRelationships(String ownerId, CanonicalArtistReferences references) {
        for (String artistId : references.externalArtistIds()) {
            switch (references.persona()) {
                case MUSICIAN -> repository.linkSoundsLike(ownerId, artistId);
                case VENUE -> repository.linkHasBooked(ownerId, artistId);
                case PROMOTER -> repository.linkHasWorkedWith(ownerId, artistId);
            }
        }
    }

    private ReferenceSet referencesFor(PersonaType persona, Map<String, Object> steps) {
        return switch (persona) {
            case MUSICIAN -> new ReferenceSet(
                    "sound",
                    "soundsLikeArtists",
                    required(steps, "sound", ArtistSoundStepRequest.class).soundsLikeArtists());
            case VENUE -> new ReferenceSet(
                    "music",
                    "artistsBooked",
                    required(steps, "music", VenueMusicStepRequest.class).artistsBooked());
            case PROMOTER -> new ReferenceSet(
                    "specialties",
                    "artistsWorkedWith",
                    required(steps, "specialties", PromoterSpecialtiesStepRequest.class)
                            .artistsWorkedWith());
        };
    }

    private <T> T required(Map<String, Object> steps, String key, Class<T> type) {
        Object value = steps.get(key);
        if (!type.isInstance(value)) throw OnboardingException.invalidData();
        return type.cast(value);
    }

    private record ReferenceSet(
            String stepKey,
            String fieldName,
            List<EntityReferenceDto> references) {
    }

    public record CanonicalArtistReferences(PersonaType persona, List<String> externalArtistIds) {
    }
}
