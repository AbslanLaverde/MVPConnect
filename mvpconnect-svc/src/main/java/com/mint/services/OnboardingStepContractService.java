package com.mint.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
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
import com.mint.dto.onboarding.shared.EntityReferenceDto;
import com.mint.dto.onboarding.shared.MediaReferenceDto;
import com.mint.dto.onboarding.shared.PerformanceMediaReferenceDto;
import com.mint.dto.onboarding.venue.VenueBookingStepRequest;
import com.mint.dto.onboarding.venue.VenueGoalsStepRequest;
import com.mint.dto.onboarding.venue.VenueMediaStepRequest;
import com.mint.dto.onboarding.venue.VenueMusicStepRequest;
import com.mint.dto.onboarding.venue.VenueRoomStepRequest;
import com.mint.dto.onboarding.venue.VenueStageStepRequest;
import com.mint.dto.response.OnboardingFieldError;
import com.mint.exceptions.MediaException;
import com.mint.exceptions.OnboardingException;
import com.mint.media.MediaType;
import com.mint.nodes.OnboardingStep;
import com.mint.onboarding.OnboardingStepDefinition;
import com.mint.onboarding.OnboardingStepRegistry;
import com.mint.onboarding.PersonaType;
import com.mint.onboarding.ValidatedOnboardingStep;
import com.mint.onboarding.taxonomy.EntityType;
import com.mint.repositories.OnboardingStepRepository;
import com.mint.security.AuthenticatedPersona;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

@Service
public class OnboardingStepContractService {

    private static final Set<Integer> ALLOWED_SET_LENGTHS = Set.of(30, 45, 60, 90, 120);

    private final OnboardingStepRegistry stepRegistry;
    private final OnboardingStepRepository stepRepository;
    private final MediaService mediaService;
    private final Validator validator;
    private final ObjectMapper strictObjectMapper;

