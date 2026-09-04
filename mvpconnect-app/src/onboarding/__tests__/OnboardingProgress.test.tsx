import React from 'react';
import { render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingProgress } from '../OnboardingProgress';
import type { OnboardingState } from '../onboardingTypes';

const venueState: OnboardingState = {
  persona: 'VENUE',
  status: 'IN_PROGRESS',
  currentStep: 'stage',
  onboardingVersion: 2,
  steps: [
    { key: 'room', position: 1, required: true, status: 'COMPLETE', data: {} },
    { key: 'music', position: 2, required: true, status: 'COMPLETE', data: {} },
    { key: 'stage', position: 3, required: true, status: 'IN_PROGRESS', data: {} },
    { key: 'booking', position: 4, required: true, status: 'NOT_STARTED', data: {} },
    { key: 'media', position: 5, required: false, status: 'NOT_STARTED', data: {} },
    { key: 'goals', position: 6, required: true, status: 'NOT_STARTED', data: {} },
  ],
};

describe('OnboardingProgress', () => {
  it('renders the backend-provided six-step Venue progress including Stage', () => {
    const screen = render(
      <OnboardingProgress
        state={venueState}
        activeStep={venueState.steps[2]}
        config={ONBOARDING_CONFIG.venue}
        mobile
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('THE STAGE, step 3 of 6')).toBeTruthy();
    expect(screen.getByText('03 / 06')).toBeTruthy();
    expect(screen.getByLabelText('MEDIA, not started')).toBeTruthy();
  });
});
