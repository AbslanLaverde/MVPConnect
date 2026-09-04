package com.mint.onboarding;

import com.mint.dto.onboarding.artist.ArtistBasicsStepRequest;
import com.mint.dto.onboarding.artist.ArtistGoalsStepRequest;
import com.mint.dto.onboarding.artist.ArtistLiveStepRequest;
import com.mint.dto.onboarding.artist.ArtistMediaStepRequest;
import com.mint.dto.onboarding.artist.ArtistSoundStepRequest;
import com.mint.dto.onboarding.promoter.PromoterBusinessStepRequest;
import com.mint.dto.onboarding.promoter.PromoterGoalsStepRequest;
import com.mint.dto.onboarding.promoter.PromoterMediaStepRequest;
import com.mint.dto.onboarding.promoter.PromoterNetworkStepRequest;
import com.mint.dto.onboarding.promoter.PromoterSpecialtiesStepRequest;
import com.mint.dto.onboarding.venue.VenueBookingStepRequest;
import com.mint.dto.onboarding.venue.VenueGoalsStepRequest;
import com.mint.dto.onboarding.venue.VenueMediaStepRequest;
import com.mint.dto.onboarding.venue.VenueMusicStepRequest;
import com.mint.dto.onboarding.venue.VenueRoomStepRequest;
import com.mint.dto.onboarding.venue.VenueStageStepRequest;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Single source of truth for the ordered onboarding steps in the current schema version.
 */
@Component
public class OnboardingStepRegistry {

    public static final int CURRENT_VERSION = 2;

    private final Map<PersonaType, List<OnboardingStepDefinition>> stepsByPersona;

    public OnboardingStepRegistry() {
        this(defaultDefinitions());
    }

    public OnboardingStepRegistry(Map<PersonaType, List<OnboardingStepDefinition>> definitions) {
        EnumMap<PersonaType, List<OnboardingStepDefinition>> copy = new EnumMap<>(PersonaType.class);
        for (PersonaType persona : PersonaType.values()) {
            List<OnboardingStepDefinition> personaDefinitions = definitions.get(persona);
            if (personaDefinitions == null || personaDefinitions.isEmpty()) {
                throw new IllegalArgumentException("Onboarding steps are required for " + persona);
            }
            validate(persona, personaDefinitions);
            copy.put(
                    persona,
                    personaDefinitions.stream()
                            .sorted(Comparator.comparingInt(OnboardingStepDefinition::position))
                            .toList()
            );
        }
        this.stepsByPersona = Map.copyOf(copy);
    }

    public List<String> stepsFor(PersonaType persona) {
        return definitionsFor(persona).stream()
                .map(OnboardingStepDefinition::key)
                .toList();
    }

    public List<OnboardingStepDefinition> definitionsFor(PersonaType persona) {
        List<OnboardingStepDefinition> definitions = stepsByPersona.get(persona);
        if (definitions == null) {
            throw new IllegalArgumentException("Unsupported persona: " + persona);
        }
        return definitions;
    }

    public OnboardingStepDefinition definitionFor(PersonaType persona, String stepKey) {
        return definitionsFor(persona).stream()
                .filter(definition -> definition.key().equals(stepKey))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown onboarding step: " + stepKey));
    }

    public boolean contains(PersonaType persona, String stepKey) {
        return stepKey != null && definitionsFor(persona).stream()
                .anyMatch(definition -> definition.key().equals(stepKey));
    }

    public int positionOf(PersonaType persona, String stepKey) {
        return definitionFor(persona, stepKey).position();
    }

    public Optional<String> nextStep(PersonaType persona, String stepKey) {
        List<String> steps = stepsFor(persona);
        int index = steps.indexOf(stepKey);
        if (index < 0 || index + 1 >= steps.size()) {
            return Optional.empty();
        }
        return Optional.of(steps.get(index + 1));
    }

    private static Map<PersonaType, List<OnboardingStepDefinition>> defaultDefinitions() {
        EnumMap<PersonaType, List<OnboardingStepDefinition>> definitions =
                new EnumMap<>(PersonaType.class);
        definitions.put(
                PersonaType.MUSICIAN,
                List.of(
                        new OnboardingStepDefinition("basics", 1, true, ArtistBasicsStepRequest.class),
                        new OnboardingStepDefinition("sound", 2, true, ArtistSoundStepRequest.class),
                        new OnboardingStepDefinition("live", 3, true, ArtistLiveStepRequest.class),
                        new OnboardingStepDefinition("media", 4, false, ArtistMediaStepRequest.class),
                        new OnboardingStepDefinition("goals", 5, true, ArtistGoalsStepRequest.class)
                )
        );
        definitions.put(
                PersonaType.VENUE,
                List.of(
                        new OnboardingStepDefinition("room", 1, true, VenueRoomStepRequest.class),
                        new OnboardingStepDefinition("music", 2, true, VenueMusicStepRequest.class),
                        new OnboardingStepDefinition("stage", 3, true, VenueStageStepRequest.class),
                        new OnboardingStepDefinition("booking", 4, true, VenueBookingStepRequest.class),
                        new OnboardingStepDefinition("media", 5, false, VenueMediaStepRequest.class),
                        new OnboardingStepDefinition("goals", 6, true, VenueGoalsStepRequest.class)
                )
        );
        definitions.put(
                PersonaType.PROMOTER,
                List.of(
                        new OnboardingStepDefinition("business", 1, true, PromoterBusinessStepRequest.class),
                        new OnboardingStepDefinition("specialties", 2, true, PromoterSpecialtiesStepRequest.class),
                        new OnboardingStepDefinition("network", 3, true, PromoterNetworkStepRequest.class),
                        new OnboardingStepDefinition("media", 4, false, PromoterMediaStepRequest.class),
                        new OnboardingStepDefinition("goals", 5, true, PromoterGoalsStepRequest.class)
                )
        );
        return definitions;
    }

    private static void validate(
            PersonaType persona,
            List<OnboardingStepDefinition> definitions) {
        Set<String> keys = new LinkedHashSet<>();
        Set<Integer> positions = new LinkedHashSet<>();
        for (OnboardingStepDefinition definition : definitions) {
            if (!keys.add(definition.key())) {
                throw new IllegalArgumentException(
                        "Duplicate onboarding step key for " + persona + ": " + definition.key()
                );
            }
            if (!positions.add(definition.position())) {
                throw new IllegalArgumentException(
                        "Duplicate onboarding step position for " + persona + ": " + definition.position()
                );
            }
        }
        for (int position = 1; position <= definitions.size(); position++) {
            if (!positions.contains(position)) {
                throw new IllegalArgumentException(
                        "Onboarding step positions for " + persona + " must be contiguous"
                );
            }
        }
    }
}
