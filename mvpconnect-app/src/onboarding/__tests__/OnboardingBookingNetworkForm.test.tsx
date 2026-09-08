import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingBookingNetworkForm } from '../OnboardingBookingNetworkForm';
import {
  emptyPromoterNetworkData,
  emptyVenueBookingData,
  validateBookingNetworkData,
} from '../onboardingBookingNetwork';

describe('OnboardingBookingNetworkForm', () => {
  it('renders the real Venue Booking 04 / 06 screen without calendar UI', () => {
    const data = emptyVenueBookingData();
    const screen = render(
      <OnboardingBookingNetworkForm
        config={ONBOARDING_CONFIG.venue}
        mobile={false}
        position={4}
        totalSteps={6}
        stepLabel="BOOKING"
        data={data}
        errors={validateBookingNetworkData('venue', data).errors}
        showErrors
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('onboarding-venue-booking')).toBeTruthy();
    expect(screen.getByText('HOW DO YOU\nBOOK YOUR ROOM?')).toBeTruthy();
    expect(screen.getByText(/04 \/ 06/)).toBeTruthy();
    expect(screen.getByLabelText('Booking email, optional')).toBeTruthy();
    expect(screen.getByText('This email is kept private and will not be shown on your public profile.')).toBeTruthy();
    expect(screen.queryByText(/OPEN DATES|CALENDAR/i)).toBeNull();
  });

  it('renders Promoter Network 03 / 05 with electric-blue selected accents and no Past Shows', () => {
    const data = { ...emptyPromoterNetworkData(), acceptingStatus: 'ACTIVELY_ACCEPTING' as const };
    const screen = render(
      <OnboardingBookingNetworkForm
        config={ONBOARDING_CONFIG.promoter}
        mobile={false}
        position={3}
        totalSteps={5}
        stepLabel="YOUR NETWORK"
        data={data}
        errors={{}}
        showErrors
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('HOW ARE YOU\nCONNECTED?')).toBeTruthy();
    expect(screen.getByText(/03 \/ 05/)).toBeTruthy();
    expect(screen.getByTestId('ACCEPTING NEW ARTISTS?-ACTIVELY_ACCEPTING-selected-accent')).toBeTruthy();
    expect(ONBOARDING_CONFIG.promoter.accentEnd).toBeUndefined();
    expect(screen.getByTestId('promoter-roster-artists')).toBeTruthy();
    expect(screen.getByTestId('promoter-network-venues')).toBeTruthy();
    expect(screen.getByTestId('promoter-additional-markets')).toBeTruthy();
    expect(screen.queryByText(/PAST SHOWS/i)).toBeNull();
  });

  it('emits the exact Venue fields from the choice controls', () => {
    const onChange = jest.fn();
    const screen = render(
      <OnboardingBookingNetworkForm
        config={ONBOARDING_CONFIG.venue}
        mobile
        position={4}
        totalSteps={6}
        stepLabel="BOOKING"
        data={emptyVenueBookingData()}
        errors={{}}
        showErrors={false}
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Actively Booking'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bookingStatus: 'ACTIVELY_BOOKING' }));
    fireEvent.press(screen.getByLabelText('Both'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bookingMethod: 'BOTH' }));
  });
});
