package com.mint.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mint.dto.request.SaveOnboardingStepRequest;
import com.mint.dto.response.OnboardingCompletionResponse;
import com.mint.dto.response.OnboardingCompletionValidationDetails;
import com.mint.dto.response.OnboardingStateResponse;
import com.mint.dto.response.OnboardingStepResponse;
import com.mint.exceptions.OnboardingException;
import com.mint.media.MediaStatus;
import com.mint.media.MediaType;
import com.mint.nodes.MediaAsset;
import com.mint.nodes.Musician;
import com.mint.nodes.OnboardingDraft;
import com.mint.nodes.OnboardingStep;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.onboarding.OnboardingDraftStatus;
import com.mint.onboarding.OnboardingOwner;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.OnboardingStepStatus;
import com.mint.onboarding.PersonaOnboardingStatus;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.taxonomy.ArtistBookingStatus;
import com.mint.onboarding.taxonomy.BookingMethod;
import com.mint.onboarding.taxonomy.DrawRangeCode;
import com.mint.onboarding.taxonomy.PaAvailability;
import com.mint.onboarding.taxonomy.PromoterAcceptingStatus;
import com.mint.onboarding.taxonomy.RosterSizeRange;
import com.mint.onboarding.taxonomy.SoundEngineerAvailability;
import com.mint.onboarding.taxonomy.VenueBookingStatus;
import com.mint.repositories.MediaAssetRepository;
import com.mint.repositories.ExternalArtistRepository;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.OnboardingDraftRepository;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import com.mint.security.AuthenticatedPersona;
import com.mint.security.AuthenticatedPersonaProvider;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static com.mint.support.OnboardingTestFixtures.request;
import static com.mint.support.OnboardingTestFixtures.validStep;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OnboardingServiceTest {

    @Mock private AuthenticatedPersonaProvider authenticatedPersonaProvider;
    @Mock private OnboardingDraftRepository draftRepository;
    @Mock private OnboardingStepRepository stepRepository;
    @Mock private MusicianRepository musicianRepository;
    @Mock private VenueRepository venueRepository;
    @Mock private PromoterRepository promoterRepository;
    @Mock private MediaAssetRepository mediaAssetRepository;
    @Mock private ExternalArtistRepository externalArtistRepository;
    @Mock private MediaService mediaService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final Map<String, Musician> musicians = new HashMap<>();
    private final Map<String, Venue> venues = new HashMap<>();
    private final Map<String, Promoter> promoters = new HashMap<>();
    private final Map<String, OnboardingDraft> drafts = new HashMap<>();
    private final AtomicInteger generatedIds = new AtomicInteger();

    private OnboardingStepRegistry stepRegistry;
    private AuthenticatedPersona currentIdentity;
    private OnboardingService service;

    @BeforeEach
    void setUp() {
        stepRegistry = new OnboardingStepRegistry();
        addMusician("musician-1", PersonaOnboardingStatus.NOT_STARTED);
        addVenue("venue-1", PersonaOnboardingStatus.NOT_STARTED);
        addPromoter("promoter-1", PersonaOnboardingStatus.NOT_STARTED);
        select(PersonaType.MUSICIAN, "musician-1");

        lenient().when(authenticatedPersonaProvider.current()).thenAnswer(ignored -> currentIdentity);
        lenient().when(musicianRepository.findById(anyString()))
                .thenAnswer(call -> Optional.ofNullable(musicians.get(call.getArgument(0))));
        lenient().when(venueRepository.findById(anyString()))
                .thenAnswer(call -> Optional.ofNullable(venues.get(call.getArgument(0))));
        lenient().when(promoterRepository.findById(anyString()))
                .thenAnswer(call -> Optional.ofNullable(promoters.get(call.getArgument(0))));
        lenient().when(draftRepository.findForOwner(anyString(), anyString(), anyInt()))
                .thenAnswer(call -> Optional.ofNullable(drafts.get(ownerVersionKey(
                        call.getArgument(1), call.getArgument(0), call.getArgument(2)))));
        lenient().when(draftRepository.save(any(OnboardingDraft.class)))
                .thenAnswer(call -> persistDraft(call.getArgument(0)));
        lenient().when(stepRepository.save(any(OnboardingStep.class)))
                .thenAnswer(call -> persistStep(call.getArgument(0)));
        lenient().when(stepRepository.isMediaAssociated(anyString(), anyString())).thenReturn(true);
        lenient().when(mediaService.validateOwnedReadyMedia(
                        any(AuthenticatedPersona.class), anyString(), any(MediaType.class)))
                .thenAnswer(call -> readyMedia(
                        call.getArgument(1), call.getArgument(0), call.getArgument(2)));
        lenient().when(externalArtistRepository.findExistingIds(any()))
                .thenAnswer(call -> call.getArgument(0));
        lenient().when(musicianRepository.save(any(Musician.class)))
                .thenAnswer(call -> rememberOwner(call.getArgument(0)));
        lenient().when(venueRepository.save(any(Venue.class)))
                .thenAnswer(call -> rememberOwner(call.getArgument(0)));
        lenient().when(promoterRepository.save(any(Promoter.class)))
                .thenAnswer(call -> rememberOwner(call.getArgument(0)));

        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        OnboardingStepContractService contractService = new OnboardingStepContractService(
                stepRegistry, stepRepository, mediaService, validator, objectMapper);
        ExternalArtistRelationshipService relationshipService =
                new ExternalArtistRelationshipService(externalArtistRepository);
        service = new OnboardingService(
                authenticatedPersonaProvider,
                stepRegistry,
                draftRepository,
                stepRepository,
                musicianRepository,
                venueRepository,
                promoterRepository,
                mediaAssetRepository,
                contractService,
                relationshipService,
                objectMapper
        );
    }

    @ParameterizedTest
    @MethodSource("personaSteps")
    void createsTheExactConfiguredDraftForEachPersona(
            PersonaType persona, String ownerId, List<String> expectedSteps) {
        select(persona, ownerId);

        OnboardingStateResponse response = service.getOnboarding();

        assertEquals(persona, response.getPersona());
        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
        assertEquals(expectedSteps, response.getSteps().stream().map(OnboardingStepResponse::getKey).toList());
        assertFalse(step(response, "media").isRequired());
        assertTrue(response.getSteps().stream()
                .filter(candidate -> !candidate.getKey().equals("media"))
                .allMatch(OnboardingStepResponse::isRequired));
    }

    @Test
    void savesNormalizedTypedDataAndDoesNotOverwriteItAfterValidationFailure() {
        ObjectNode basics = validStep(PersonaType.MUSICIAN, "basics");
        basics.put("bio", "  Glass Houses makes atmospheric indie rock.  ");
        ((ObjectNode) basics.get("location")).put("displayName", "  Brooklyn, NY  ");

        OnboardingStepResponse saved = service.saveStep(
                "basics", new SaveOnboardingStepRequest(basics));

        assertEquals("Glass Houses makes atmospheric indie rock.", saved.getData().get("bio"));
        @SuppressWarnings("unchecked")
        Map<String, Object> location = (Map<String, Object>) saved.getData().get("location");
        assertEquals("Brooklyn, NY", location.get("displayName"));
        String normalizedJson = currentStep("basics").getDataJson();

        ObjectNode invalid = validStep(PersonaType.MUSICIAN, "basics");
        invalid.put("unexpected", true);
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("basics", new SaveOnboardingStepRequest(invalid))
        );

        assertEquals(OnboardingException.STEP_INVALID, exception.getCode());
        assertEquals(normalizedJson, currentStep("basics").getDataJson());
    }

    @ParameterizedTest
    @MethodSource("personaOwners")
    void requiredStepsPlusSkippedOptionalMediaProduceReadyDraft(
            PersonaType persona, String ownerId) {
        OnboardingStateResponse response = makeReady(persona, ownerId);

        assertEquals(OnboardingDraftStatus.READY, response.getStatus());
        assertEquals(OnboardingStepStatus.SKIPPED, step(response, "media").getStatus());
        assertEquals(PersonaOnboardingStatus.IN_PROGRESS, owner(persona, ownerId).getOnboardingStatus());
    }

    @Test
    void finalCompletionRecalculatesReadinessInsteadOfTrustingDraftStatus() {
        service.getOnboarding();
        currentDraft().setStatus(OnboardingDraftStatus.READY);

        OnboardingException exception = assertThrows(
                OnboardingException.class, service::completeOnboarding);

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        OnboardingCompletionValidationDetails details = assertInstanceOf(
                OnboardingCompletionValidationDetails.class, exception.getDetails());
        assertEquals(List.of("basics", "sound", "live", "media", "goals"),
                details.steps().stream().map(error -> error.key()).toList());
        assertEquals(PersonaOnboardingStatus.IN_PROGRESS,
                musicians.get("musician-1").getOnboardingStatus());
        verify(mediaAssetRepository, never()).replaceCanonicalProfileMedia(
                anyString(), anyString(), anyString());
    }

    @Test
    void completesArtistByPromotingCanonicalFieldsAndRetainingLegacyFieldsAndDraft() {
        Musician musician = musicians.get("musician-1");
        musician.setMinimumFee("$500");
        musician.setWillingToTravel(false);
        musician.setProfileImageUrl("legacy-profile-url");
        makeReady(PersonaType.MUSICIAN, "musician-1");
        currentStep("basics").getMediaAssets().add(readyMedia(
                "musician-profile", currentIdentity, MediaType.PROFILE_IMAGE));

        OnboardingCompletionResponse response = service.completeOnboarding();

        assertEquals(OnboardingDraftStatus.COMPLETED, response.status());
        assertEquals(PersonaOnboardingStatus.COMPLETE, musician.getOnboardingStatus());
        assertEquals("Glass Houses makes atmospheric indie rock.", musician.getBio());
        assertEquals("Brooklyn, NY", musician.getLocation());
        assertEquals("Brooklyn", musician.getLocationCity());
        assertEquals(List.of("INDIE", "ALTERNATIVE"), musician.getGenres());
        assertEquals(List.of("ATMOSPHERIC", "DARK"), musician.getVibes());
        assertEquals(ArtistBookingStatus.ACTIVELY_BOOKING, musician.getBookingStatus());
        assertEquals(DrawRangeCode.FROM_101_TO_250, musician.getTypicalDraw());
        assertEquals(60, musician.getSetLengthMinutes());
        assertEquals("$500", musician.getMinimumFee());
        assertFalse(musician.getWillingToTravel());
        assertEquals("legacy-profile-url", musician.getProfileImageUrl());
        assertEquals(OnboardingDraftStatus.COMPLETED, currentDraft().getStatus());
        assertEquals(5, currentDraft().getSteps().size());
        assertEquals(1, currentStep("basics").getMediaAssets().size());
        verify(mediaAssetRepository).replaceCanonicalProfileMedia(
                "musician-1", "MUSICIAN", "musician-profile");
    }

    @Test
    void completesVenueByPromotingCanonicalFieldsAndPreservingLegacyData() {
        Venue venue = venues.get("venue-1");
        venue.setTypicalBudget("$1,000");
        venue.setLiveMusic(true);
        venue.setLogoUrl("legacy-logo-url");
        makeReady(PersonaType.VENUE, "venue-1");

        service.completeOnboarding();

        assertEquals(PersonaOnboardingStatus.COMPLETE, venue.getOnboardingStatus());
        assertEquals("Independent live room.", venue.getDescription());
        assertEquals(250, venue.getCapacity());
        assertEquals("123 Orchard Street", venue.getLocationAddressLine1());
        assertEquals(List.of("INDIE", "ROCK"), venue.getGenrePreferences());
        assertEquals(SoundEngineerAvailability.IN_HOUSE, venue.getSoundEngineerAvailability());
        assertEquals(PaAvailability.FULL_HOUSE_PA, venue.getPaAvailability());
        assertEquals(VenueBookingStatus.ACTIVELY_BOOKING, venue.getBookingStatus());
        assertEquals(BookingMethod.BOTH, venue.getBookingMethod());
        assertEquals("booking@marloweroom.example", venue.getBookingEmail());
        assertEquals("$1,000", venue.getTypicalBudget());
        assertTrue(venue.getLiveMusic());
        assertEquals("legacy-logo-url", venue.getLogoUrl());
        verify(mediaAssetRepository).replaceCanonicalProfileMedia(
                "venue-1", "VENUE", "venue-profile");
    }

    @Test
    void completesPromoterByPromotingCanonicalFieldsAndPreservingLegacyData() {
        Promoter promoter = promoters.get("promoter-1");
        promoter.setAcceptingNewArtists(false);
        promoter.setCurrentRosterSize(99);
        promoter.setLogoUrl("legacy-logo-url");
        makeReady(PersonaType.PROMOTER, "promoter-1");

        service.completeOnboarding();

        assertEquals(PersonaOnboardingStatus.COMPLETE, promoter.getOnboardingStatus());
        assertEquals("Independent NYC promoter.", promoter.getBio());
        assertEquals("https://promoter.example", promoter.getWebsiteUrl());
        assertEquals("+1 212 555 0100", promoter.getPhone());
        assertEquals("New York, NY", promoter.getLocation());
        assertEquals("New York", promoter.getLocationCity());
        assertEquals("US", promoter.getLocationCountry());
        assertEquals(List.of("INDIE", "ROCK"), promoter.getGenreSpecialties());
        assertEquals(List.of("ENERGETIC"), promoter.getVibePreferences());
        assertEquals(PromoterAcceptingStatus.ACTIVELY_ACCEPTING, promoter.getAcceptingStatus());
        assertEquals(RosterSizeRange.ONE_TO_FIVE, promoter.getRosterSizeRange());
        assertFalse(promoter.getAcceptingNewArtists());
        assertEquals(99, promoter.getCurrentRosterSize());
        assertEquals("legacy-logo-url", promoter.getLogoUrl());
        verify(mediaAssetRepository).replaceCanonicalProfileMedia(
                "promoter-1", "PROMOTER", "promoter-profile");
    }

    @Test
    void finalCompletionIsIdempotentAndDoesNotReplaceMediaOrTimestampAgain() {
        makeReady(PersonaType.MUSICIAN, "musician-1");

        OnboardingCompletionResponse first = service.completeOnboarding();
        LocalDateTime completedAt = musicians.get("musician-1").getOnboardingCompletedAt();
        OnboardingCompletionResponse second = service.completeOnboarding();

        assertEquals(first, second);
        assertEquals(completedAt, second.onboardingCompletedAt());
        verify(mediaAssetRepository, times(1)).replaceCanonicalProfileMedia(
                "musician-1", "MUSICIAN", "musician-profile");
    }

    @Test
    void musicianCompletionCreatesSoundsLikeOnceUsingExternalArtistId() {
        makeMusicianReadyWithReference("external-national");

        service.completeOnboarding();
        service.completeOnboarding();

        verify(externalArtistRepository, times(1))
                .linkSoundsLike("musician-1", "external-national");
        assertTrue(currentStep("sound").getDataJson().contains("external-national"));
    }

    @Test
    void missingExternalArtistStopsCompletionBeforeCanonicalMutation() {
        makeMusicianReadyWithReference("missing-artist");
        lenient().when(externalArtistRepository.findExistingIds(List.of("missing-artist")))
                .thenReturn(List.of());

        OnboardingException exception = assertThrows(
                OnboardingException.class, service::completeOnboarding);

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        assertNull(musicians.get("musician-1").getBio());
        assertNull(musicians.get("musician-1").getOnboardingCompletedAt());
        verify(mediaAssetRepository, never()).replaceCanonicalProfileMedia(
                anyString(), anyString(), anyString());
        verify(externalArtistRepository, never())
                .linkSoundsLike(anyString(), anyString());
    }

    @Test
    void invalidStoredStepStopsCompletionBeforeCanonicalMutation() {
        makeReady(PersonaType.MUSICIAN, "musician-1");
        currentStep("basics").setDataJson("{\"unexpected\":true}");

        OnboardingException exception = assertThrows(
                OnboardingException.class, service::completeOnboarding);

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        assertInstanceOf(OnboardingCompletionValidationDetails.class, exception.getDetails());
        assertEquals(PersonaOnboardingStatus.IN_PROGRESS,
                musicians.get("musician-1").getOnboardingStatus());
        assertNull(musicians.get("musician-1").getOnboardingCompletedAt());
        verify(mediaAssetRepository, never()).replaceCanonicalProfileMedia(
                anyString(), anyString(), anyString());
    }

    @Test
    void deferredRelationshipShapedDataRemainsInTheCompletedDraft() {
        makeReady(PersonaType.MUSICIAN, "musician-1");
        String soundJson = currentStep("sound").getDataJson();

        service.completeOnboarding();

        assertTrue(soundJson.contains("soundsLikeArtists"));
        assertEquals(soundJson, currentStep("sound").getDataJson());
        assertTrue(currentStep("live").getDataJson().contains("venuesPlayed"));
    }

    @Test
    void venueRelationshipsAndOptionalMediaRemainInTheCompletedDraft() {
        select(PersonaType.VENUE, "venue-1");
        service.getOnboarding();
        for (String stepKey : stepRegistry.stepsFor(PersonaType.VENUE)) {
            ObjectNode data = validStep(PersonaType.VENUE, stepKey);
            if (stepKey.equals("music")) {
                data.set("artistsBooked", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("entityType", "ARTIST")
                                .put("entityId", "external-venue-artist")
                                .put("displayName", "Glass Houses")
                                .put("external", true)));
            }
            if (stepKey.equals("media")) {
                data.set("bannerImage", objectMapper.createObjectNode().put("mediaId", "venue-banner"));
                data.set("galleryImages", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode().put("mediaId", "venue-gallery")));
            }
            service.completeStep(stepKey, new SaveOnboardingStepRequest(data));
        }

        service.completeOnboarding();

        assertTrue(currentStep("music").getDataJson().contains("Glass Houses"));
        assertTrue(currentStep("media").getDataJson().contains("venue-banner"));
        assertTrue(currentStep("media").getDataJson().contains("venue-gallery"));
        verify(mediaAssetRepository, times(1)).replaceCanonicalProfileMedia(
                "venue-1", "VENUE", "venue-profile");
        verify(externalArtistRepository).linkHasBooked("venue-1", "external-venue-artist");
    }

    @Test
    void promoterRelationshipShapedNetworkDataRemainsInTheCompletedDraft() {
        select(PersonaType.PROMOTER, "promoter-1");
        service.getOnboarding();
        for (String stepKey : stepRegistry.stepsFor(PersonaType.PROMOTER)) {
            if (stepKey.equals("media")) {
                service.skipStep(stepKey);
                continue;
            }
            ObjectNode data = validStep(PersonaType.PROMOTER, stepKey);
            if (stepKey.equals("specialties")) {
                data.set("artistsWorkedWith", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("entityType", "ARTIST")
                                .put("entityId", "external-promoter-artist")
                                .put("displayName", "Glass Houses")
                                .put("external", true)));
            }
            if (stepKey.equals("network")) {
                data.set("artists", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("entityType", "ARTIST")
                                .put("displayName", "Glass Houses")));
                data.set("venues", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("entityType", "VENUE")
                                .put("displayName", "The Marlowe Room")));
                data.set("additionalMarkets", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("displayName", "Philadelphia, PA")
                                .put("city", "Philadelphia")
                                .put("state", "PA")
                                .put("country", "US")));
                data.set("pastShows", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("mediaId", "promoter-show")
                                .put("date", "2026-08-01")));
            }
            service.completeStep(stepKey, new SaveOnboardingStepRequest(data));
        }

        service.completeOnboarding();

        assertTrue(currentStep("specialties").getDataJson().contains("artistsWorkedWith"));
        assertTrue(currentStep("network").getDataJson().contains("Glass Houses"));
        assertTrue(currentStep("network").getDataJson().contains("The Marlowe Room"));
        assertTrue(currentStep("network").getDataJson().contains("Philadelphia"));
        assertTrue(currentStep("network").getDataJson().contains("promoter-show"));
        verify(externalArtistRepository)
                .linkHasWorkedWith("promoter-1", "external-promoter-artist");
    }

    @Test
    void completedOptionalMediaPromotesWebsiteButOnlyProfileImageBecomesCanonical() {
        service.getOnboarding();
        for (String stepKey : stepRegistry.stepsFor(PersonaType.MUSICIAN)) {
            if (stepKey.equals("media")) {
                ObjectNode media = validStep(PersonaType.MUSICIAN, "media");
                media.put("websiteUrl", "  https://glasshouses.example  ");
                media.set("bannerImage", objectMapper.createObjectNode().put("mediaId", "artist-banner"));
                service.completeStep(stepKey, new SaveOnboardingStepRequest(media));
            } else {
                service.completeStep(stepKey, request(PersonaType.MUSICIAN, stepKey));
            }
        }

        service.completeOnboarding();

        assertEquals("https://glasshouses.example", musicians.get("musician-1").getWebsiteUrl());
        assertTrue(currentStep("media").getDataJson().contains("artist-banner"));
        verify(mediaAssetRepository, times(1)).replaceCanonicalProfileMedia(
                "musician-1", "MUSICIAN", "musician-profile");
    }

    @Test
    void reopeningPreservesTheLastValidNormalizedData() {
        service.completeStep("sound", request(PersonaType.MUSICIAN, "sound"));
        String persisted = currentStep("sound").getDataJson();

        OnboardingStateResponse response = service.reopenStep("sound");

        assertEquals(OnboardingStepStatus.IN_PROGRESS, step(response, "sound").getStatus());
        assertEquals("sound", response.getCurrentStep());
        assertEquals(persisted, currentStep("sound").getDataJson());
    }

    @Test
    void completedPersonaReturnsCompletedStateAndCannotEditSteps() {
        Musician musician = musicians.get("musician-1");
        musician.setOnboardingStatus(PersonaOnboardingStatus.COMPLETE);
        musician.setOnboardingVersion(OnboardingStepRegistry.CURRENT_VERSION);
        musician.setOnboardingCompletedAt(LocalDateTime.now());

        OnboardingStateResponse state = service.getOnboarding();
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("basics", request(PersonaType.MUSICIAN, "basics"))
        );

        assertEquals(OnboardingDraftStatus.COMPLETED, state.getStatus());
        assertTrue(state.getSteps().isEmpty());
        assertEquals(OnboardingException.ALREADY_COMPLETE, exception.getCode());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void oversizedPayloadIsRejectedBeforeDraftCreation() {
        ObjectNode data = objectMapper.createObjectNode();
        data.put("bio", "x".repeat(OnboardingService.MAX_STEP_PAYLOAD_BYTES + 1));

        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> service.saveStep("basics", new SaveOnboardingStepRequest(data))
        );

        assertEquals(OnboardingException.PAYLOAD_TOO_LARGE, exception.getCode());
        assertTrue(drafts.isEmpty());
    }

    @Test
    void finalCompletionWithoutADraftReturnsStructuredNotReadyError() {
        OnboardingException exception = assertThrows(
                OnboardingException.class, service::completeOnboarding);

        assertEquals(OnboardingException.NOT_READY, exception.getCode());
        OnboardingCompletionValidationDetails details = assertInstanceOf(
                OnboardingCompletionValidationDetails.class, exception.getDetails());
        assertEquals("draft", details.steps().getFirst().key());
    }

    static Stream<Arguments> personaSteps() {
        return Stream.of(
                Arguments.of(PersonaType.MUSICIAN, "musician-1",
                        List.of("basics", "sound", "live", "media", "goals")),
                Arguments.of(PersonaType.VENUE, "venue-1",
                        List.of("room", "music", "stage", "booking", "media", "goals")),
                Arguments.of(PersonaType.PROMOTER, "promoter-1",
                        List.of("business", "specialties", "network", "media", "goals"))
        );
    }

    static Stream<Arguments> personaOwners() {
        return Stream.of(
                Arguments.of(PersonaType.MUSICIAN, "musician-1"),
                Arguments.of(PersonaType.VENUE, "venue-1"),
                Arguments.of(PersonaType.PROMOTER, "promoter-1")
        );
    }

    private OnboardingStateResponse makeReady(PersonaType persona, String ownerId) {
        select(persona, ownerId);
        OnboardingStateResponse response = service.getOnboarding();
        for (String stepKey : stepRegistry.stepsFor(persona)) {
            if (stepKey.equals("media")) continue;
            response = service.completeStep(stepKey, request(persona, stepKey));
        }
        assertEquals(OnboardingDraftStatus.IN_PROGRESS, response.getStatus());
        return service.skipStep("media");
    }

    private void makeMusicianReadyWithReference(String externalArtistId) {
        select(PersonaType.MUSICIAN, "musician-1");
        service.getOnboarding();
        for (String stepKey : stepRegistry.stepsFor(PersonaType.MUSICIAN)) {
            if (stepKey.equals("media")) continue;
            ObjectNode data = validStep(PersonaType.MUSICIAN, stepKey);
            if (stepKey.equals("sound")) {
                data.set("soundsLikeArtists", objectMapper.createArrayNode().add(
                        objectMapper.createObjectNode()
                                .put("entityType", "ARTIST")
                                .put("entityId", externalArtistId)
                                .put("displayName", "The National")
                                .put("external", true)));
            }
            service.completeStep(stepKey, new SaveOnboardingStepRequest(data));
        }
        service.skipStep("media");
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

    private MediaAsset readyMedia(String mediaId, AuthenticatedPersona owner, MediaType mediaType) {
        MediaAsset media = new MediaAsset();
        media.setId(mediaId);
        media.setOwnerId(owner.userId());
        media.setOwnerPersona(owner.persona());
        media.setMediaType(mediaType);
        media.setStatus(MediaStatus.READY);
        return media;
    }

    private OnboardingDraft persistDraft(OnboardingDraft draft) {
        if (draft.getId() == null) draft.setId("draft-" + generatedIds.incrementAndGet());
        draft.getSteps().forEach(this::persistStep);
        if (draft.getOwnerVersionKey() != null && drafts.containsKey(draft.getOwnerVersionKey())) {
            drafts.put(draft.getOwnerVersionKey(), draft);
        }
        return draft;
    }

    private OnboardingStep persistStep(OnboardingStep step) {
        if (step.getId() == null) step.setId("step-" + generatedIds.incrementAndGet());
        return step;
    }

    private <T extends OnboardingOwner> T rememberOwner(T owner) {
        if (owner instanceof Musician musician) musicians.put(musician.getId(), musician);
        if (owner instanceof Venue venue) venues.put(venue.getId(), venue);
        if (owner instanceof Promoter promoter) promoters.put(promoter.getId(), promoter);
        if (owner.getOnboardingDrafts() != null) {
            owner.getOnboardingDrafts().forEach(draft -> drafts.put(
                    ownerVersionKey(draft.getPersona().name(), owner.getId(), draft.getOnboardingVersion()),
                    draft
            ));
        }
        return owner;
    }

    private OnboardingOwner owner(PersonaType persona, String ownerId) {
        return switch (persona) {
            case MUSICIAN -> musicians.get(ownerId);
            case VENUE -> venues.get(ownerId);
            case PROMOTER -> promoters.get(ownerId);
        };
    }

    private OnboardingDraft currentDraft() {
        OnboardingDraft draft = drafts.get(ownerVersionKey(
                currentIdentity.persona().name(), currentIdentity.userId(),
                OnboardingStepRegistry.CURRENT_VERSION));
        assertNotNull(draft);
        return draft;
    }

    private OnboardingStep currentStep(String stepKey) {
        return currentDraft().getSteps().stream()
                .filter(candidate -> candidate.getKey().equals(stepKey))
                .findFirst()
                .orElseThrow();
    }

    private String ownerVersionKey(String persona, String ownerId, Integer version) {
        return persona + ":" + ownerId + ":" + version;
    }

    private OnboardingStepResponse step(OnboardingStateResponse state, String stepKey) {
        return state.getSteps().stream()
                .filter(candidate -> candidate.getKey().equals(stepKey))
                .findFirst()
                .orElseThrow();
    }
}
