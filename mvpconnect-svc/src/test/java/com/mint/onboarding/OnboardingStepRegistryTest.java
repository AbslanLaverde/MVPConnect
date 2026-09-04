package com.mint.onboarding;

import com.mint.dto.onboarding.artist.ArtistSoundStepRequest;
import com.mint.dto.onboarding.promoter.PromoterNetworkStepRequest;
import com.mint.dto.onboarding.venue.VenueStageStepRequest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OnboardingStepRegistryTest {

    private final OnboardingStepRegistry registry = new OnboardingStepRegistry();

    @Test
    void exposesFinalizedPassOneMusicianSteps() {
        assertDefinitions(
                PersonaType.MUSICIAN,
                List.of("basics", "sound", "live", "media", "goals"),
                List.of(true, true, true, false, true)
        );
    }

    @Test
    void exposesFinalizedPassOneVenueStepsIncludingStage() {
        assertDefinitions(
                PersonaType.VENUE,
                List.of("room", "music", "stage", "booking", "media", "goals"),
                List.of(true, true, true, true, false, true)
        );
    }

    @Test
    void exposesFinalizedPassOnePromoterSteps() {
        assertDefinitions(
                PersonaType.PROMOTER,
                List.of("business", "specialties", "network", "media", "goals"),
                List.of(true, true, true, false, true)
        );
    }

    @Test
    void resolvesRepresentativePersonaStepsToTheirTypedContracts() {
        assertEquals(ArtistSoundStepRequest.class,
                registry.definitionFor(PersonaType.MUSICIAN, "sound").requestType());
        assertEquals(VenueStageStepRequest.class,
                registry.definitionFor(PersonaType.VENUE, "stage").requestType());
        assertEquals(PromoterNetworkStepRequest.class,
                registry.definitionFor(PersonaType.PROMOTER, "network").requestType());
    }

    private void assertDefinitions(
            PersonaType persona,
            List<String> expectedKeys,
            List<Boolean> expectedRequiredFlags) {
        List<OnboardingStepDefinition> definitions = registry.definitionsFor(persona);

        assertEquals(expectedKeys, definitions.stream().map(OnboardingStepDefinition::key).toList());
        assertEquals(expectedRequiredFlags,
                definitions.stream().map(OnboardingStepDefinition::required).toList());
        assertEquals(
                java.util.stream.IntStream.rangeClosed(1, definitions.size()).boxed().toList(),
                definitions.stream().map(OnboardingStepDefinition::position).toList()
        );
    }
}