    public OnboardingStepContractService(
            OnboardingStepRegistry stepRegistry,
            OnboardingStepRepository stepRepository,
            MediaService mediaService,
            Validator validator,
            ObjectMapper objectMapper) {
        this.stepRegistry = stepRegistry;
        this.stepRepository = stepRepository;
        this.mediaService = mediaService;
        this.validator = validator;
        this.strictObjectMapper = objectMapper.copy()
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);
    }

    public ValidatedOnboardingStep validate(
            PersonaType persona,
            String stepKey,
            JsonNode data,
            AuthenticatedPersona owner,
            OnboardingStep step) {
        if (data == null || data.isNull() || !data.isObject()) {
            throw OnboardingException.stepInvalid(
                    stepKey,
                    List.of(new OnboardingFieldError("data", "INVALID"))
            );
        }

        OnboardingStepDefinition definition;
        try {
            definition = stepRegistry.definitionFor(persona, stepKey);
        } catch (IllegalArgumentException exception) {
            throw OnboardingException.invalidStep(stepKey, persona);
        }

        Object typedData;
        try {
            typedData = strictObjectMapper.treeToValue(data, definition.requestType());
        } catch (JsonProcessingException exception) {
            throw parsingError(stepKey, exception);
        }

        List<OnboardingFieldError> errors = new ArrayList<>();
        collectBeanValidationErrors(typedData, errors);
        collectDomainErrors(typedData, owner, step, errors);
        List<OnboardingFieldError> normalizedErrors = errors.stream()
                .distinct()
                .sorted(Comparator.comparing(OnboardingFieldError::field)
                        .thenComparing(OnboardingFieldError::code))
                .toList();
        if (!normalizedErrors.isEmpty()) {
            throw OnboardingException.stepInvalid(stepKey, normalizedErrors);
        }

        try {
            return new ValidatedOnboardingStep(
                    typedData,
                    strictObjectMapper.writeValueAsString(typedData)
            );
        } catch (JsonProcessingException exception) {
            throw OnboardingException.invalidData();
        }
    }

    public ValidatedOnboardingStep validateStored(
            PersonaType persona,
            String stepKey,
            String dataJson,
            AuthenticatedPersona owner,
            OnboardingStep step) {
        try {
            JsonNode data = dataJson == null || dataJson.isBlank()
                    ? strictObjectMapper.createObjectNode()
                    : strictObjectMapper.readTree(dataJson);
            return validate(persona, stepKey, data, owner, step);
        } catch (JsonProcessingException exception) {
            throw parsingError(stepKey, exception);
        }
    }

    private OnboardingException parsingError(String stepKey, JsonProcessingException exception) {
        String field = "data";
        if (exception instanceof UnrecognizedPropertyException unknown) {
            field = unknown.getPropertyName();
        } else if (exception instanceof JsonMappingException mappingException
                && !mappingException.getPath().isEmpty()) {
            field = mappingPath(mappingException.getPath());
        }
        return OnboardingException.stepInvalid(
                stepKey,
                List.of(new OnboardingFieldError(field, "INVALID"))
        );
    }

    private String mappingPath(List<JsonMappingException.Reference> path) {
        StringBuilder result = new StringBuilder();
        for (JsonMappingException.Reference reference : path) {
            if (reference.getFieldName() != null) {
                if (!result.isEmpty()) result.append('.');
                result.append(reference.getFieldName());
            } else if (reference.getIndex() >= 0) {
                result.append('[').append(reference.getIndex()).append(']');
            }
        }
        return result.isEmpty() ? "data" : result.toString();
    }

    private void collectBeanValidationErrors(
            Object typedData,
            List<OnboardingFieldError> errors) {
        for (ConstraintViolation<Object> violation : validator.validate(typedData)) {
            errors.add(new OnboardingFieldError(
                    validationPath(violation),
                    validationCode(violation)
            ));
        }
    }

    private String validationPath(ConstraintViolation<?> violation) {
        return violation.getPropertyPath().toString()
                .replace(".<list element>", "");
    }

    private String validationCode(ConstraintViolation<?> violation) {
        String annotation = violation.getConstraintDescriptor()
                .getAnnotation()
                .annotationType()
                .getSimpleName();
        if (Set.of("NotNull", "NotBlank", "NotEmpty").contains(annotation)) {
            return "REQUIRED";
        }
        if ("Email".equals(annotation)) {
            return "INVALID_FORMAT";
        }
        if ("Size".equals(annotation)
                && violation.getInvalidValue() instanceof Collection<?> collection) {
            Integer maximum = (Integer) violation.getConstraintDescriptor()
                    .getAttributes()
                    .get("max");
            if (maximum != null && collection.size() > maximum) return "TOO_MANY";
        }
        return "INVALID";
    }

    private void collectDomainErrors(
            Object data,
            AuthenticatedPersona owner,
            OnboardingStep step,
            List<OnboardingFieldError> errors) {
        if (data instanceof ArtistBasicsStepRequest request) {
            validateMedia("profileImage.mediaId", request.profileImage(), MediaType.PROFILE_IMAGE,
                    owner, step, errors);
        } else if (data instanceof ArtistSoundStepRequest request) {
            duplicates("genres", request.genres(), errors);
            duplicates("vibes", request.vibes(), errors);
            duplicates("eventTypes", request.eventTypes(), errors);
            entityReferenceDuplicates("soundsLikeArtists", request.soundsLikeArtists(), errors);
            entityTypes("soundsLikeArtists", request.soundsLikeArtists(), EntityType.ARTIST, errors);
        } else if (data instanceof ArtistLiveStepRequest request) {
            if (!Boolean.TRUE.equals(request.touring()) && request.travelRadiusMiles() == null) {
                errors.add(new OnboardingFieldError("travelRadiusMiles", "REQUIRED"));
            }
            if (request.setLengthMinutes() != null
                    && !ALLOWED_SET_LENGTHS.contains(request.setLengthMinutes())) {
                errors.add(new OnboardingFieldError("setLengthMinutes", "INVALID"));
            }
            duplicates("equipmentBrought", request.equipmentBrought(), errors);
            entityReferenceDuplicates("venuesPlayed", request.venuesPlayed(), errors);
            entityTypes("venuesPlayed", request.venuesPlayed(), EntityType.VENUE, errors);
            performanceMedia("performanceImages", request.performanceImages(), owner, step, errors);
        } else if (data instanceof ArtistMediaStepRequest request) {
            validateMedia("bannerImage.mediaId", request.bannerImage(), MediaType.BANNER_IMAGE,
                    owner, step, errors);
            url("websiteUrl", request.websiteUrl(), errors);
        } else if (data instanceof ArtistGoalsStepRequest request) {
            duplicates("connectionGoals", request.connectionGoals(), errors);
        } else if (data instanceof VenueRoomStepRequest request) {
            validateMedia("profileImage.mediaId", request.profileImage(), MediaType.PROFILE_IMAGE,
                    owner, step, errors);
            if (request.location() != null && request.location().addressLine1() == null) {
                errors.add(new OnboardingFieldError("location.addressLine1", "REQUIRED"));
            }
        } else if (data instanceof VenueMusicStepRequest request) {
            duplicates("genres", request.genres(), errors);
            duplicates("ambience", request.ambience(), errors);
            duplicates("eventTypes", request.eventTypes(), errors);
            entityReferenceDuplicates("artistsBooked", request.artistsBooked(), errors);
            entityTypes("artistsBooked", request.artistsBooked(), EntityType.ARTIST, errors);
        } else if (data instanceof VenueStageStepRequest request) {
            duplicates("equipmentAvailable", request.equipmentAvailable(), errors);
            duplicates("productionAmenities", request.productionAmenities(), errors);
        } else if (data instanceof VenueBookingStepRequest request) {
            // Bean Validation owns booking status, method, and email format rules.
        } else if (data instanceof VenueMediaStepRequest request) {
            validateMedia("bannerImage.mediaId", request.bannerImage(), MediaType.BANNER_IMAGE,
                    owner, step, errors);
            url("websiteUrl", request.websiteUrl(), errors);
            duplicatesBy("galleryImages", request.galleryImages(), MediaReferenceDto::mediaId, errors);
            mediaList("galleryImages", request.galleryImages(), MediaType.GALLERY_IMAGE,
                    owner, step, errors);
        } else if (data instanceof VenueGoalsStepRequest request) {
            duplicates("connectionGoals", request.connectionGoals(), errors);
        } else if (data instanceof PromoterBusinessStepRequest request) {
            validateMedia("profileImage.mediaId", request.profileImage(), MediaType.PROFILE_IMAGE,
                    owner, step, errors);
            url("websiteUrl", request.websiteUrl(), errors);
        } else if (data instanceof PromoterSpecialtiesStepRequest request) {
            duplicates("genres", request.genres(), errors);
            duplicates("eventTypes", request.eventTypes(), errors);
            duplicates("vibes", request.vibes(), errors);
            entityReferenceDuplicates("artistsWorkedWith", request.artistsWorkedWith(), errors);
            entityTypes("artistsWorkedWith", request.artistsWorkedWith(), EntityType.ARTIST, errors);
        } else if (data instanceof PromoterNetworkStepRequest request) {
            entityReferenceDuplicates("artists", request.artists(), errors);
            entityReferenceDuplicates("venues", request.venues(), errors);
            duplicates("additionalMarkets", request.additionalMarkets(), errors);
            entityTypes("artists", request.artists(), EntityType.ARTIST, errors);
            entityTypes("venues", request.venues(), EntityType.VENUE, errors);
            performanceMedia("pastShows", request.pastShows(), owner, step, errors);
        } else if (data instanceof PromoterMediaStepRequest request) {
            validateMedia("bannerImage.mediaId", request.bannerImage(), MediaType.BANNER_IMAGE,
                    owner, step, errors);
        } else if (data instanceof PromoterGoalsStepRequest request) {
            duplicates("connectionGoals", request.connectionGoals(), errors);
        }
    }

    private void performanceMedia(
            String field,
            List<PerformanceMediaReferenceDto> references,
            AuthenticatedPersona owner,
            OnboardingStep step,
            List<OnboardingFieldError> errors) {
        duplicatesBy(field, references, PerformanceMediaReferenceDto::mediaId, errors);
        for (int index = 0; index < references.size(); index++) {
            PerformanceMediaReferenceDto reference = references.get(index);
            validateMedia(field + "[" + index + "].mediaId", reference.mediaId(),
                    MediaType.GALLERY_IMAGE, owner, step, errors);
            if (reference.venue() != null && reference.venue().entityType() != EntityType.VENUE) {
                errors.add(new OnboardingFieldError(
                        field + "[" + index + "].venue.entityType", "INVALID"));
            }
            entityTypes(field + "[" + index + "].artists", reference.artists(),
                    EntityType.ARTIST, errors);
        }
    }

    private void mediaList(
            String field,
            List<MediaReferenceDto> references,
            MediaType expectedType,
            AuthenticatedPersona owner,
            OnboardingStep step,
            List<OnboardingFieldError> errors) {
        for (int index = 0; index < references.size(); index++) {
            validateMedia(field + "[" + index + "].mediaId", references.get(index),
                    expectedType, owner, step, errors);
        }
    }

    private void validateMedia(
            String field,
            MediaReferenceDto reference,
            MediaType expectedType,
            AuthenticatedPersona owner,
            OnboardingStep step,
            List<OnboardingFieldError> errors) {
        if (reference == null || reference.mediaId() == null) return;
        validateMedia(field, reference.mediaId(), expectedType, owner, step, errors);
    }

    private void validateMedia(
            String field,
            String mediaId,
            MediaType expectedType,
            AuthenticatedPersona owner,
            OnboardingStep step,
            List<OnboardingFieldError> errors) {
        if (mediaId == null) return;
        try {
            mediaService.validateOwnedReadyMedia(owner, mediaId, expectedType);
        } catch (MediaException exception) {
            errors.add(new OnboardingFieldError(field, mediaErrorCode(exception)));
            return;
        }
        if (step.getId() == null || !stepRepository.isMediaAssociated(step.getId(), mediaId)) {
            errors.add(new OnboardingFieldError(field, "MEDIA_NOT_ASSOCIATED"));
        }
    }

    private String mediaErrorCode(MediaException exception) {
        return switch (exception.getCode()) {
            case MediaException.MEDIA_NOT_OWNED -> "MEDIA_NOT_OWNED";
            case MediaException.MEDIA_NOT_READY -> "MEDIA_NOT_READY";
            case MediaException.INVALID_MEDIA_TYPE -> "MEDIA_WRONG_TYPE";
            default -> "INVALID";
        };
    }

    private void url(String field, String value, List<OnboardingFieldError> errors) {
        if (value == null) return;
        try {
            URI uri = URI.create(value);
            if (!("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null) {
                errors.add(new OnboardingFieldError(field, "INVALID_FORMAT"));
            }
        } catch (IllegalArgumentException exception) {
            errors.add(new OnboardingFieldError(field, "INVALID_FORMAT"));
        }
    }

    private void entityTypes(
            String field,
            List<EntityReferenceDto> references,
            EntityType expectedType,
            List<OnboardingFieldError> errors) {
        for (int index = 0; index < references.size(); index++) {
            EntityReferenceDto reference = references.get(index);
            if (reference != null
                    && reference.entityType() != null
                    && reference.entityType() != expectedType) {
                errors.add(new OnboardingFieldError(
                        field + "[" + index + "].entityType", "INVALID"));
            }
        }
    }

    private void entityReferenceDuplicates(
            String field,
            List<EntityReferenceDto> references,
            List<OnboardingFieldError> errors) {
        Set<EntityReferenceKey> seen = new HashSet<>();
        for (EntityReferenceDto reference : references) {
            EntityReferenceKey key = entityReferenceKey(reference);
            if (key != null && !seen.add(key)) {
                errors.add(new OnboardingFieldError(field, "DUPLICATE"));
                return;
            }
        }
    }

    private EntityReferenceKey entityReferenceKey(EntityReferenceDto reference) {
        if (reference == null || reference.entityType() == null) return null;
        if (reference.entityId() != null) {
            return new EntityReferenceKey(reference.entityType(), "id:" + reference.entityId());
        }
        if (reference.displayName() == null) return null;
        String normalizedName = reference.displayName()
                .strip()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
        return new EntityReferenceKey(reference.entityType(), "name:" + normalizedName);
    }

    private void duplicates(
            String field,
            List<?> values,
            List<OnboardingFieldError> errors) {
        duplicatesBy(field, values, Function.identity(), errors);
    }

    private <T, K> void duplicatesBy(
            String field,
            List<T> values,
            Function<T, K> keyFunction,
            List<OnboardingFieldError> errors) {
        Set<K> seen = new HashSet<>();
        for (T value : values) {
            if (value == null) continue;
            if (!seen.add(keyFunction.apply(value))) {
                errors.add(new OnboardingFieldError(field, "DUPLICATE"));
                return;
            }
        }
    }

    private record EntityReferenceKey(EntityType entityType, String identity) {
    }
}
