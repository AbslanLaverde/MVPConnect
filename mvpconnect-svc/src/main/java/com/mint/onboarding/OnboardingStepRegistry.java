package com.mint.onboarding;

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

    public static final int CURRENT_VERSION = 1;

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
                requiredSteps("basics", "sound", "live", "media", "goals")
        );
        definitions.put(
                PersonaType.VENUE,
                requiredSteps("room", "music", "booking", "media", "goals")
        );
        definitions.put(
                PersonaType.PROMOTER,
                requiredSteps("business", "specialties", "network", "media", "goals")
        );
        return definitions;
    }

    private static List<OnboardingStepDefinition> requiredSteps(String... keys) {
        return java.util.stream.IntStream.range(0, keys.length)
                .mapToObj(index -> new OnboardingStepDefinition(keys[index], index + 1, true))
                .toList();
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
