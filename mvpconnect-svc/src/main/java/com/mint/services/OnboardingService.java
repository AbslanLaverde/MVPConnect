package com.mint.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OnboardingService {

    public static final int MAX_STEP_PAYLOAD_BYTES = 128 * 1024;

    private final AuthenticatedPersonaProvider authenticatedPersonaProvider;
    private final OnboardingStepRegistry stepRegistry;
    private final OnboardingDraftRepository draftRepository;
    private final OnboardingStepRepository stepRepository;
    private final MusicianRepository musicianRepository;
    private final VenueRepository venueRepository;
    private final PromoterRepository promoterRepository;
    private final ObjectMapper objectMapper;
    private final Object draftInitializationMonitor = new Object();

    public OnboardingService(
            AuthenticatedPersonaProvider authenticatedPersonaProvider,
            OnboardingStepRegistry stepRegistry,
            OnboardingDraftRepository draftRepository,
            OnboardingStepRepository stepRepository,
            MusicianRepository musicianRepository,
            VenueRepository venueRepository,
            PromoterRepository promoterRepository,
            ObjectMapper objectMapper) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.stepRegistry = stepRegistry;
        this.draftRepository = draftRepository;
        this.stepRepository = stepRepository;
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.promoterRepository = promoterRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public OnboardingStateResponse getOnboarding() {
        WorkflowContext context = resolveWorkflowContext();
        if (isComplete(context.owner())) {
            return completedState(context.identity().persona(), context.owner());
        }

        OnboardingDraft draft = getOrCreateDraft(context);
        return toStateResponse(draft);
    }

    @Transactional
    public OnboardingStepResponse saveStep(String stepKey, SaveOnboardingStepRequest request) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        validateStepKey(context.identity().persona(), stepKey);

        String dataJson = serializeAndValidate(request);
        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        boolean wasResolved = step.getStatus() == OnboardingStepStatus.COMPLETE
                || step.getStatus() == OnboardingStepStatus.SKIPPED;
        LocalDateTime now = LocalDateTime.now();

        step.setDataJson(dataJson);
        if (!wasResolved) {
            step.setStatus(OnboardingStepStatus.IN_PROGRESS);
            draft.setCurrentStepKey(stepKey);
        }
        step.setUpdatedAt(now);
        draft.setUpdatedAt(now);

        stepRepository.save(step);
        draftRepository.save(draft);
        return toStepResponse(context.identity().persona(), step);
    }

    @Transactional
    public OnboardingStateResponse completeStep(String stepKey, SaveOnboardingStepRequest request) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        validateStepKey(context.identity().persona(), stepKey);

        String dataJson = serializeAndValidate(request);
        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        LocalDateTime now = LocalDateTime.now();

        step.setDataJson(dataJson);
        step.setStatus(OnboardingStepStatus.COMPLETE);
        step.setUpdatedAt(now);

        draft.setCurrentStepKey(nextResumeStep(context.identity().persona(), draft, stepKey));
        recalculateReadiness(context.identity().persona(), draft);
        draft.setUpdatedAt(now);

        stepRepository.save(step);
        draftRepository.save(draft);
        return toStateResponse(draft);
    }

    @Transactional
    public OnboardingStateResponse skipStep(String stepKey) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        OnboardingStepDefinition definition = requireDefinition(context.identity().persona(), stepKey);
        if (definition.required()) {
            throw OnboardingException.stepNotSkippable(stepKey);
        }

        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        LocalDateTime now = LocalDateTime.now();

        step.setStatus(OnboardingStepStatus.SKIPPED);
        step.setUpdatedAt(now);
        draft.setCurrentStepKey(nextResumeStep(context.identity().persona(), draft, stepKey));
        recalculateReadiness(context.identity().persona(), draft);
        draft.setUpdatedAt(now);

        stepRepository.save(step);
        draftRepository.save(draft);
        return toStateResponse(draft);
    }

    @Transactional
    public OnboardingStateResponse reopenStep(String stepKey) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        validateStepKey(context.identity().persona(), stepKey);

        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        LocalDateTime now = LocalDateTime.now();

        if (step.getStatus() == OnboardingStepStatus.COMPLETE
                || step.getStatus() == OnboardingStepStatus.SKIPPED) {
            step.setStatus(OnboardingStepStatus.IN_PROGRESS);
        }
        // Reopen never writes dataJson. It preserves the last valid persisted payload.
        step.setUpdatedAt(now);
        draft.setCurrentStepKey(stepKey);
        recalculateReadiness(context.identity().persona(), draft);
        draft.setUpdatedAt(now);

        stepRepository.save(step);
        draftRepository.save(draft);
        return toStateResponse(draft);
    }

    private WorkflowContext resolveWorkflowContext() {
        AuthenticatedPersona identity = authenticatedPersonaProvider.current();
        return new WorkflowContext(identity, findOwner(identity));
    }

    private OnboardingOwner findOwner(AuthenticatedPersona identity) {
        return switch (identity.persona()) {
            case MUSICIAN -> musicianRepository.findById(identity.userId())
                    .orElseThrow(() -> OnboardingException.notAvailable("Musician account not found."));
            case VENUE -> venueRepository.findById(identity.userId())
                    .orElseThrow(() -> OnboardingException.notAvailable("Venue account not found."));
            case PROMOTER -> promoterRepository.findById(identity.userId())
                    .orElseThrow(() -> OnboardingException.notAvailable("Promoter account not found."));
        };
    }

    private OnboardingDraft getOrCreateDraft(WorkflowContext context) {
        AuthenticatedPersona identity = context.identity();
        OnboardingDraft existing = findDraft(identity);
        if (existing != null) {
            ensureInProgressMetadata(context.owner());
            return existing;
        }

        // Prevent duplicate initialization inside the current application instance. A database
        // uniqueness constraint on ownerVersionKey provides the cross-instance safety boundary.
        synchronized (draftInitializationMonitor) {
            existing = findDraft(identity);
            if (existing != null) {
                ensureInProgressMetadata(context.owner());
                return existing;
            }
            return initializeDraft(context);
        }
    }

    private OnboardingDraft findDraft(AuthenticatedPersona identity) {
        return draftRepository.findForOwner(
                identity.userId(),
                identity.persona().name(),
                OnboardingStepRegistry.CURRENT_VERSION
        ).orElse(null);
    }

    private OnboardingDraft initializeDraft(WorkflowContext context) {
        LocalDateTime now = LocalDateTime.now();
        PersonaType persona = context.identity().persona();
        List<OnboardingStepDefinition> configuredSteps = stepRegistry.definitionsFor(persona);

        List<OnboardingStep> steps = new ArrayList<>();
        for (OnboardingStepDefinition definition : configuredSteps) {
            OnboardingStep step = new OnboardingStep();
            step.setKey(definition.key());
            step.setPosition(definition.position());
            step.setStatus(OnboardingStepStatus.NOT_STARTED);
            step.setSchemaVersion(OnboardingStepRegistry.CURRENT_VERSION);
            step.setCreatedAt(now);
            step.setUpdatedAt(now);
            steps.add(step);
        }

        OnboardingDraft draft = new OnboardingDraft();
        draft.setPersona(persona);
        draft.setStatus(OnboardingDraftStatus.IN_PROGRESS);
        draft.setCurrentStepKey(configuredSteps.getFirst().key());
        draft.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
        draft.setOwnerVersionKey(ownerVersionKey(context.identity()));
        draft.setCreatedAt(now);
        draft.setUpdatedAt(now);
        draft.setSteps(steps);
        draft = draftRepository.save(draft);

        OnboardingOwner owner = context.owner();
        if (owner.getOnboardingDrafts() == null) {
            owner.setOnboardingDrafts(new ArrayList<>());
        }
        if (owner.getOnboardingDrafts().stream().noneMatch(candidate ->
                ownerVersionKey(context.identity()).equals(candidate.getOwnerVersionKey()))) {
            owner.getOnboardingDrafts().add(draft);
        }
        owner.setOnboardingStatus(PersonaOnboardingStatus.IN_PROGRESS);
        owner.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
        saveOwner(owner);
        return draft;
    }

    private void ensureInProgressMetadata(OnboardingOwner owner) {
        boolean changed = false;
        if (owner.getOnboardingStatus() == null
                || owner.getOnboardingStatus() == PersonaOnboardingStatus.NOT_STARTED) {
            owner.setOnboardingStatus(PersonaOnboardingStatus.IN_PROGRESS);
            changed = true;
        }
        if (owner.getOnboardingVersion() == null) {
            owner.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
            changed = true;
        }
        if (changed) {
            saveOwner(owner);
        }
    }

    private void saveOwner(OnboardingOwner owner) {
        if (owner instanceof Musician musician) {
            musicianRepository.save(musician);
        } else if (owner instanceof Venue venue) {
            venueRepository.save(venue);
        } else if (owner instanceof Promoter promoter) {
            promoterRepository.save(promoter);
        } else {
            throw OnboardingException.notAvailable("Unsupported onboarding account type.");
        }
    }

    private void verifyCanWrite(OnboardingOwner owner) {
        if (isComplete(owner)) {
            throw OnboardingException.alreadyComplete();
        }
    }

    private boolean isComplete(OnboardingOwner owner) {
        return owner.getOnboardingStatus() == PersonaOnboardingStatus.COMPLETE;
    }

    private void validateStepKey(PersonaType persona, String stepKey) {
        if (!stepRegistry.contains(persona, stepKey)) {
            throw OnboardingException.invalidStep(stepKey, persona);
        }
    }

    private OnboardingStepDefinition requireDefinition(PersonaType persona, String stepKey) {
        validateStepKey(persona, stepKey);
        return stepRegistry.definitionFor(persona, stepKey);
    }

    private OnboardingStep requireStep(OnboardingDraft draft, String stepKey) {
        return draft.getSteps().stream()
                .filter(step -> stepKey.equals(step.getKey()))
                .findFirst()
                .orElseThrow(() -> OnboardingException.draftNotFound(stepKey));
    }

    private String serializeAndValidate(SaveOnboardingStepRequest request) {
        if (request == null || request.getData() == null) {
            throw OnboardingException.invalidData();
        }
        try {
            String dataJson = objectMapper.writeValueAsString(request.getData());
            int payloadBytes = dataJson.getBytes(StandardCharsets.UTF_8).length;
            if (payloadBytes > MAX_STEP_PAYLOAD_BYTES) {
                throw OnboardingException.payloadTooLarge(MAX_STEP_PAYLOAD_BYTES);
            }
            return dataJson;
        } catch (JsonProcessingException ex) {
            throw OnboardingException.invalidData();
        }
    }

    private void recalculateReadiness(PersonaType persona, OnboardingDraft draft) {
        Map<String, OnboardingStepStatus> statuses = new LinkedHashMap<>();
        draft.getSteps().forEach(step -> statuses.put(step.getKey(), step.getStatus()));

        boolean ready = stepRegistry.definitionsFor(persona).stream()
                .allMatch(definition -> isReadyStatus(definition, statuses.get(definition.key())));
        draft.setStatus(ready ? OnboardingDraftStatus.READY : OnboardingDraftStatus.IN_PROGRESS);
        if (ready) {
            draft.setCurrentStepKey(lastConfiguredStep(persona));
        }
    }

    private boolean isReadyStatus(
            OnboardingStepDefinition definition,
            OnboardingStepStatus status) {
        if (definition.required()) {
            return status == OnboardingStepStatus.COMPLETE;
        }
        return status == OnboardingStepStatus.COMPLETE
                || status == OnboardingStepStatus.SKIPPED;
    }

    private String nextResumeStep(
            PersonaType persona,
            OnboardingDraft draft,
            String completedOrSkippedStepKey) {
        List<String> configuredSteps = stepRegistry.stepsFor(persona);
        int currentIndex = configuredSteps.indexOf(completedOrSkippedStepKey);

        for (int index = currentIndex + 1; index < configuredSteps.size(); index++) {
            String candidateKey = configuredSteps.get(index);
            if (!isResolvedForNavigation(draft, candidateKey)) {
                return candidateKey;
            }
        }
        for (int index = 0; index < currentIndex; index++) {
            String candidateKey = configuredSteps.get(index);
            if (!isResolvedForNavigation(draft, candidateKey)) {
                return candidateKey;
            }
        }
        return lastConfiguredStep(persona);
    }

    private boolean isResolvedForNavigation(OnboardingDraft draft, String stepKey) {
        OnboardingStepStatus status = requireStep(draft, stepKey).getStatus();
        return status == OnboardingStepStatus.COMPLETE
                || status == OnboardingStepStatus.SKIPPED;
    }

    private String lastConfiguredStep(PersonaType persona) {
        List<String> steps = stepRegistry.stepsFor(persona);
        return steps.getLast();
    }

    private OnboardingStateResponse completedState(PersonaType persona, OnboardingOwner owner) {
        int version = owner.getOnboardingVersion() == null
                ? OnboardingStepRegistry.CURRENT_VERSION
                : owner.getOnboardingVersion();
        return new OnboardingStateResponse(
                persona,
                OnboardingDraftStatus.COMPLETED,
                null,
                version,
                List.of()
        );
    }

    private OnboardingStateResponse toStateResponse(OnboardingDraft draft) {
        List<OnboardingStepResponse> steps = draft.getSteps().stream()
                .sorted(Comparator.comparing(OnboardingStep::getPosition))
                .map(step -> toStepResponse(draft.getPersona(), step))
                .toList();
        return new OnboardingStateResponse(
                draft.getPersona(),
                draft.getStatus(),
                draft.getCurrentStepKey(),
                draft.getOnboardingVersion(),
                steps
        );
    }

    private OnboardingStepResponse toStepResponse(PersonaType persona, OnboardingStep step) {
        return new OnboardingStepResponse(
                step.getKey(),
                step.getPosition(),
                stepRegistry.definitionFor(persona, step.getKey()).required(),
                step.getStatus(),
                deserialize(step.getDataJson())
        );
    }

    private Map<String, Object> deserialize(String dataJson) {
        if (dataJson == null || dataJson.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(dataJson, new TypeReference<>() { });
        } catch (JsonProcessingException ex) {
            throw OnboardingException.invalidData();
        }
    }

    private String ownerVersionKey(AuthenticatedPersona identity) {
        return identity.persona().name()
                + ":"
                + identity.userId()
                + ":"
                + OnboardingStepRegistry.CURRENT_VERSION;
    }

    private record WorkflowContext(AuthenticatedPersona identity, OnboardingOwner owner) {
    }
}
