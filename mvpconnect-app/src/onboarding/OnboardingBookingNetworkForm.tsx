import React from 'react';
import { Text, View } from 'react-native';
import {
  ArtistReferenceInput,
  ChoiceCards,
  FieldFrame,
  MarketListInput,
  TextField,
  VenueReferenceInput,
} from '../components/onboarding';
import type { LocationSuggestionProvider } from '../components/onboarding/LocationField';
import type { ArtistReferenceProvider } from '../services/externalArtistService';
import type { VenueReferenceProvider } from '../services/venueIdentityService';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import {
  BOOKING_METHOD_OPTIONS,
  BOOKING_NETWORK_PRESENTATION,
  PROMOTER_ACCEPTING_STATUS_OPTIONS,
  ROSTER_SIZE_OPTIONS,
  VENUE_BOOKING_STATUS_OPTIONS,
  type BookingNetworkErrors,
} from './onboardingBookingNetwork';
import { ARTIST_DRAW_OPTIONS } from './onboardingStepThree';
import { stepThreeStyles as formStyles } from './OnboardingStepThree.styles';
import type {
  BookingNetworkFormData,
  PromoterNetworkFormData,
  VenueBookingFormData,
} from './bookingNetworkTypes';

interface OnboardingBookingNetworkFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  data: BookingNetworkFormData;
  errors: BookingNetworkErrors;
  showErrors: boolean;
  onChange: (data: BookingNetworkFormData) => void;
  artistProvider?: ArtistReferenceProvider;
  venueProvider?: VenueReferenceProvider;
  locationProvider?: LocationSuggestionProvider;
}

