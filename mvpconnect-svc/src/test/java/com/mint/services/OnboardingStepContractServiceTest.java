package com.mint.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mint.dto.onboarding.artist.ArtistMediaStepRequest;
import com.mint.dto.onboarding.artist.ArtistSoundStepRequest;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.dto.response.OnboardingStepValidationDetails;
import com.mint.exceptions.MediaException;
import com.mint.exceptions.OnboardingException;
import com.mint.media.MediaType;
import com.mint.nodes.MediaAsset;
import com.mint.nodes.OnboardingStep;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.ValidatedOnboardingStep;
import com.mint.onboarding.taxonomy.EventTypeCode;
import com.mint.onboarding.taxonomy.GenreCode;
import com.mint.onboarding.taxonomy.VibeCode;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.security.AuthenticatedPersona;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static com.mint.support.OnboardingTestFixtures.validStep;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OnboardingStepContractServiceTest {

    @Mock
    private OnboardingStepRepository stepRepository;

    @Mock
    private MediaService mediaService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final AuthenticatedPersona owner =
            new AuthenticatedPersona("musician-1", PersonaType.MUSICIAN);
    private OnboardingStepContractService service;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        service = new OnboardingStepContractService(
                new OnboardingStepRegistry(),
                stepRepository,
                mediaService,
                validator,
                objectMapper
        );
        lenient().when(mediaService.validateOwnedReadyMedia(
                        any(AuthenticatedPersona.class), anyString(), any(MediaType.class)))
                .thenAnswer(invocation -> {
                    MediaAsset asset = new MediaAsset();
                    asset.setId(invocation.getArgument(1));
                    asset.setMediaType(invocation.getArgument(2));
                    return asset;
                });
        lenient().when(stepRepository.isMediaAssociated(anyString(), anyString())).thenReturn(true);
    }

    @Test
    void unknownFieldIsRejectedWithoutBeingPersisted() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.put("randomField", "whatever");

        assertField(PersonaType.MUSICIAN, "sound", data, "randomField", "INVALID");
    }

    @Test
    void invalidEnumIsRejectedWithAFieldError() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.withArray("genres").removeAll().add("NOT_A_GENRE");

        assertField(PersonaType.MUSICIAN, "sound", data, "genres[0]", "INVALID");
    }

    @Test
    void approvedNewTaxonomyValuesAreAccepted() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("genres", enumArray("HARDCORE"));
        data.set("vibes", enumArray("RELAXED"));
        data.set("eventTypes", enumArray("COMMUNITY_EVENT"));

        ValidatedOnboardingStep result = validate(PersonaType.MUSICIAN, "sound", data);
        ArtistSoundStepRequest typed = assertInstanceOf(ArtistSoundStepRequest.class, result.data());

        assertEquals(List.of(GenreCode.HARDCORE), typed.genres());
        assertEquals(List.of(VibeCode.RELAXED), typed.vibes());
        assertEquals(List.of(EventTypeCode.COMMUNITY_EVENT), typed.eventTypes());
    }

    @Test
    void removedWorldGenreIsRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("genres", enumArray("WORLD"));

        assertField(PersonaType.MUSICIAN, "sound", data, "genres[0]", "INVALID");
    }

    @Test
    void removedOrganicVibeIsRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("vibes", enumArray("ORGANIC"));

        assertField(PersonaType.MUSICIAN, "sound", data, "vibes[0]", "INVALID");
    }

    @Test
    void removedSophisticatedVibeIsRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("vibes", enumArray("SOPHISTICATED"));

        assertField(PersonaType.MUSICIAN, "sound", data, "vibes[0]", "INVALID");
    }

    @Test
    void removedCorporateEventIsRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("eventTypes", enumArray("CORPORATE_EVENT"));

        assertField(PersonaType.MUSICIAN, "sound", data, "eventTypes[0]", "INVALID");
    }

    @Test
    void taxonomyListsRejectNullElementsWithIndexedErrors() {
        ObjectNode nullGenre = validStep(PersonaType.MUSICIAN, "sound");
        nullGenre.withArray("genres").addNull();
        assertField(PersonaType.MUSICIAN, "sound", nullGenre, "genres[2]", "REQUIRED");

        ObjectNode nullVibe = validStep(PersonaType.MUSICIAN, "sound");
        nullVibe.withArray("vibes").addNull();
        assertField(PersonaType.MUSICIAN, "sound", nullVibe, "vibes[2]", "REQUIRED");

        ObjectNode nullEvent = validStep(PersonaType.MUSICIAN, "sound");
        nullEvent.withArray("eventTypes").addNull();
        assertField(PersonaType.MUSICIAN, "sound", nullEvent, "eventTypes[1]", "REQUIRED");
    }

    @Test
    void artistReferenceListsRejectNullElementsWithIndexedErrors() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.withArray("soundsLikeArtists").addNull();

        assertField(PersonaType.MUSICIAN, "sound", data,
                "soundsLikeArtists[1]", "REQUIRED");
    }

    @Test
    void wrongPersonaStepContractIsRejected() {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> validate(PersonaType.MUSICIAN, "booking",
                        validStep(PersonaType.VENUE, "booking"))
        );

        assertEquals(OnboardingException.INVALID_STEP, exception.getCode());
    }

    @Test
    void stringsAndOptionalListsAreNormalizedBeforeSerialization() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "media");
        data.put("websiteUrl", "   ");

        ValidatedOnboardingStep result = validate(PersonaType.MUSICIAN, "media", data);
        ArtistMediaStepRequest typed = assertInstanceOf(ArtistMediaStepRequest.class, result.data());

        assertNull(typed.websiteUrl());
        assertTrue(result.dataJson().contains("\"websiteUrl\":null"));
    }

    @Test
    void nestedStringsAreTrimmedAndNormalizedDtoIsSerialized() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "basics");
        data.put("bio", "  A clear bio.  ");
        ((ObjectNode) data.get("location")).put("displayName", "  Brooklyn, NY  ");

        ValidatedOnboardingStep result = validate(PersonaType.MUSICIAN, "basics", data);

        assertTrue(result.dataJson().contains("\"bio\":\"A clear bio.\""));
        assertTrue(result.dataJson().contains("\"displayName\":\"Brooklyn, NY\""));
        assertFalse(result.dataJson().contains("  A clear bio."));
    }

    @Test
    void duplicateTaxonomyValuesAreRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.withArray("genres").removeAll().add("INDIE").add("INDIE");

        assertField(PersonaType.MUSICIAN, "sound", data, "genres", "DUPLICATE");
    }

    @Test
    void unresolvedArtistReferencesUseNormalizedDisplayNameForDuplicates() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        ArrayNode references = data.putArray("soundsLikeArtists");
        references.add(artistReference(null, "The National", true));
        references.add(artistReference(null, " THE   NATIONAL ", true));

        assertField(PersonaType.MUSICIAN, "sound", data,
                "soundsLikeArtists", "DUPLICATE");
    }

    @Test
    void resolvedArtistReferencesUseEntityIdForDuplicates() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        ArrayNode references = data.putArray("soundsLikeArtists");
        references.add(artistReference("artist-123", "First Display Name", false));
        references.add(artistReference("artist-123", "Updated Display Name", false));

        assertField(PersonaType.MUSICIAN, "sound", data,
                "soundsLikeArtists", "DUPLICATE");
    }

    @Test
    void differentArtistReferencesRemainValidAndKeepTheirInputOrder() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        ArrayNode references = data.putArray("soundsLikeArtists");
        references.add(artistReference(null, "The National", true));
        references.add(artistReference(null, "Japanese Breakfast", true));

        ValidatedOnboardingStep result = validate(PersonaType.MUSICIAN, "sound", data);
        ArtistSoundStepRequest typed = assertInstanceOf(ArtistSoundStepRequest.class, result.data());

        assertEquals("The National", typed.soundsLikeArtists().get(0).displayName());
        assertEquals("Japanese Breakfast", typed.soundsLikeArtists().get(1).displayName());
    }

    @Test
    void stepTwoSelectionMaximumsRemainUnchanged() {
        ObjectNode artist = validStep(PersonaType.MUSICIAN, "sound");
        artist.set("vibes", enumArray("ATMOSPHERIC", "DARK", "DREAMY", "ENERGETIC"));
        assertField(PersonaType.MUSICIAN, "sound", artist, "vibes", "TOO_MANY");

        ObjectNode venue = validStep(PersonaType.VENUE, "music");
        venue.set("eventTypes", enumArray(
                "CLUB_NIGHT", "COMMUNITY_EVENT", "CONCERT", "DJ_NIGHT", "FESTIVAL", "HOUSE_SHOW"));
        assertField(PersonaType.VENUE, "music", venue, "eventTypes", "TOO_MANY");

        ObjectNode promoter = validStep(PersonaType.PROMOTER, "specialties");
        ArrayNode references = promoter.putArray("artistsWorkedWith");
        for (int index = 1; index <= 6; index++) {
            references.add(artistReference(null, "Artist " + index, true));
        }
        assertField(PersonaType.PROMOTER, "specialties", promoter,
                "artistsWorkedWith", "TOO_MANY");
    }

    @Test
    void artistBasicsRequiresProfileImage() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "basics");
        data.remove("profileImage");

        assertField(PersonaType.MUSICIAN, "basics", data, "profileImage", "REQUIRED");
    }

    @Test
    void artistBasicsRejectsNonReadyImage() {
        when(mediaService.validateOwnedReadyMedia(owner, "musician-profile", MediaType.PROFILE_IMAGE))
                .thenThrow(MediaException.notReady());

        assertField(PersonaType.MUSICIAN, "basics",
                validStep(PersonaType.MUSICIAN, "basics"),
                "profileImage.mediaId", "MEDIA_NOT_READY");
    }

    @Test
    void artistBasicsRejectsAnotherUsersImage() {
        when(mediaService.validateOwnedReadyMedia(owner, "musician-profile", MediaType.PROFILE_IMAGE))
                .thenThrow(MediaException.notOwned());

        assertField(PersonaType.MUSICIAN, "basics",
                validStep(PersonaType.MUSICIAN, "basics"),
                "profileImage.mediaId", "MEDIA_NOT_OWNED");
    }

    @Test
    void artistBasicsRejectsUnassociatedImage() {
        when(stepRepository.isMediaAssociated("step-basics", "musician-profile"))
                .thenReturn(false);

        assertField(PersonaType.MUSICIAN, "basics",
                validStep(PersonaType.MUSICIAN, "basics"),
                "profileImage.mediaId", "MEDIA_NOT_ASSOCIATED");
    }

    @Test
    void artistBasicsAcceptsAssociatedOwnedReadyProfileImage() {
        validate(PersonaType.MUSICIAN, "basics", validStep(PersonaType.MUSICIAN, "basics"));

        verify(mediaService).validateOwnedReadyMedia(
                owner, "musician-profile", MediaType.PROFILE_IMAGE);
        verify(stepRepository).isMediaAssociated("step-basics", "musician-profile");
    }

    @Test
    void artistSoundRequiresGenresAndVibes() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.remove("genres");
        data.remove("vibes");

        assertFields(PersonaType.MUSICIAN, "sound", data,
                new OnboardingFieldError("genres", "REQUIRED"),
                new OnboardingFieldError("vibes", "REQUIRED"));
    }

    @Test
    void artistSoundEnforcesGenreMaximum() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        data.set("genres", enumArray("INDIE", "ROCK", "POP", "PUNK", "FOLK", "BLUES"));

        assertField(PersonaType.MUSICIAN, "sound", data, "genres", "TOO_MANY");
    }

    @Test
    void artistLiveRequiresBookingDrawAndTravelConfiguration() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "live");
        data.remove("bookingStatus");
        data.remove("typicalDraw");
        data.remove("touring");

        assertFields(PersonaType.MUSICIAN, "live", data,
                new OnboardingFieldError("bookingStatus", "REQUIRED"),
                new OnboardingFieldError("typicalDraw", "REQUIRED"),
                new OnboardingFieldError("travelRadiusMiles", "REQUIRED"));
    }

    @Test
    void artistLiveRestrictsSetLength() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "live");
        data.put("setLengthMinutes", 75);

        assertField(PersonaType.MUSICIAN, "live", data, "setLengthMinutes", "INVALID");
    }

    @Test
    void artistGoalsRequireAtLeastOneGoal() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "goals");
        data.withArray("connectionGoals").removeAll();

        assertField(PersonaType.MUSICIAN, "goals", data, "connectionGoals", "REQUIRED");
    }

    @Test
    void venueRoomRequiresProfileAddressAndPositiveCapacity() {
        ObjectNode data = validStep(PersonaType.VENUE, "room");
        data.remove("profileImage");
        ((ObjectNode) data.get("location")).remove("addressLine1");
        data.put("capacity", 0);

        assertFields(PersonaType.VENUE, "room", data,
                new OnboardingFieldError("profileImage", "REQUIRED"),
                new OnboardingFieldError("location.addressLine1", "REQUIRED"),
                new OnboardingFieldError("capacity", "INVALID"));
    }

    @Test
    void venueMusicRequiresGenresAndAmbience() {
        ObjectNode data = validStep(PersonaType.VENUE, "music");
        data.withArray("genres").removeAll();
        data.withArray("ambience").removeAll();

        assertFields(PersonaType.VENUE, "music", data,
                new OnboardingFieldError("genres", "REQUIRED"),
                new OnboardingFieldError("ambience", "REQUIRED"));
    }

    @Test
    void venueStageRequiresEngineerAndPaStatuses() {
        ObjectNode data = validStep(PersonaType.VENUE, "stage");
        data.remove("soundEngineerAvailability");
        data.remove("paAvailability");

        assertFields(PersonaType.VENUE, "stage", data,
                new OnboardingFieldError("soundEngineerAvailability", "REQUIRED"),
                new OnboardingFieldError("paAvailability", "REQUIRED"));
    }

    @Test
    void venueBookingRequiresStatusAndMethodAndValidEmail() {
        ObjectNode data = validStep(PersonaType.VENUE, "booking");
        data.remove("bookingStatus");
        data.remove("bookingMethod");
        data.put("bookingEmail", "not-an-email");

        assertFields(PersonaType.VENUE, "booking", data,
                new OnboardingFieldError("bookingStatus", "REQUIRED"),
                new OnboardingFieldError("bookingMethod", "REQUIRED"),
                new OnboardingFieldError("bookingEmail", "INVALID_FORMAT"));
    }

    @Test
    void venueGoalsRequireAtLeastOneGoal() {
        ObjectNode data = validStep(PersonaType.VENUE, "goals");
        data.withArray("connectionGoals").removeAll();

        assertField(PersonaType.VENUE, "goals", data, "connectionGoals", "REQUIRED");
    }

    @Test
    void promoterBusinessRequiresProfileImageAndLocation() {
        ObjectNode data = validStep(PersonaType.PROMOTER, "business");
        data.remove("profileImage");
        data.remove("location");

        assertFields(PersonaType.PROMOTER, "business", data,
                new OnboardingFieldError("profileImage", "REQUIRED"),
                new OnboardingFieldError("location", "REQUIRED"));
    }

    @Test
    void promoterSpecialtiesRequireGenresAndEventTypes() {
        ObjectNode data = validStep(PersonaType.PROMOTER, "specialties");
        data.withArray("genres").removeAll();
        data.withArray("eventTypes").removeAll();

        assertFields(PersonaType.PROMOTER, "specialties", data,
                new OnboardingFieldError("genres", "REQUIRED"),
                new OnboardingFieldError("eventTypes", "REQUIRED"));
    }

    @Test
    void promoterNetworkRequiresAcceptingStatus() {
        ObjectNode data = validStep(PersonaType.PROMOTER, "network");
        data.remove("acceptingStatus");

        assertField(PersonaType.PROMOTER, "network", data, "acceptingStatus", "REQUIRED");
    }

    @Test
    void promoterNetworkRosterAcceptsOnlyDefinedRanges() {
        ObjectNode data = validStep(PersonaType.PROMOTER, "network");
        data.put("rosterSize", "FIVE_TO_TEN");

        assertField(PersonaType.PROMOTER, "network", data, "rosterSize", "INVALID");
    }

    @Test
    void promoterGoalsRequireAtLeastOneGoal() {
        ObjectNode data = validStep(PersonaType.PROMOTER, "goals");
        data.withArray("connectionGoals").removeAll();

        assertField(PersonaType.PROMOTER, "goals", data, "connectionGoals", "REQUIRED");
    }

    @Test
    void profileImageRejectsBannerImage() {
        when(mediaService.validateOwnedReadyMedia(owner, "musician-profile", MediaType.PROFILE_IMAGE))
                .thenThrow(MediaException.wrongType(MediaType.PROFILE_IMAGE.name()));

        assertField(PersonaType.MUSICIAN, "basics",
                validStep(PersonaType.MUSICIAN, "basics"),
                "profileImage.mediaId", "MEDIA_WRONG_TYPE");
    }

    @Test
    void venueGalleryRejectsProfileImageAndRequiresAssociation() {
        AuthenticatedPersona venueOwner = new AuthenticatedPersona("venue-1", PersonaType.VENUE);
        ObjectNode data = validStep(PersonaType.VENUE, "media");
        data.set("galleryImages", objectMapper.createArrayNode()
                .add(objectMapper.createObjectNode().put("mediaId", "gallery-1")));
        when(mediaService.validateOwnedReadyMedia(
                venueOwner, "gallery-1", MediaType.GALLERY_IMAGE))
                .thenThrow(MediaException.wrongType(MediaType.GALLERY_IMAGE.name()));

        assertField(venueOwner, "media", data,
                "galleryImages[0].mediaId", "MEDIA_WRONG_TYPE");
    }

    @Test
    void invalidWebsiteSchemeIsRejected() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "media");
        data.put("websiteUrl", "javascript:alert(1)");

        assertField(PersonaType.MUSICIAN, "media", data, "websiteUrl", "INVALID_FORMAT");
    }

    @Test
    void entityReferencesMustMatchTheStepsExpectedType() {
        ObjectNode data = validStep(PersonaType.MUSICIAN, "sound");
        ((ObjectNode) data.withArray("soundsLikeArtists").get(0)).put("entityType", "VENUE");

        assertField(PersonaType.MUSICIAN, "sound", data,
                "soundsLikeArtists[0].entityType", "INVALID");
    }

    private ValidatedOnboardingStep validate(PersonaType persona, String stepKey, ObjectNode data) {
        return validate(new AuthenticatedPersona(persona.name().toLowerCase() + "-1", persona),
                stepKey, data);
    }

    private ValidatedOnboardingStep validate(
            AuthenticatedPersona identity,
            String stepKey,
            ObjectNode data) {
        OnboardingStep step = new OnboardingStep();
        step.setId("step-" + stepKey);
        step.setKey(stepKey);
        return service.validate(identity.persona(), stepKey, data, identity, step);
    }

    private void assertField(
            PersonaType persona,
            String stepKey,
            ObjectNode data,
            String field,
            String code) {
        assertField(new AuthenticatedPersona(persona.name().toLowerCase() + "-1", persona),
                stepKey, data, field, code);
    }

    private void assertField(
            AuthenticatedPersona identity,
            String stepKey,
            ObjectNode data,
            String field,
            String code) {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> validate(identity, stepKey, data)
        );
        assertEquals(OnboardingException.STEP_INVALID, exception.getCode());
        OnboardingStepValidationDetails details =
                assertInstanceOf(OnboardingStepValidationDetails.class, exception.getDetails());
        assertTrue(details.fields().contains(new OnboardingFieldError(field, code)), details.toString());
    }

    private void assertFields(
            PersonaType persona,
            String stepKey,
            ObjectNode data,
            OnboardingFieldError... expected) {
        OnboardingException exception = assertThrows(
                OnboardingException.class,
                () -> validate(persona, stepKey, data)
        );
        OnboardingStepValidationDetails details =
                assertInstanceOf(OnboardingStepValidationDetails.class, exception.getDetails());
        for (OnboardingFieldError fieldError : expected) {
            assertTrue(details.fields().contains(fieldError), details.toString());
        }
    }

    private ArrayNode enumArray(String... values) {
        ArrayNode array = objectMapper.createArrayNode();
        for (String value : values) array.add(value);
        return array;
    }

    private ObjectNode artistReference(String entityId, String displayName, boolean external) {
        ObjectNode reference = objectMapper.createObjectNode()
                .put("entityType", "ARTIST")
                .put("displayName", displayName)
                .put("external", external);
        if (entityId == null) {
            reference.putNull("entityId");
        } else {
            reference.put("entityId", entityId);
        }
        return reference;
    }
}
