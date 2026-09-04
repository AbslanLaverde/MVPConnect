package com.mint.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mint.dto.request.SaveOnboardingStepRequest;
import com.mint.dto.response.OnboardingStateResponse;
import com.mint.dto.response.OnboardingStepResponse;
import com.mint.exceptions.OnboardingException;
import com.mint.nodes.Musician;
import com.mint.nodes.OnboardingDraft;
import com.mint.nodes.OnboardingStep;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.OnboardingDraftStatus;
import com.mint.onboarding.OnboardingOwner;
import com.mint.onboarding.OnboardingStepDefinition;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.OnboardingStepStatus;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.OnboardingDraftRepository;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OnboardingServiceTest {

    @Mock
    private AuthenticatedPersonaProvider authenticatedPersonaProvider;

    @Mock
    private OnboardingDraftRepository draftRepository;

    @Mock
    private OnboardingStepRepository stepRepository;

    @Mock
    private MusicianRepository musicianRepository;

    @Mock
    private VenueRepository venueRepository;

    @Mock
    private PromoterRepository promoterRepository;

    private OnboardingStepRegistry stepRegistry;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Musician> musicians = new HashMap<>();
    private final Map<String, Venue> venues = new HashMap<>();
    private final Map<String, Promoter> promoters = new HashMap<>();
    private final Map<String, OnboardingDraft> drafts = new HashMap<>();
    private final AtomicInteger generatedIds = new AtomicInteger();

    private AuthenticatedPersona currentIdentity;
    private OnboardingService service;

    @BeforeEach
    void setUp() {
        stepRegistry = new OnboardingStepRegistry();
        addMusician("musician-1", PersonaOnboardingStatus.NOT_STARTED);
        addVenue("venue-1", PersonaOnboardingStatus.NOT_STARTED);
        addPromoter("promoter-1", PersonaOnboardingStatus.NOT_STARTED);
        currentIdentity = new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN);

        lenient().when(authenticatedPersonaProvider.current()).thenAnswer(invocation -> currentIdentity);
        lenient().when(musicianRepository.findById(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(musicians.get(invocation.getArgument(0))));
        lenient().when(venueRepository.findById(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(venues.get(invocation.getArgument(0))));
        lenient().when(promoterRepository.findById(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(promoters.get(invocation.getArgument(0))));
        lenient().when(draftRepository.findForOwner(anyString(), anyString(), anyInt()))
                .thenAnswer(invocation -> Optional.ofNullable(drafts.get(
                        ownerVersionKey(
                                invocation.getArgument(1),
                                invocation.getArgument(0),
                                invocation.getArgument(2)
                        )
                )));
        lenient().when(draftRepository.save(any(OnboardingDraft.class)))
                .thenAnswer(invocation -> persistDraft(invocation.getArgument(0)));
        lenient().when(stepRepository.save(any(OnboardingStep.class)))
                .thenAnswer(invocation -> persistStep(invocation.getArgument(0)));
        lenient().when(musicianRepository.save(any(Musician.class)))
                .thenAnswer(invocation -> rememberOwner(invocation.getArgument(0), PersonaType.MUSICIAN));
        lenient().when(venueRepository.save(any(Venue.class)))
                .thenAnswer(invocation -> rememberOwner(invocation.getArgument(0), PersonaType.VENUE));
        lenient().when(promoterRepository.save(any(Promoter.class)))
                .thenAnswer(invocation -> rememberOwner(invocation.getArgument(0), PersonaType.PROMOTER));

        service = newService();
    }

    @Test
    void firstGetCreatesAndReturnsOneDraft() {
        OnboardingStateResponse response = service.getOnboarding();

        assertEquals(PersonaType.MUSICIAN, response.getPersona());
        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
        assertEquals("basics", response.getCurrentStep());
        assertEquals(1, response.getOnboardingVersion());
        assertEquals(5, response.getSteps().size());
        assertTrue(response.getSteps().stream().allMatch(step -> step.getData().isEmpty()));
        assertTrue(response.getSteps().stream().allMatch(OnboardingStepResponse::isRequired));
        assertEquals(1, drafts.size());
    }

    @Test
    void repeatedGetReusesTheExistingDraftAndSteps() {
        OnboardingStateResponse first = service.getOnboarding();
        OnboardingStateResponse second = service.getOnboarding();

        assertEquals(first, second);
        assertEquals(1, drafts.size());
        assertEquals(5, drafts.values().iterator().next().getSteps().size());
        verify(draftRepository, times(1)).save(any(OnboardingDraft.class));
    }

    @ParameterizedTest
    @MethodSource("personaStepRegistries")
    void createsTheConfiguredStepsForEachPersona(
            PersonaType persona,
            String ownerId,
            List<String> expectedSteps) {
        select(persona, ownerId);

        OnboardingStateResponse response = service.getOnboarding();

        assertEquals(persona, response.getPersona());
        assertEquals(expectedSteps, response.getSteps().stream().map(OnboardingStepResponse::getKey).toList());
        assertEquals(List.of(1, 2, 3, 4, 5),
                response.getSteps().stream().map(OnboardingStepResponse::getPosition).toList());
    }

    @Test
    void validStepSavePersistsStructuredJson() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("displayName", "Glass Houses");
        data.put("genres", List.of("Indie Rock", "Alternative"));

        OnboardingStepResponse response = service.saveStep("basics", request(data));

        assertEquals(OnboardingStepStatus.IN_PROGRESS, response.getStatus());
        assertEquals(data, response.getData());
        assertTrue(currentDraft().getSteps().getFirst().getDataJson().contains("Glass Houses"));
    }

    @Test
    void invalidPersonaStepIsRejectedBeforeDraftCreation() {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("booking", request(Map.of()))
        );

        assertEquals(OnboardingException.INVALID_STEP, exception.getCode());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void firstSaveMovesStepFromNotStartedToInProgress() {
        service.getOnboarding();
        assertEquals(OnboardingStepStatus.NOT_STARTED, currentDraft().getSteps().getFirst().getStatus());

        service.saveStep("basics", request(Map.of("name", "Alex")));

        assertEquals(OnboardingStepStatus.IN_PROGRESS, currentDraft().getSteps().getFirst().getStatus());
        assertEquals("basics", currentDraft().getCurrentStepKey());
    }

    @Test
    void completingStepMarksItCompleteAndAdvancesCurrentStep() {
        OnboardingStateResponse response = service.completeStep(
                "basics",
                request(Map.of("name", "Alex"))
        );

        assertEquals(OnboardingStepStatus.COMPLETE, response.getSteps().getFirst().getStatus());
        assertEquals("sound", response.getCurrentStep());
        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
    }

    @Test
    void completingAllStepsMakesDraftReadyWithoutCompletingPersona() {
        for (String stepKey : stepRegistry.stepsFor(PersonaType.MUSICIAN)) {
            service.completeStep(stepKey, request(Map.of("saved", true)));
        }

        OnboardingStateResponse response = service.getOnboarding();
        assertEquals(OnboardingDraftStatus.READY, response.getStatus());
        assertEquals("goals", response.getCurrentStep());
        assertTrue(response.getSteps().stream()
                .allMatch(step -> step.getStatus() == OnboardingStepStatus.COMPLETE));
        assertEquals(PersonaOnboardingStatus.IN_PROGRESS,
                musicians.get("musician-1").getOnboardingStatus());
    }

    @Test
    void laterStepSavesDoNotDestroyEarlierStepData() {
        service.completeStep("basics", request(Map.of("name", "Glass Houses")));
        service.saveStep("sound", request(Map.of("genres", List.of("Indie Rock"))));

        OnboardingStateResponse response = service.getOnboarding();

        assertEquals("Glass Houses", step(response, "basics").getData().get("name"));
        assertEquals(List.of("Indie Rock"), step(response, "sound").getData().get("genres"));
    }

    @Test
    void editingACompleteStepKeepsItCompleteAndKeepsResumePosition() {
        service.completeStep("basics", request(Map.of("name", "Original")));

        OnboardingStepResponse edited = service.saveStep(
                "basics",
                request(Map.of("name", "Updated"))
        );
        OnboardingStateResponse state = service.getOnboarding();

        assertEquals(OnboardingStepStatus.COMPLETE, edited.getStatus());
        assertEquals("Updated", edited.getData().get("name"));
        assertEquals("sound", state.getCurrentStep());
    }

    @Test
    void aNewServiceInstanceResumesPersistedDraftState() {
        service.completeStep("basics", request(Map.of("name", "Glass Houses")));
        service.saveStep("sound", request(Map.of("genre", "Indie Rock")));

        OnboardingService resumedService = newService();
        OnboardingStateResponse resumed = resumedService.getOnboarding();

        assertEquals("sound", resumed.getCurrentStep());
        assertEquals(OnboardingStepStatus.COMPLETE, step(resumed, "basics").getStatus());
        assertEquals("Glass Houses", step(resumed, "basics").getData().get("name"));
        assertEquals("Indie Rock", step(resumed, "sound").getData().get("genre"));
    }

    @Test
    void authenticatedUsersOnlyReceiveTheirOwnDraft() {
        service.saveStep("basics", request(Map.of("private", "first-user")));
        OnboardingDraft firstUsersDraft = currentDraft();

        addMusician("musician-2", PersonaOnboardingStatus.NOT_STARTED);
        select(PersonaType.MUSICIAN, "musician-2");
        OnboardingStateResponse secondUserState = service.getOnboarding();

        assertEquals(2, drafts.size());
        assertTrue(step(secondUserState, "basics").getData().isEmpty());
        assertNotSame(firstUsersDraft, currentDraft());
    }

    @Test
    void completedPersonaDoesNotReceiveANewDraftAndCannotWrite() {
        Musician musician = musicians.get("musician-1");
        musician.setOnboardingStatus(PersonaOnboardingStatus.COMPLETE);
        musician.setOnboardingVersion(1);

        OnboardingStateResponse response = service.getOnboarding();
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("basics", request(Map.of()))
        );

        assertEquals(OnboardingDraftStatus.COMPLETED, response.getStatus());
        assertTrue(response.getSteps().isEmpty());
        assertTrue(drafts.isEmpty());
        assertEquals(OnboardingException.ALREADY_COMPLETE, exception.getCode());
    }

    @Test
    void oversizedPayloadIsRejectedWithoutCreatingADraft() {
        String oversizedValue = "x".repeat(OnboardingService.MAX_STEP_PAYLOAD_BYTES + 1);

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("basics", request(Map.of("value", oversizedValue)))
        );

        assertEquals(OnboardingException.PAYLOAD_TOO_LARGE, exception.getCode());
        assertEquals(413, exception.getStatus().value());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void completingLastStepOutOfOrderResumesAtFirstIncompleteStep() {
        OnboardingStateResponse response = service.completeStep("goals", request(Map.of()));

        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
        assertEquals("basics", response.getCurrentStep());
        assertFalse(response.getSteps().stream()
                .filter(step -> !step.getKey().equals("goals"))
                .anyMatch(step -> step.getStatus() == OnboardingStepStatus.COMPLETE));
    }

    @Test
    void optionalStepCanBeSkippedAndIsReportedAsOptional() {
        configureMusicianMediaAsOptional();

        OnboardingStateResponse response = service.skipStep("media");
        OnboardingStepResponse media = step(response, "media");

        assertFalse(media.isRequired());
        assertEquals(OnboardingStepStatus.SKIPPED, media.getStatus());
    }

    @Test
    void requiredStepCannotBeSkipped() {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.skipStep("basics")
        );

        assertEquals(OnboardingException.STEP_NOT_SKIPPABLE, exception.getCode());
        assertEquals(409, exception.getStatus().value());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void skippingAdvancesToNextUnresolvedStep() {
        configureMusicianMediaAsOptional();

        OnboardingStateResponse response = service.skipStep("media");

        assertEquals("goals", response.getCurrentStep());
    }

    @Test
    void skippingPreservesPreviouslySavedData() {
        configureMusicianMediaAsOptional();
        service.saveStep("media", request(Map.of("imageKey", "profile/example.jpg")));

        OnboardingStateResponse response = service.skipStep("media");

        assertEquals("profile/example.jpg", step(response, "media").getData().get("imageKey"));
        assertTrue(currentDraft().getSteps().stream()
                .filter(candidate -> candidate.getKey().equals("media"))
                .findFirst()
                .orElseThrow()
                .getDataJson()
                .contains("profile/example.jpg"));
    }

    @Test
    void completeRequiredStepsAndSkippedOptionalStepProduceReadyDraft() {
        configureMusicianMediaAsOptional();

        OnboardingStateResponse response = makeMusicianReadyWithSkippedMedia();

        assertEquals(OnboardingDraftStatus.READY, response.getStatus());
        assertEquals(OnboardingStepStatus.SKIPPED, step(response, "media").getStatus());
        assertEquals(PersonaOnboardingStatus.IN_PROGRESS,
                musicians.get("musician-1").getOnboardingStatus());
    }

    @Test
    void reopeningCompleteStepMakesItInProgressAndSetsCurrentStep() {
        service.completeStep("basics", request(Map.of("name", "Glass Houses")));

        OnboardingStateResponse response = service.reopenStep("basics");

        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(response, "basics").getStatus());
        assertEquals("basics", response.getCurrentStep());
    }

    @Test
    void reopeningSkippedStepMakesItInProgress() {
        configureMusicianMediaAsOptional();
        service.skipStep("media");

        OnboardingStateResponse response = service.reopenStep("media");

        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(response, "media").getStatus());
        assertEquals("media", response.getCurrentStep());
    }

    @Test
    void reopeningPreservesLastValidPersistedData() {
        service.completeStep("sound", request(Map.of("genres", List.of("INDIE"))));

        OnboardingStateResponse response = service.reopenStep("sound");

        assertEquals(List.of("INDIE"), step(response, "sound").getData().get("genres"));
        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(response, "sound").getStatus());
    }

    @Test
    void reopeningReadyDraftReturnsItToInProgress() {
        configureMusicianMediaAsOptional();
        makeMusicianReadyWithSkippedMedia();

        OnboardingStateResponse response = service.reopenStep("basics");

        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
        assertEquals("basics", response.getCurrentStep());
        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(response, "basics").getStatus());
    }

    @Test
    void reopeningInProgressStepIsIdempotent() {
        service.saveStep("basics", request(Map.of("name", "Glass Houses")));

        OnboardingStateResponse first = service.reopenStep("basics");
        OnboardingStateResponse second = service.reopenStep("basics");

        assertEquals(first, second);
        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(second, "basics").getStatus());
        assertEquals("Glass Houses", step(second, "basics").getData().get("name"));
    }

    @Test
    void putPreservesSkippedStatusUntilStepIsExplicitlyReopened() {
        configureMusicianMediaAsOptional();
        service.skipStep("media");

        OnboardingStepResponse saved = service.saveStep(
                "media",
                request(Map.of("imageKey", "profile/new.jpg"))
        );

        assertEquals(OnboardingStepStatus.SKIPPED, saved.getStatus());
        assertEquals("profile/new.jpg", saved.getData().get("imageKey"));
    }

    @Test
    void completedPersonaCannotSkipOrReopen() {
        musicians.get("musician-1").setOnboardingStatus(PersonaOnboardingStatus.COMPLETE);

        OnboardingException skipException = assertThrows(
                OnboardingException.class,
                () -> service.skipStep("basics")
        );
        OnboardingException reopenException = assertThrows(
                OnboardingException.class,
                () -> service.reopenStep("basics")
        );

        assertEquals(OnboardingException.ALREADY_COMPLETE, skipException.getCode());
        assertEquals(OnboardingException.ALREADY_COMPLETE, reopenException.getCode());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void skipAndReopenOnlyAffectAuthenticatedUsersDraft() {
        configureMusicianMediaAsOptional();
        service.saveStep("media", request(Map.of("owner", "first")));
        service.skipStep("media");
        OnboardingDraft firstUsersDraft = currentDraft();

        addMusician("musician-2", PersonaOnboardingStatus.NOT_STARTED);
        select(PersonaType.MUSICIAN, "musician-2");
        service.skipStep("media");
        service.reopenStep("media");

        OnboardingStep firstUsersMedia = firstUsersDraft.getSteps().stream()
                .filter(candidate -> candidate.getKey().equals("media"))
                .findFirst()
                .orElseThrow();
        assertEquals(OnboardingStepStatus.SKIPPED, firstUsersMedia.getStatus());
        assertTrue(firstUsersMedia.getDataJson().contains("first"));
        assertEquals(OnboardingStepStatus.IN_PROGRESS,
                step(service.getOnboarding(), "media").getStatus());
    }

    static Stream<Arguments> personaStepRegistries() {
        return Stream.of(
                Arguments.of(
                        PersonaType.MUSICIAN,
                        "musician-1",
                        List.of("basics", "sound", "live", "media", "goals")
                ),
                Arguments.of(
                        PersonaType.VENUE,
                        "venue-1",
                        List.of("room", "music", "booking", "media", "goals")
                ),
                Arguments.of(
                        PersonaType.PROMOTER,
                        "promoter-1",
                        List.of("business", "specialties", "network", "media", "goals")
                )
        );
    }

    private OnboardingService newService() {
        return new OnboardingService(
                authenticatedPersonaProvider,
                stepRegistry,
                draftRepository,
                stepRepository,
                musicianRepository,
                venueRepository,
                promoterRepository,
                objectMapper
        );
    }

    private void configureMusicianMediaAsOptional() {
        OnboardingStepRegistry defaults = new OnboardingStepRegistry();
        EnumMap<PersonaType, List<OnboardingStepDefinition>> definitions =
                new EnumMap<>(PersonaType.class);
        for (PersonaType persona : PersonaType.values()) {
            List<OnboardingStepDefinition> personaDefinitions = defaults.definitionsFor(persona).stream()
                    .map(definition -> persona == PersonaType.MUSICIAN
                            && definition.key().equals("media")
                            ? new OnboardingStepDefinition(
                                    definition.key(),
                                    definition.position(),
                                    false
                            )
                            : definition)
                    .toList();
            definitions.put(persona, personaDefinitions);
        }
        stepRegistry = new OnboardingStepRegistry(definitions);
        service = newService();
    }

    private OnboardingStateResponse makeMusicianReadyWithSkippedMedia() {
        service.completeStep("basics", request(Map.of()));
        service.completeStep("sound", request(Map.of()));
        service.completeStep("live", request(Map.of()));
        service.skipStep("media");
        return service.completeStep("goals", request(Map.of()));
    }

    private SaveOnboardingStepRequest request(Map<String, Object> data) {
        return new SaveOnboardingStepRequest(data);
    }

    private void select(PersonaType persona, String ownerId) {
        currentIdentity = new AuthenticatedPersona(ownerId, persona);
    }

    private void addMusician(String id, PersonaOnboardingStatus status) {
        Musician musician = new Musician();
        musician.setId(id);
        musician.setOnboardingStatus(status);
        musician.setOnboardingDrafts(new ArrayList<>());
        musicians.put(id, musician);
    }

    private void addVenue(String id, PersonaOnboardingStatus status) {
        Venue venue = new Venue();
        venue.setId(id);
        venue.setOnboardingStatus(status);
        venue.setOnboardingDrafts(new ArrayList<>());
        venues.put(id, venue);
    }

    private void addPromoter(String id, PersonaOnboardingStatus status) {
        Promoter promoter = new Promoter();
        promoter.setId(id);
        promoter.setOnboardingStatus(status);
        promoter.setOnboardingDrafts(new ArrayList<>());
        promoters.put(id, promoter);
    }

    private OnboardingDraft persistDraft(OnboardingDraft draft) {
        if (draft.getId() == null) {
            draft.setId("draft-" + generatedIds.incrementAndGet());
        }
        draft.getSteps().forEach(this::persistStep);
        if (draft.getOwnerVersionKey() != null && drafts.containsKey(draft.getOwnerVersionKey())) {
            drafts.put(draft.getOwnerVersionKey(), draft);
        }
        return draft;
    }

    private OnboardingStep persistStep(OnboardingStep step) {
        if (step.getId() == null) {
            step.setId("step-" + generatedIds.incrementAndGet());
        }
        return step;
    }

    private <T extends OnboardingOwner> T rememberOwner(T owner, PersonaType persona) {
        if (owner instanceof Musician musician) {
            musicians.put(musician.getId(), musician);
        } else if (owner instanceof Venue venue) {
            venues.put(venue.getId(), venue);
        } else if (owner instanceof Promoter promoter) {
            promoters.put(promoter.getId(), promoter);
        }
        if (owner.getOnboardingDrafts() != null) {
            owner.getOnboardingDrafts().forEach(draft -> drafts.put(
                    ownerVersionKey(persona.name(), owner.getId(), draft.getOnboardingVersion()),
                    draft
            ));
        }
        return owner;
    }

    private OnboardingDraft currentDraft() {
        return drafts.get(ownerVersionKey(
                currentIdentity.persona().name(),
                currentIdentity.userId(),
                OnboardingStepRegistry.CURRENT_VERSION
        ));
    }

    private String ownerVersionKey(String persona, String ownerId, Integer version) {
        return persona + ":" + ownerId + ":" + version;
    }

    private OnboardingStepResponse step(OnboardingStateResponse state, String stepKey) {
        return state.getSteps().stream()
                .filter(candidate -> stepKey.equals(candidate.getKey()))
                .findFirst()
                .orElseThrow();
    }
}
