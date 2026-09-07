package com.mint.services;

import com.mint.dto.onboarding.artist.ArtistLiveStepRequest;
import com.mint.dto.onboarding.promoter.PromoterNetworkStepRequest;
import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.response.OnboardingCompletionStepError;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.exceptions.OnboardingException;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.EntityType;
import com.mint.repositories.VenueIdentityRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class VenueIdentityRelationshipService {

    private final VenueIdentityRepository repository;

    public VenueIdentityRelationshipService(VenueIdentityRepository repository) {
        this.repository = repository;
    }

    public CanonicalVenueReferences validate(PersonaType persona, Map<String, Object> steps) {
        ReferenceSet referenceSet = referencesFor(persona, steps);
        List<EntityReferenceDto> references = referenceSet.references();
        List<OnboardingFieldError> errors = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (int index = 0; index < references.size(); index++) {
            EntityReferenceDto reference = references.get(index);
            String id = reference == null ? null : reference.entityId();
            if (reference != null && reference.entityType() != EntityType.VENUE) {
                errors.add(new OnboardingFieldError(
                        referenceSet.fieldName() + "[" + index + "].entityType", "MUST_BE_VENUE"));
            }
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
            EntityReferenceDto reference = references.get(index);
            String id = reference == null ? null : reference.entityId();
            if (id != null && !id.isBlank() && !existingIds.contains(id)) {
                errors.add(new OnboardingFieldError(
                        referenceSet.fieldName() + "[" + index + "].entityId", "NOT_FOUND"));
            }
        }
        if (!errors.isEmpty()) {
            throw OnboardingException.notReady(List.of(
                    new OnboardingCompletionStepError(referenceSet.stepKey(), errors)));
        }
        return new CanonicalVenueReferences(persona, List.copyOf(uniqueIds));
    }

    public void createRelationships(String ownerId, CanonicalVenueReferences references) {
        for (String venueIdentityId : references.venueIdentityIds()) {
            switch (references.persona()) {
                case MUSICIAN -> repository.linkPlayedAt(ownerId, venueIdentityId);
                case PROMOTER -> repository.linkWorksWith(ownerId, venueIdentityId);
                case VENUE -> {
                    // Venue onboarding has no VenueIdentity reference relationship in Pass 1.
                }
            }
        }
    }

    private ReferenceSet referencesFor(PersonaType persona, Map<String, Object> steps) {
        return switch (persona) {
            case MUSICIAN -> new ReferenceSet(
                    "live",
                    "venuesPlayed",
                    required(steps, "live", ArtistLiveStepRequest.class).venuesPlayed());
            case PROMOTER -> new ReferenceSet(
                    "network",
                    "venues",
                    required(steps, "network", PromoterNetworkStepRequest.class).venues());
            case VENUE -> new ReferenceSet("room", "venueIdentities", List.of());
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

    public record CanonicalVenueReferences(
            PersonaType persona,
            List<String> venueIdentityIds) {
    }
}
