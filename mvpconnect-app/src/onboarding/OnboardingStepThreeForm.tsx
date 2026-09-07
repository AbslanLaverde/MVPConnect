import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import {
  ChoiceCards,
  EquipmentSelector,
  NumberField,
  SelectChips,
  VenueReferenceInput,
} from '../components/onboarding';
import { FieldFrame } from '../components/onboarding/FieldFrame';
import type { VenueReferenceProvider } from '../services/venueIdentityService';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import {
  ARTIST_BOOKING_STATUS_OPTIONS,
  ARTIST_DRAW_OPTIONS,
  ARTIST_SET_LENGTH_OPTIONS,
  ARTIST_TRAVEL_OPTIONS,
  STEP_THREE_PRESENTATION,
  type StepThreeErrors,
} from './onboardingStepThree';
import { stepThreeStyles } from './OnboardingStepThree.styles';
import type {
  ArtistLiveFormData,
  ArtistSetLengthMinutes,
  ArtistTravelSelection,
  StepThreeFormData,
  VenueStageFormData,
} from './stepThreeTypes';
import {
  PA_AVAILABILITY_OPTIONS,
  PRODUCTION_AMENITY_OPTIONS,
  SOUND_ENGINEER_AVAILABILITY_OPTIONS,
  SOUNDCHECK_AVAILABILITY_OPTIONS,
} from './taxonomy';

interface OnboardingStepThreeFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  data: StepThreeFormData;
  errors: StepThreeErrors;
  showErrors: boolean;
  onChange: (data: StepThreeFormData) => void;
  onInteractiveValidityChange?: (valid: boolean) => void;
  venueProvider?: VenueReferenceProvider;
}

type InteractiveField = 'equipment' | 'stageWidthFeet' | 'stageDepthFeet';