export const OnboardingBookingNetworkForm: React.FC<OnboardingBookingNetworkFormProps> = ({
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
  venueProvider,
  locationProvider,
}) => {
  const persona = config.persona === 'venue' ? 'venue' : 'promoter';
  const presentation = BOOKING_NETWORK_PRESENTATION[persona];
  const visibleErrors = showErrors ? errors : {};
  const sectionStyle = [formStyles.section, mobile && formStyles.sectionMobile];
  const sharedChoiceProps = {
    orientation: 'row' as const,
    accentConfig: config,
    containerStyle: formStyles.fieldFlush,
  };

  const renderVenue = () => {
    const venue = data as VenueBookingFormData;
    return (
      <>
        <View testID="venue-booking-status" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="BOOKING RIGHT NOW?"
            helperText="Let people know your current booking status."
            options={VENUE_BOOKING_STATUS_OPTIONS}
            value={venue.bookingStatus ?? undefined}
            onChange={(bookingStatus) => onChange({
              ...venue,
              bookingStatus: bookingStatus as VenueBookingFormData['bookingStatus'],
            })}
            required
            error={visibleErrors.bookingStatus}
          />
        </View>
        <View testID="venue-booking-method" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="HOW DO YOU BOOK?"
            helperText="Tell us how artists and promoters can work with you."
            options={BOOKING_METHOD_OPTIONS}
            value={venue.bookingMethod ?? undefined}
            onChange={(bookingMethod) => onChange({
              ...venue,
              bookingMethod: bookingMethod as VenueBookingFormData['bookingMethod'],
            })}
            required
            error={visibleErrors.bookingMethod}
          />
        </View>
        <View testID="venue-booking-draw" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="WHAT DRAW FITS YOUR ROOM?"
            helperText="Select the typical artist draw range for your venue."
            options={ARTIST_DRAW_OPTIONS}
            value={venue.desiredArtistDraw ?? undefined}
            onChange={(desiredArtistDraw) => onChange({
              ...venue,
              desiredArtistDraw: desiredArtistDraw as VenueBookingFormData['desiredArtistDraw'],
            })}
            optional
            error={visibleErrors.desiredArtistDraw}
          />
        </View>
        <View testID="venue-booking-email" style={sectionStyle}>
          <FieldFrame
            label="BOOKING EMAIL"
            optional
            helperText="Where should we send booking-related notifications?"
            helperBefore
            containerStyle={formStyles.fieldFlush}
          >
            <TextField
              value={venue.bookingEmail}
              onChangeText={(bookingEmail) => onChange({ ...venue, bookingEmail })}
              placeholder="booking@yourvenue.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Booking email, optional"
              helperText="This email is kept private and will not be shown on your public profile."
              error={visibleErrors.bookingEmail}
              focusColor={config.accentStart}
            />
          </FieldFrame>
        </View>
      </>
    );
  };

  const renderPromoter = () => {
    const promoter = data as PromoterNetworkFormData;
    return (
      <>
        <View testID="promoter-accepting-status" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="ACCEPTING NEW ARTISTS?"
            helperText="Let artists know if you're currently looking to work with new talent."
            options={PROMOTER_ACCEPTING_STATUS_OPTIONS}
            value={promoter.acceptingStatus ?? undefined}
            onChange={(acceptingStatus) => onChange({
              ...promoter,
              acceptingStatus: acceptingStatus as PromoterNetworkFormData['acceptingStatus'],
            })}
            required
            error={visibleErrors.acceptingStatus}
          />
        </View>
        <View testID="promoter-roster-size" style={sectionStyle}>
          <ChoiceCards
            {...sharedChoiceProps}
            label="CURRENT ROSTER SIZE"
            helperText="Give us a sense of how many artists you currently work with."
            options={ROSTER_SIZE_OPTIONS}
            value={promoter.rosterSize ?? undefined}
            onChange={(rosterSize) => onChange({
              ...promoter,
              rosterSize: rosterSize as PromoterNetworkFormData['rosterSize'],
            })}
            optional
            error={visibleErrors.rosterSize}
          />
        </View>
        <View testID="promoter-roster-artists" style={sectionStyle}>
          <ArtistReferenceInput
            label="WHO'S ON YOUR ROSTER?"
            helperText="Add up to five artists you currently book or consider part of your roster."
            value={promoter.rosterArtists}
            onChange={(rosterArtists) => onChange({ ...promoter, rosterArtists })}
            optional
            error={visibleErrors.rosterArtists}
            placeholder="Search for an artist"
            provider={artistProvider}
            accentConfig={config}
            showCounter
          />
        </View>
        <View testID="promoter-network-venues" style={sectionStyle}>
          <VenueReferenceInput
            label="VENUES YOU WORK WITH"
            helperText="Add up to five venues you regularly work with."
            value={promoter.venues}
            onChange={(venues) => onChange({ ...promoter, venues })}
            optional
            error={visibleErrors.venues}
            placeholder="Search for a venue"
            provider={venueProvider}
            accentConfig={config}
            showCounter
          />
        </View>
        <View testID="promoter-additional-markets" style={sectionStyle}>
          <MarketListInput
            label="OTHER MARKETS YOU WORK IN"
            helperText="Add up to five additional cities or markets where you regularly book shows."
            value={promoter.additionalMarkets}
            onChange={(additionalMarkets) => onChange({ ...promoter, additionalMarkets })}
            provider={locationProvider}
            accentConfig={config}
            error={visibleErrors.additionalMarkets}
            showCounter
          />
        </View>
      </>
    );
  };

  return (
    <View testID={`onboarding-${persona}-${persona === 'venue' ? 'booking' : 'network'}`} style={formStyles.layout}>
      <Text style={[formStyles.stepMeta, { color: config.accentStart }]}>
        {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
        <Text style={formStyles.stepLabel}>{stepLabel}</Text>
      </Text>
      <Text
        accessibilityRole="header"
        style={[formStyles.headline, mobile && formStyles.headlineMobile]}
      >
        {presentation.headline}
      </Text>
      <View style={formStyles.headingRule}>
        <OnboardingAccentFill config={config} style={formStyles.accentFill} />
      </View>
      <Text style={formStyles.support}>{presentation.support}</Text>
      <View style={formStyles.sections}>
        {persona === 'venue' ? renderVenue() : renderPromoter()}
      </View>
    </View>
  );
};
