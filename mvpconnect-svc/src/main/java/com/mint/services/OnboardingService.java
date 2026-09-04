package com.mint.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.mint.dto.onboarding.shared.LocationDto;
import com.mint.dto.onboarding.venue.VenueBookingStepRequest;
import com.mint.dto.onboarding.venue.VenueGoalsStepRequest;
import com.mint.dto.onboarding.venue.VenueMediaStepRequest;
import com.mint.dto.onboarding.venue.VenueMusicStepRequest;
import com.mint.dto.onboarding.venue.VenueRoomStepRequest;
import com.mint.dto.onboarding.venue.VenueStageStepRequest;
import com.mint.dto.request.SaveOnboardingStepRequest;
import com.mint.dto.response.OnboardingCompletionResponse;
import com.mint.dto.response.OnboardingCompletionStepError;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.dto.response.OnboardingStateResponse;
import com.mint.dto.response.OnboardingStepResponse;
import com.mint.dto.response.OnboardingStepValidationDetails;
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
import com.mint.onboarding.StructuredLocationOwner;
import com.mint.onboarding.ValidatedOnboardingStep;
import com.mint.repositories.MediaAssetRepository;
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
import java.util.Objects;

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
    private final MediaAssetRepository mediaAssetRepository;
    private final OnboardingStepContractService stepContractService;
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
            MediaAssetRepository mediaAssetRepository,
            OnboardingStepContractService stepContractService,
            ObjectMapper objectMapper) {
        this.authenticatedPersonaProvider = authenticatedPersonaProvider;
        this.stepRegistry = stepRegistry;
        this.draftRepository = draftRepository;
        this.stepRepository = stepRepository;
        this.musicianRepository = musicianRepository;
        this.venueRepository = venueRepository;
        this.promoterRepository = promoterRepository;
        this.mediaAssetRepository = mediaAssetRepository;
        this.stepContractService = stepContractService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public OnboardingStateResponse getOnboarding() {
        WorkflowContext context = resolveWorkflowContext();
        if (isCompleteForCurrentVersion(context.owner())) {
            return completedState(context.identity().persona(), context.owner());
        }
        return toStateResponse(getOrCreateDraft(context));
    }

    @Transactional
    public OnboardingStepResponse saveStep(String stepKey, SaveOnboardingStepRequest request) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        validateStepKey(context.identity().persona(), stepKey);
        validatePayloadSize(request);

        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        ValidatedOnboardingStep validated = stepContractService.validate(
                context.identity().persona(),
                stepKey,
                request.data(),
                context.identity(),
                step
        );
        validateNormalizedPayloadSize(validated.dataJson());

        boolean wasResolved = step.getStatus() == OnboardingStepStatus.COMPLETE
                || step.getStatus() == OnboardingStepStatus.SKIPPED;
        LocalDateTime now = LocalDateTime.now();
        step.setDataJson(validated.dataJson());
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
    public OnboardingStateResponse completeStep(
            String stepKey,
            SaveOnboardingStepRequest request) {
        WorkflowContext context = resolveWorkflowContext();
        verifyCanWrite(context.owner());
        validateStepKey(context.identity().persona(), stepKey);
        validatePayloadSize(request);

        OnboardingDraft draft = getOrCreateDraft(context);
        OnboardingStep step = requireStep(draft, stepKey);
        ValidatedOnboardingStep validated = stepContractService.validate(
                context.identity().persona(),
                stepKey,
                request.data(),
                context.identity(),
                step
        );
        validateNormalizedPayloadSize(validated.dataJson());

        LocalDateTime now = LocalDateTime.now();
        step.setDataJson(validated.dataJson());
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
        // Reopen preserves the last valid normalized payload.
        step.setUpdatedAt(now);
        draft.setCurrentStepKey(stepKey);
        recalculateReadiness(context.identity().persona(), draft);
        draft.setUpdatedAt(now);
        stepRepository.save(step);
        draftRepository.save(draft);
        return toStateResponse(draft);
    }

    @Transactional
    public OnboardingCompletionResponse completeOnboarding() {
        WorkflowContext context = resolveWorkflowContext();
        if (isCompleteForCurrentVersion(context.owner())) {
            return completionResponse(context.identity().persona(), context.owner());
        }

        OnboardingDraft draft = findDraft(context.identity());
        if (draft == null) {
            throw OnboardingException.notReady(List.of(new OnboardingCompletionStepError(
                    "draft",
                    List.of(new OnboardingFieldError("status", "REQUIRED"))
            )));
        }

        List<OnboardingCompletionStepError> readinessErrors = readinessErrors(
                context.identity().persona(),
                draft
        );
        if (!readinessErrors.isEmpty()) {
            throw OnboardingException.notReady(readinessErrors);
        }

        Map<String, Object> validatedSteps = validateCompletedSteps(context, draft);
        String profileMediaId = promote(context, validatedSteps);

        LocalDateTime now = LocalDateTime.now();
        mediaAssetRepository.replaceCanonicalProfileMedia(
                context.identity().userId(),
                context.identity().persona().name(),
                profileMediaId
        );
        context.owner().setOnboardingStatus(PersonaOnboardingStatus.COMPLETE);
        context.owner().setOnboardingCompletedAt(now);
        context.owner().setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
        context.owner().setUpdatedAt(now);
        draft.setStatus(OnboardingDraftStatus.COMPLETED);
        draft.setUpdatedAt(now);
        saveOwner(context.owner());
        draftRepository.save(draft);
        return completionResponse(context.identity().persona(), context.owner());
    }

    private Map<String, Object> validateCompletedSteps(
            WorkflowContext context,
            OnboardingDraft draft) {
        Map<String, Object> validated = new LinkedHashMap<>();
        List<OnboardingCompletionStepError> errors = new ArrayList<>();
        for (OnboardingStepDefinition definition
                : stepRegistry.definitionsFor(context.identity().persona())) {
            OnboardingStep step = requireStep(draft, definition.key());
            if (!definition.required() && step.getStatus() == OnboardingStepStatus.SKIPPED) {
                continue;
            }
            try {
                ValidatedOnboardingStep result = stepContractService.validateStored(
                        context.identity().persona(),
                        definition.key(),
                        step.getDataJson(),
                        context.identity(),
                        step
                );
                validated.put(definition.key(), result.data());
            } catch (OnboardingException exception) {
                if (exception.getDetails() instanceof OnboardingStepValidationDetails details) {
                    errors.add(new OnboardingCompletionStepError(details.step(), details.fields()));
                } else {
                    throw exception;
                }
            }
        }
        if (!errors.isEmpty()) {
            throw OnboardingException.notReady(errors);
        }
        return validated;
    }

    private String promote(WorkflowContext context, Map<String, Object> steps) {
        return switch (context.identity().persona()) {
            case MUSICIAN -> promoteMusician((Musician) context.owner(), steps);
            case VENUE -> promoteVenue((Venue) context.owner(), steps);
            case PROMOTER -> promotePromoter((Promoter) context.owner(), steps);
        };
    }

    private String promoteMusician(Musician musician, Map<String, Object> steps) {
        ArtistBasicsStepRequest basics = requiredStep(steps, "basics", ArtistBasicsStepRequest.class);
        ArtistSoundStepRequest sound = requiredStep(steps, "sound", ArtistSoundStepRequest.class);
        ArtistLiveStepRequest live = requiredStep(steps, "live", ArtistLiveStepRequest.class);
        ArtistGoalsStepRequest goals = requiredStep(steps, "goals", ArtistGoalsStepRequest.class);
        ArtistMediaStepRequest media = optionalStep(steps, "media", ArtistMediaStepRequest.class);

        musician.setBio(basics.bio());
        applyLocation(musician, basics.location());
        musician.setGenres(codes(sound.genres()));
        musician.setVibes(codes(sound.vibes()));
        musician.setEventTypes(codes(sound.eventTypes()));
        musician.setBookingStatus(live.bookingStatus());
        musician.setTypicalDraw(live.typicalDraw());
        musician.setTravelRadiusMiles(live.travelRadiusMiles());
        musician.setTouring(live.touring());
        musician.setSetLengthMinutes(live.setLengthMinutes());
        musician.setEquipmentBrought(codes(live.equipmentBrought()));
        musician.setConnectionGoals(codes(goals.connectionGoals()));
        if (media != null) musician.setWebsiteUrl(media.websiteUrl());
        return basics.profileImage().mediaId();
    }

    private String promoteVenue(Venue venue, Map<String, Object> steps) {
        VenueRoomStepRequest room = requiredStep(steps, "room", VenueRoomStepRequest.class);
        VenueMusicStepRequest music = requiredStep(steps, "music", VenueMusicStepRequest.class);
        VenueStageStepRequest stage = requiredStep(steps, "stage", VenueStageStepRequest.class);
        VenueBookingStepRequest booking = requiredStep(steps, "booking", VenueBookingStepRequest.class);
        VenueGoalsStepRequest goals = requiredStep(steps, "goals", VenueGoalsStepRequest.class);
        VenueMediaStepRequest media = optionalStep(steps, "media", VenueMediaStepRequest.class);

        venue.setDescription(room.description());
        venue.setCapacity(room.capacity());
        applyLocation(venue, room.location());
        venue.setGenrePreferences(codes(music.genres()));
        venue.setAmbience(codes(music.ambience()));
        venue.setEventTypes(codes(music.eventTypes()));
        venue.setStageWidthFeet(stage.stageWidthFeet());
        venue.setStageDepthFeet(stage.stageDepthFeet());
        venue.setSoundEngineerAvailability(stage.soundEngineerAvailability());
        venue.setPaAvailability(stage.paAvailability());
        venue.setEquipmentAvailable(codes(stage.equipmentAvailable()));
        venue.setProductionAmenities(codes(stage.productionAmenities()));
        venue.setBookingStatus(booking.bookingStatus());
        venue.setBookingMethod(booking.bookingMethod());
        venue.setDesiredArtistDraw(booking.desiredArtistDraw());
        venue.setBookingEmail(booking.bookingEmail());
        venue.setConnectionGoals(codes(goals.connectionGoals()));
        if (media != null) venue.setWebsiteUrl(media.websiteUrl());
        return room.profileImage().mediaId();
    }

    private String promotePromoter(Promoter promoter, Map<String, Object> steps) {
        PromoterBusinessStepRequest business = requiredStep(
                steps, "business", PromoterBusinessStepRequest.class);
        PromoterSpecialtiesStepRequest specialties = requiredStep(
                steps, "specialties", PromoterSpecialtiesStepRequest.class);
        PromoterNetworkStepRequest network = requiredStep(
                steps, "network", PromoterNetworkStepRequest.class);
        PromoterGoalsStepRequest goals = requiredStep(
                steps, "goals", PromoterGoalsStepRequest.class);

        promoter.setBio(business.bio());
        promoter.setWebsiteUrl(business.websiteUrl());
        promoter.setPhone(business.phone());
        applyLocation(promoter, business.location());
        promoter.setGenreSpecialties(codes(specialties.genres()));
        promoter.setEventTypes(codes(specialties.eventTypes()));
        promoter.setVibePreferences(codes(specialties.vibes()));
        promoter.setAcceptingStatus(network.acceptingStatus());
        promoter.setRosterSizeRange(network.rosterSize());
        promoter.setConnectionGoals(codes(goals.connectionGoals()));
        return business.profileImage().mediaId();
    }

    private void applyLocation(StructuredLocationOwner owner, LocationDto location) {
        owner.setLocationDisplay(location.displayName());
        owner.setLocationAddressLine1(location.addressLine1());
        owner.setLocationAddressLine2(location.addressLine2());
        owner.setLocationCity(location.city());
        owner.setLocationState(location.state());
        owner.setLocationPostalCode(location.postalCode());
        owner.setLocationCountry(location.country());
        owner.setLocationLatitude(location.latitude());
        owner.setLocationLongitude(location.longitude());
        owner.setLocationNeighborhood(location.neighborhood());
        owner.setLocationPlaceId(location.placeId());
        // Temporary compatibility projection for existing search and UI consumers.
        owner.setLocation(location.displayName());
    }

    private List<String> codes(List<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).toList();
    }

    private <T> T requiredStep(Map<String, Object> steps, String key, Class<T> type) {
        Object value = steps.get(key);
        if (!type.isInstance(value)) throw OnboardingException.invalidData();
        return type.cast(value);
    }

    private <T> T optionalStep(Map<String, Object> steps, String key, Class<T> type) {
        Object value = steps.get(key);
        if (value == null) return null;
        if (!type.isInstance(value)) throw OnboardingException.invalidData();
        return type.cast(value);
    }

    private List<OnboardingCompletionStepError> readinessErrors(
            PersonaType persona,
            OnboardingDraft draft) {
        Map<String, OnboardingStepStatus> statuses = new LinkedHashMap<>();
        draft.getSteps().forEach(step -> statuses.put(step.getKey(), step.getStatus()));
        List<OnboardingCompletionStepError> errors = new ArrayList<>();
        for (OnboardingStepDefinition definition : stepRegistry.definitionsFor(persona)) {
            if (!isReadyStatus(definition, statuses.get(definition.key()))) {
                errors.add(new OnboardingCompletionStepError(
                        definition.key(),
                        List.of(new OnboardingFieldError("status", "REQUIRED"))
                ));
            }
        }
        return errors;
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
        OnboardingDraft existing = findDraft(context.identity());
        if (existing != null) {
            ensureInProgressMetadata(context.owner());
            return existing;
        }
        synchronized (draftInitializationMonitor) {
            existing = findDraft(context.identity());
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
        if (owner.getOnboardingDrafts() == null) owner.setOnboardingDrafts(new ArrayList<>());
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
                || owner.getOnboardingStatus() == PersonaOnboardingStatus.NOT_STARTED
                || !Objects.equals(owner.getOnboardingVersion(), OnboardingStepRegistry.CURRENT_VERSION)) {
            owner.setOnboardingStatus(PersonaOnboardingStatus.IN_PROGRESS);
            changed = true;
        }
        if (!Objects.equals(owner.getOnboardingVersion(), OnboardingStepRegistry.CURRENT_VERSION)) {
            owner.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
            changed = true;
        }
        if (changed) saveOwner(owner);
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
        if (isCompleteForCurrentVersion(owner)) throw OnboardingException.alreadyComplete();
    }

    private boolean isCompleteForCurrentVersion(OnboardingOwner owner) {
        return owner.getOnboardingStatus() == PersonaOnboardingStatus.COMPLETE
                && Objects.equals(owner.getOnboardingVersion(), OnboardingStepRegistry.CURRENT_VERSION);
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

    private void validatePayloadSize(SaveOnboardingStepRequest request) {
        if (request == null || request.data() == null) throw OnboardingException.invalidData();
        try {
            validateNormalizedPayloadSize(objectMapper.writeValueAsString(request.data()));
        } catch (JsonProcessingException exception) {
            throw OnboardingException.invalidData();
        }
    }

    private void validateNormalizedPayloadSize(String dataJson) {
        if (dataJson.getBytes(StandardCharsets.UTF_8).length > MAX_STEP_PAYLOAD_BYTES) {
            throw OnboardingException.payloadTooLarge(MAX_STEP_PAYLOAD_BYTES);
        }
    }

    private void recalculateReadiness(PersonaType persona, OnboardingDraft draft) {
        boolean ready = readinessErrors(persona, draft).isEmpty();
        draft.setStatus(ready ? OnboardingDraftStatus.READY : OnboardingDraftStatus.IN_PROGRESS);
        if (ready) draft.setCurrentStepKey(lastConfiguredStep(persona));
    }

    private boolean isReadyStatus(
            OnboardingStepDefinition definition,
            OnboardingStepStatus status) {
        if (definition.required()) return status == OnboardingStepStatus.COMPLETE;
        return status == OnboardingStepStatus.COMPLETE || status == OnboardingStepStatus.SKIPPED;
    }

    private String nextResumeStep(
            PersonaType persona,
            OnboardingDraft draft,
            String completedOrSkippedStepKey) {
        List<String> configuredSteps = stepRegistry.stepsFor(persona);
        int currentIndex = configuredSteps.indexOf(completedOrSkippedStepKey);
        for (int index = currentIndex + 1; index < configuredSteps.size(); index++) {
            String candidateKey = configuredSteps.get(index);
            if (!isResolvedForNavigation(draft, candidateKey)) return candidateKey;
        }
        for (int index = 0; index < currentIndex; index++) {
            String candidateKey = configuredSteps.get(index);
            if (!isResolvedForNavigation(draft, candidateKey)) return candidateKey;
        }
        return lastConfiguredStep(persona);
    }

    private boolean isResolvedForNavigation(OnboardingDraft draft, String stepKey) {
        OnboardingStepStatus status = requireStep(draft, stepKey).getStatus();
        return status == OnboardingStepStatus.COMPLETE || status == OnboardingStepStatus.SKIPPED;
    }

    private String lastConfiguredStep(PersonaType persona) {
        return stepRegistry.stepsFor(persona).getLast();
    }

    private OnboardingStateResponse completedState(PersonaType persona, OnboardingOwner owner) {
        return new OnboardingStateResponse(
                persona,
                OnboardingDraftStatus.COMPLETED,
                null,
                owner.getOnboardingVersion(),
                List.of()
        );
    }

    private OnboardingCompletionResponse completionResponse(
            PersonaType persona,
            OnboardingOwner owner) {
        return new OnboardingCompletionResponse(
                persona,
                OnboardingDraftStatus.COMPLETED,
                owner.getOnboardingCompletedAt(),
                owner.getOnboardingVersion()
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
        if (dataJson == null || dataJson.isBlank()) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(dataJson, new TypeReference<>() { });
        } catch (JsonProcessingException exception) {
            throw OnboardingException.invalidData();
        }
    }

    private String ownerVersionKey(AuthenticatedPersona identity) {
        return identity.persona().name() + ":" + identity.userId() + ":"
                + OnboardingStepRegistry.CURRENT_VERSION;
    }

    private record WorkflowContext(AuthenticatedPersona identity, OnboardingOwner owner) {
    }
}
