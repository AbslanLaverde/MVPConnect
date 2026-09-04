import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingFooter } from '../OnboardingFooter';

const defaultProps = {
  config: ONBOARDING_CONFIG.artist,
  mobile: false,
  canContinue: true,
  busy: false,
  backDisabled: false,
  showBack: true,
  showSkip: false,
  onBack: jest.fn(),
  onContinue: jest.fn(),
  onSkip: jest.fn(),
};

describe('OnboardingFooter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not expose Skip for a required step', () => {
    const screen = render(<OnboardingFooter {...defaultProps} />);

    expect(screen.queryByLabelText('Skip this optional step for now')).toBeNull();
  });

  it('exposes Skip for an optional step and calls the provided operation', () => {
    const screen = render(<OnboardingFooter {...defaultProps} showSkip />);

    fireEvent.press(screen.getByLabelText('Skip this optional step for now'));
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
  });

  it('disables Continue until the step is valid', () => {
    const screen = render(<OnboardingFooter {...defaultProps} canContinue={false} />);
    const button = screen.getByLabelText('Continue to the next onboarding step');

    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(defaultProps.onContinue).not.toHaveBeenCalled();
  });

  it('shows a single large Continue action before secondary actions on mobile', () => {
    const screen = render(<OnboardingFooter {...defaultProps} mobile showSkip />);

    expect(screen.getAllByLabelText('Continue to the next onboarding step')).toHaveLength(1);
    expect(screen.getByLabelText('Go back to the previous onboarding step')).toBeTruthy();
    expect(screen.getByLabelText('Skip this optional step for now')).toBeTruthy();
  });
});