export const OnboardingStepThreeForm: React.FC<OnboardingStepThreeFormProps> = ({
  config,
  mobile,
  position,
  totalSteps,
  stepLabel,
  data,
  errors,
  showErrors,
  onChange,
  onInteractiveValidityChange,
  venueProvider,
}) => {
  const persona = config.persona === 'venue' ? 'venue' : 'artist';
  const presentation = STEP_THREE_PRESENTATION[persona];
  const visibleErrors = showErrors ? errors : {};
  const [interactiveValidity, setInteractiveValidity] = useState<Record<InteractiveField, boolean>>({
    equipment: true,
    stageWidthFeet: true,
    stageDepthFeet: true,
  });

  useEffect(() => {
    onInteractiveValidityChange?.(Object.values(interactiveValidity).every(Boolean));
  }, [interactiveValidity, onInteractiveValidityChange]);

  const updateInteractiveValidity = useCallback((field: InteractiveField, valid: boolean) => {
    setInteractiveValidity((current) => current[field] === valid
      ? current
      : { ...current, [field]: valid });
  }, []);

  const sectionStyle = [stepThreeStyles.section, mobile && stepThreeStyles.sectionMobile];
  const sharedChoiceProps = {
    orientation: 'row' as const,
    accentConfig: config,
    containerStyle: stepThreeStyles.fieldFlush,
  };

  const renderArtist = () => {
    const artist = data as ArtistLiveFormData;
    return (
      <>
        <View testID="step-three-section-booking-status" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="BOOKING RIGHT NOW"
            helperText="Let people know your current availability."
            options={ARTIST_BOOKING_STATUS_OPTIONS}
            value={artist.bookingStatus ?? undefined}
            onChange={(bookingStatus) => onChange({ ...artist, bookingStatus: bookingStatus as ArtistLiveFormData['bookingStatus'] })}
            required
            error={visibleErrors.bookingStatus}
          />
        </View>
        <View testID="step-three-section-typical-draw" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="WHAT'S YOUR TYPICAL DRAW?"
            helperText="Roughly how many people usually come to see you perform?"
            options={ARTIST_DRAW_OPTIONS}
            value={artist.typicalDraw ?? undefined}
            onChange={(typicalDraw) => onChange({ ...artist, typicalDraw: typicalDraw as ArtistLiveFormData['typicalDraw'] })}
            required
            error={visibleErrors.typicalDraw}
          />
        </View>
        <View testID="step-three-section-travel" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="HOW FAR DO YOU PLAY?"
            helperText="What's your typical travel range?"
            options={ARTIST_TRAVEL_OPTIONS}
            value={artist.travelSelection ?? undefined}
            onChange={(travelSelection) => onChange({ ...artist, travelSelection: travelSelection as ArtistTravelSelection })}
            required
            error={visibleErrors.travelSelection}
          />
        </View>
        <View testID="step-three-section-set-length" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="TYPICAL SET LENGTH"
            helperText="Select the length you most often perform."
            options={ARTIST_SET_LENGTH_OPTIONS}
            value={artist.setLengthMinutes === null ? undefined : String(artist.setLengthMinutes)}
            onChange={(setLengthMinutes) => onChange({
              ...artist,
              setLengthMinutes: Number(setLengthMinutes) as ArtistSetLengthMinutes,
            })}
            optional
            error={visibleErrors.setLengthMinutes}
          />
        </View>
        <View testID="step-three-section-equipment" style={sectionStyle}>
          <EquipmentSelector
            label="WHAT DO YOU BRING?"
            helperText="Select the equipment you typically bring. Add quantities if you want."
            value={artist.equipmentBrought}
            onChange={(equipmentBrought) => onChange({ ...artist, equipmentBrought })}
            error={visibleErrors.equipmentBrought}
            accentConfig={config}
            containerStyle={stepThreeStyles.fieldFlush}
            onValidityChange={(valid) => updateInteractiveValidity('equipment', valid)}
          />
        </View>
        <View testID="step-three-section-venues-played" style={sectionStyle}>
          <VenueReferenceInput
            label="VENUES YOU'VE PLAYED"
            helperText="Add up to five places you've performed."
            value={artist.venuesPlayed}
            onChange={(venuesPlayed) => onChange({ ...artist, venuesPlayed })}
            optional
            error={visibleErrors.venuesPlayed}
            placeholder="Search for a venue"
            provider={venueProvider}
            accentConfig={config}
            showCounter
          />
        </View>
      </>
    );
  };

  const renderVenue = () => {
    const venue = data as VenueStageFormData;
    return (
      <>
        <View testID="step-three-section-sound-support" style={sectionStyle}>
          <FieldFrame
            label="SOUND SUPPORT"
            required
            helperText="Let artists know what sound support is available at your venue."
            helperBefore
            containerStyle={stepThreeStyles.fieldFlush}
          >
            <View style={[
              stepThreeStyles.soundSupportGrid,
              mobile && stepThreeStyles.soundSupportGridMobile,
            ]}>
              <ChoiceCards
                label="SOUND ENGINEER"
                options={SOUND_ENGINEER_AVAILABILITY_OPTIONS}
                value={venue.soundEngineerAvailability ?? undefined}
                onChange={(soundEngineerAvailability) => onChange({
                  ...venue,
                  soundEngineerAvailability: soundEngineerAvailability as VenueStageFormData['soundEngineerAvailability'],
                })}
                required
                error={visibleErrors.soundEngineerAvailability}
                accentConfig={config}
                containerStyle={[
                  stepThreeStyles.soundSupportField,
                  mobile && stepThreeStyles.soundSupportFieldMobile,
                ]}
              />
              <ChoiceCards
                label="SOUNDCHECK"
                options={SOUNDCHECK_AVAILABILITY_OPTIONS}
                value={venue.soundcheckAvailability ?? undefined}
                onChange={(soundcheckAvailability) => onChange({
                  ...venue,
                  soundcheckAvailability: soundcheckAvailability as VenueStageFormData['soundcheckAvailability'],
                })}
                required
                error={visibleErrors.soundcheckAvailability}
                accentConfig={config}
                containerStyle={[
                  stepThreeStyles.soundSupportField,
                  mobile && stepThreeStyles.soundSupportFieldMobile,
                ]}
              />
              <ChoiceCards
                label="PA SYSTEM"
                options={PA_AVAILABILITY_OPTIONS}
                value={venue.paAvailability ?? undefined}
                onChange={(paAvailability) => onChange({
                  ...venue,
                  paAvailability: paAvailability as VenueStageFormData['paAvailability'],
                })}
                required
                error={visibleErrors.paAvailability}
                accentConfig={config}
                containerStyle={[
                  stepThreeStyles.soundSupportField,
                  mobile && stepThreeStyles.soundSupportFieldMobile,
                ]}
              />
            </View>
          </FieldFrame>
        </View>
        <View testID="step-three-section-dimensions" style={sectionStyle}>
          <FieldFrame
            label="STAGE DIMENSIONS"
            optional
            helperText="Tell artists the size of your performance area."
            helperBefore
            containerStyle={stepThreeStyles.fieldFlush}
          >
            <View style={[
              stepThreeStyles.dimensionsRow,
              mobile && stepThreeStyles.dimensionsRowMobile,
            ]}>
              <NumberField
                label="WIDTH"
                optional
                value={venue.stageWidthFeet ?? undefined}
                onChange={(stageWidthFeet) => onChange({ ...venue, stageWidthFeet: stageWidthFeet ?? null })}
                onValidityChange={(valid) => updateInteractiveValidity('stageWidthFeet', valid)}
                suffix="FT"
                error={visibleErrors.stageWidthFeet}
                accessibilityLabel="Stage width in feet, optional"
                focusColor={config.accentStart}
                containerStyle={[
                  stepThreeStyles.dimensionField,
                  mobile && stepThreeStyles.dimensionFieldMobile,
                ]}
              />
              <NumberField
                label="DEPTH"
                optional
                value={venue.stageDepthFeet ?? undefined}
                onChange={(stageDepthFeet) => onChange({ ...venue, stageDepthFeet: stageDepthFeet ?? null })}
                onValidityChange={(valid) => updateInteractiveValidity('stageDepthFeet', valid)}
                suffix="FT"
                error={visibleErrors.stageDepthFeet}
                accessibilityLabel="Stage depth in feet, optional"
                focusColor={config.accentStart}
                containerStyle={[
                  stepThreeStyles.dimensionField,
                  mobile && stepThreeStyles.dimensionFieldMobile,
                ]}
              />
            </View>
          </FieldFrame>
        </View>
        <View testID="step-three-section-equipment" style={sectionStyle}>
          <EquipmentSelector
            label="WHAT EQUIPMENT IS ALREADY HERE?"
            helperText="Select the equipment you provide on stage. Add quantities if you want."
            value={venue.equipmentAvailable}
            onChange={(equipmentAvailable) => onChange({ ...venue, equipmentAvailable })}
            error={visibleErrors.equipmentAvailable}
            accentConfig={config}
            containerStyle={stepThreeStyles.fieldFlush}
            onValidityChange={(valid) => updateInteractiveValidity('equipment', valid)}
          />
        </View>
        <View testID="step-three-section-amenities" style={sectionStyle}>
          <SelectChips
            label="BEHIND THE STAGE"
            helperText="Let artists know what else you provide."
            value={venue.productionAmenities}
            onChange={(productionAmenities) => onChange({ ...venue, productionAmenities })}
            options={PRODUCTION_AMENITY_OPTIONS}
            maxSelections={PRODUCTION_AMENITY_OPTIONS.length}
            optional
            error={visibleErrors.productionAmenities}
            accentConfig={config}
            containerStyle={stepThreeStyles.fieldFlush}
          />
        </View>
      </>
    );
  };

  return (
    <View testID={`onboarding-step-three-${persona}`} style={stepThreeStyles.layout}>
      <Text testID="step-three-meta" style={[stepThreeStyles.stepMeta, { color: config.accentStart }]}> 
        {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
        <Text style={stepThreeStyles.stepLabel}>{stepLabel}</Text>
      </Text>
      <Text
        accessibilityRole="header"
        style={[stepThreeStyles.headline, mobile && stepThreeStyles.headlineMobile]}
      >
        {presentation.headline}
      </Text>
      <View style={stepThreeStyles.headingRule}>
        <OnboardingAccentFill config={config} style={stepThreeStyles.accentFill} />
      </View>
      <Text style={stepThreeStyles.support}>{presentation.support}</Text>
      <View style={stepThreeStyles.sections}>
        {persona === 'venue' ? renderVenue() : renderArtist()}
      </View>
    </View>
  );
};
