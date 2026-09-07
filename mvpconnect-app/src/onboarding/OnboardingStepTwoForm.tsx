import React from 'react';
import { Text, View } from 'react-native';
import {
  ArtistReferenceInput,
  EventTypeSelector,
  GenreSelector,
  VibeSelector,
} from '../components/onboarding';
import type { ArtistReferenceProvider } from '../services/externalArtistService';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import {
  MAX_STEP_TWO_EVENT_TYPES,
  MAX_STEP_TWO_GENRES,
  MAX_STEP_TWO_VIBES,
  STEP_TWO_PRESENTATION,
  StepTwoErrors,
} from './onboardingStepTwo';
import type {
  ArtistSoundStepRequest,
  PromoterSpecialtiesStepRequest,
  StepTwoRequest,
  VenueMusicStepRequest,
} from './stepTwoTypes';
import { stepTwoStyles } from './OnboardingStepTwo.styles';

interface OnboardingStepTwoFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  data: StepTwoRequest;
  errors: StepTwoErrors;
  showErrors: boolean;
  onChange: (data: StepTwoRequest) => void;
  artistProvider?: ArtistReferenceProvider;
}

export const OnboardingStepTwoForm: React.FC<OnboardingStepTwoFormProps> = ({
  config,
  mobile,
  position,
  totalSteps,
  stepLabel,
  data,
  errors,
  showErrors,
  onChange,
  artistProvider,
}) => {
  const presentation = STEP_TWO_PRESENTATION[config.persona];
  const visibleErrors = showErrors ? errors : {};
  const sharedSelectorProps = {
    accentConfig: config,
    showCounter: true,
    containerStyle: stepTwoStyles.fieldFlush,
  };

  const genreSection = (
    <View
      testID="step-two-section-genres"
      style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}
    >
      <GenreSelector
        {...sharedSelectorProps}
        label="YOUR GENRES"
        helperText={presentation.genreHelper}
        value={data.genres}
        onChange={(genres) => onChange({ ...data, genres } as StepTwoRequest)}
        maxSelections={MAX_STEP_TWO_GENRES}
        required
        error={visibleErrors.genres}
      />
    </View>
  );

  const renderArtist = () => {
    const artist = data as ArtistSoundStepRequest;
    return (
      <>
        {genreSection}
        <View testID="step-two-section-vibes" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <VibeSelector
            {...sharedSelectorProps}
            label={presentation.vibeLabel}
            helperText={presentation.vibeHelper}
            value={artist.vibes}
            onChange={(vibes) => onChange({ ...artist, vibes })}
            maxSelections={MAX_STEP_TWO_VIBES}
            required
            error={visibleErrors.vibes}
          />
        </View>
        <View testID="step-two-section-event-types" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <EventTypeSelector
            {...sharedSelectorProps}
            label={presentation.eventTypeLabel}
            helperText={presentation.eventTypeHelper}
            value={artist.eventTypes}
            onChange={(eventTypes) => onChange({ ...artist, eventTypes })}
            maxSelections={MAX_STEP_TWO_EVENT_TYPES}
            optional
            error={visibleErrors.eventTypes}
          />
        </View>
        <View testID="step-two-section-artist-references" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <ArtistReferenceInput
            label={presentation.referenceLabel}
            helperText={presentation.referenceHelper}
            value={artist.soundsLikeArtists}
            onChange={(soundsLikeArtists) => onChange({ ...artist, soundsLikeArtists })}
            optional
            error={visibleErrors.soundsLikeArtists}
            provider={artistProvider}
            accentConfig={config}
            showCounter
          />
        </View>
      </>
    );
  };

  const renderVenue = () => {
    const venue = data as VenueMusicStepRequest;
    return (
      <>
        {genreSection}
        <View testID="step-two-section-ambience" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <VibeSelector
            {...sharedSelectorProps}
            label={presentation.vibeLabel}
            helperText={presentation.vibeHelper}
            value={venue.ambience}
            onChange={(ambience) => onChange({ ...venue, ambience })}
            maxSelections={MAX_STEP_TWO_VIBES}
            required
            error={visibleErrors.ambience}
          />
        </View>
        <View testID="step-two-section-event-types" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <EventTypeSelector
            {...sharedSelectorProps}
            label={presentation.eventTypeLabel}
            helperText={presentation.eventTypeHelper}
            value={venue.eventTypes}
            onChange={(eventTypes) => onChange({ ...venue, eventTypes })}
            maxSelections={MAX_STEP_TWO_EVENT_TYPES}
            optional
            error={visibleErrors.eventTypes}
          />
        </View>
        <View testID="step-two-section-artist-references" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <ArtistReferenceInput
            label={presentation.referenceLabel}
            helperText={presentation.referenceHelper}
            value={venue.artistsBooked}
            onChange={(artistsBooked) => onChange({ ...venue, artistsBooked })}
            optional
            error={visibleErrors.artistsBooked}
            provider={artistProvider}
            accentConfig={config}
            showCounter
          />
        </View>
      </>
    );
  };

  const renderPromoter = () => {
    const promoter = data as PromoterSpecialtiesStepRequest;
    return (
      <>
        {genreSection}
        <View
          testID="step-two-section-event-types"
          style={[
            stepTwoStyles.section,
            stepTwoStyles.promoterDefiningSection,
            { borderTopColor: config.accentStart },
            mobile && stepTwoStyles.sectionMobile,
          ]}
        >
          <EventTypeSelector
            {...sharedSelectorProps}
            label={presentation.eventTypeLabel}
            helperText={presentation.eventTypeHelper}
            value={promoter.eventTypes}
            onChange={(eventTypes) => onChange({ ...promoter, eventTypes })}
            maxSelections={MAX_STEP_TWO_EVENT_TYPES}
            required
            error={visibleErrors.eventTypes}
          />
        </View>
        <View testID="step-two-section-vibes" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <VibeSelector
            {...sharedSelectorProps}
            label={presentation.vibeLabel}
            helperText={presentation.vibeHelper}
            value={promoter.vibes}
            onChange={(vibes) => onChange({ ...promoter, vibes })}
            maxSelections={MAX_STEP_TWO_VIBES}
            optional
            error={visibleErrors.vibes}
          />
        </View>
        <View testID="step-two-section-artist-references" style={[stepTwoStyles.section, mobile && stepTwoStyles.sectionMobile]}>
          <ArtistReferenceInput
            label={presentation.referenceLabel}
            helperText={presentation.referenceHelper}
            value={promoter.artistsWorkedWith}
            onChange={(artistsWorkedWith) => onChange({ ...promoter, artistsWorkedWith })}
            optional
            error={visibleErrors.artistsWorkedWith}
            provider={artistProvider}
            accentConfig={config}
            showCounter
          />
        </View>
      </>
    );
  };

  return (
    <View testID={`onboarding-step-two-${config.persona}`} style={stepTwoStyles.layout}>
      <Text style={[stepTwoStyles.stepMeta, { color: config.accentStart }]}>
        {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
        <Text style={stepTwoStyles.stepLabel}>{stepLabel}</Text>
      </Text>
      <Text
        accessibilityRole="header"
        style={[stepTwoStyles.headline, mobile && stepTwoStyles.headlineMobile]}
      >
        {presentation.headline}
      </Text>
      <View style={stepTwoStyles.headingRule}>
        <OnboardingAccentFill config={config} style={stepTwoStyles.accentFill} />
      </View>
      <Text style={stepTwoStyles.support}>{presentation.support}</Text>
      <View style={stepTwoStyles.sections}>
        {config.persona === 'venue'
          ? renderVenue()
          : config.persona === 'promoter'
            ? renderPromoter()
            : renderArtist()}
      </View>
    </View>
  );
};
