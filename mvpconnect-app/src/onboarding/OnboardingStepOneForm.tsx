import React from 'react';
import { Text, View } from 'react-native';
import {
  LocationField,
  NumberField,
  TextArea,
  TextField,
  UrlField,
} from '../components/onboarding';
import type { LocationSuggestionProvider } from '../components/onboarding/LocationField';
import type {
  MediaFile,
  MediaUploadAdapter,
  MediaUploaderState,
} from '../components/onboarding/MediaUploader';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { OnboardingIdentityImage } from './OnboardingIdentityImage';
import {
  ArtistBasicsData,
  updateLocationForEditing,
  PromoterBusinessData,
  StepOneData,
  StepOneErrors,
  VenueRoomData,
} from './onboardingStepOne';
import { stepOneStyles } from './OnboardingStepOne.styles';

interface StepPresentation {
  headline: string;
  support: string;
}

const PRESENTATION: Record<OnboardingPersonaConfig['persona'], StepPresentation> = {
  artist: {
    headline: 'WHO ARE YOU\nWHEN THE LIGHTS COME UP?',
    support: 'Start with the essentials. This is how artists, venues and promoters will get to know you.',
  },
  venue: {
    headline: 'TELL US ABOUT\nTHE SPACE.',
    support: "Give artists and promoters a sense of the room they'll be stepping into.",
  },
  promoter: {
    headline: 'WHAT DO YOU\nBRING TO THE SCENE?',
    support: 'Tell artists and venues who you are and where you work.',
  },
};

interface OnboardingStepOneFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  displayName: string;
  data: StepOneData;
  errors: StepOneErrors;
  showErrors: boolean;
  mediaState: MediaUploaderState;
  onMediaStateChange: (state: MediaUploaderState) => void;
  onSelectImage: () => Promise<MediaFile | undefined>;
  mediaAdapter: MediaUploadAdapter;
  onChange: (data: StepOneData) => void;
  locationProvider?: LocationSuggestionProvider;
  onLocationSuggestionActivityChange?: (active: boolean) => void;
}

const optional = (value: string) => value.trim() ? value : null;

export const OnboardingStepOneForm: React.FC<OnboardingStepOneFormProps> = ({
  config,
  mobile,
  position,
  totalSteps,
  stepLabel,
  displayName,
  data,
  errors,
  showErrors,
  mediaState,
  onMediaStateChange,
  onSelectImage,
  mediaAdapter,
  onChange,
  locationProvider,
  onLocationSuggestionActivityChange,
}) => {
  const presentation = PRESENTATION[config.persona];
  const visibleErrors = showErrors ? errors : {};
  const gradient = config.accentEnd
    ? [config.accentStart, config.accentEnd] as const
    : undefined;
  const identity = (
    <OnboardingIdentityImage
      config={config}
      mobile={mobile}
      displayName={displayName}
      state={mediaState}
      onStateChange={onMediaStateChange}
      onSelectRequest={onSelectImage}
      adapter={mediaAdapter}
      error={visibleErrors.profileImage}
    />
  );

  const location = (
    <View style={stepOneStyles.locationBlock}>
      <Text style={stepOneStyles.sectionLabel}>
        LOCATION <Text style={stepOneStyles.required}>*</Text>
      </Text>
      <LocationField
        value={data.location}
        onChange={(value) => onChange({
          ...data,
          location: updateLocationForEditing(value, config.persona === 'venue'),
        } as StepOneData)}
        mode={config.persona === 'venue' ? 'address' : 'city'}
        provider={locationProvider}
        onSuggestionActivityChange={onLocationSuggestionActivityChange}
        required
        error={visibleErrors.location}
        fieldErrors={visibleErrors}
        focusColor={config.accentStart}
        focusGradientColors={gradient}
      />
    </View>
  );

  const fields = (() => {
    if (config.persona === 'venue') {
      const venue = data as VenueRoomData;
      return (
        <>
          <TextArea
            label="DESCRIPTION"
            optional
            value={venue.description ?? ''}
            onChangeText={(value) => onChange({ ...venue, description: optional(value) })}
            maxLength={500}
            showCharacterCount
            error={visibleErrors.description}
            placeholder="Describe your space, the vibe, and what makes it special..."
            focusColor={config.accentStart}
          />
          {location}
          <NumberField
            label="CAPACITY"
            required
            value={venue.capacity}
            onChange={(capacity) => onChange({ ...venue, capacity })}
            min={1}
            max={100000}
            integerOnly
            error={visibleErrors.capacity}
            focusColor={config.accentStart}
            placeholder="250"
          />
        </>
      );
    }

    if (config.persona === 'promoter') {
      const promoter = data as PromoterBusinessData;
      return (
        <>
          <TextArea
            label="BIO"
            optional
            value={promoter.bio ?? ''}
            onChangeText={(value) => onChange({ ...promoter, bio: optional(value) })}
            maxLength={500}
            showCharacterCount
            error={visibleErrors.bio}
            placeholder="Tell us about your events, your approach, and what you're building in your scene..."
            focusColor={config.accentStart}
          />
          {location}
          <UrlField
            label="WEBSITE"
            optional
            value={promoter.websiteUrl ?? ''}
            onChange={(websiteUrl) => onChange({ ...promoter, websiteUrl: optional(websiteUrl) })}
            error={visibleErrors.websiteUrl}
            placeholder="https://"
            focusColor={config.accentStart}
          />
          <TextField
            label="PHONE"
            optional
            value={promoter.phone ?? ''}
            onChangeText={(phone) => onChange({ ...promoter, phone: optional(phone) })}
            error={visibleErrors.phone}
            helperText="Used for your account. Not shown publicly."
            keyboardType="phone-pad"
            focusColor={config.accentStart}
          />
        </>
      );
    }

    const artist = data as ArtistBasicsData;
    return (
      <>
        <TextArea
          label="BIO"
          optional
          value={artist.bio ?? ''}
          onChangeText={(value) => onChange({ ...artist, bio: optional(value) })}
          maxLength={500}
          showCharacterCount
          error={visibleErrors.bio}
          placeholder="Tell us what you do, what drives you, and what makes your sound unique..."
          focusColor={config.accentStart}
          focusGradientColors={gradient}
        />
        {location}
      </>
    );
  })();

  return (
    <View testID="onboarding-step-one-layout" style={[stepOneStyles.columns, mobile && stepOneStyles.columnsMobile]}>
      <View style={stepOneStyles.formColumn}>
        <Text style={[stepOneStyles.stepMeta, { color: config.accentStart }]}>
          {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
          <Text style={stepOneStyles.stepLabel}>{stepLabel}</Text>
        </Text>
        <Text
          accessibilityRole="header"
          style={[stepOneStyles.headline, mobile && stepOneStyles.headlineMobile]}
        >
          {presentation.headline}
        </Text>
        <View style={stepOneStyles.headingRule}>
          <OnboardingAccentFill config={config} style={stepOneStyles.accentFill} />
        </View>
        <Text style={stepOneStyles.support}>{presentation.support}</Text>
        {mobile ? identity : null}
        <View style={stepOneStyles.form}>{fields}</View>
      </View>
      {!mobile ? identity : null}
    </View>
  );
};
