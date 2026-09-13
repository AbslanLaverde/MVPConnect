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
  signOut: {
    signingOut: false,
    discardConfirmationVisible: false,
    requestSignOut: jest.fn(),
    keepEditing: jest.fn(),
    confirmDiscardAndSignOut: jest.fn(),
    isSignOutPending: jest.fn(() => false),
  },
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

  it('keeps Sign Out available when Continue is disabled', () => {
    const screen = render(<OnboardingFooter {...defaultProps} canContinue={false} />);

    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(defaultProps.signOut.requestSignOut).toHaveBeenCalledTimes(1);
  });

  it('places Sign Out on the desktop secondary side before Continue', () => {
    const screen = render(<OnboardingFooter {...defaultProps} />);
    const testIds: string[] = [];
    const visit = (node: any) => {
      if (!node || typeof node === 'string') return;
      if (node.props?.testID) testIds.push(node.props.testID);
      (node.children ?? []).forEach(visit);
    };
    visit(screen.toJSON());

    expect(testIds.indexOf('onboarding-sign-out-action'))
      .toBeLessThan(testIds.indexOf('onboarding-primary-action'));
  });

  it('shows a single large Continue action before secondary actions on mobile', () => {
    const screen = render(<OnboardingFooter {...defaultProps} mobile showSkip />);
    const testIds: string[] = [];
    const visit = (node: any) => {
      if (!node || typeof node === 'string') return;
      if (node.props?.testID) testIds.push(node.props.testID);
      (node.children ?? []).forEach(visit);
    };
    visit(screen.toJSON());

    expect(screen.getAllByLabelText('Continue to the next onboarding step')).toHaveLength(1);
    expect(screen.getByLabelText('Go back to the previous onboarding step')).toBeTruthy();
    expect(screen.getByLabelText('Skip this optional step for now')).toBeTruthy();
    expect(testIds.indexOf('onboarding-primary-action'))
      .toBeLessThan(testIds.indexOf('onboarding-sign-out-action'));
    expect(testIds.indexOf('onboarding-sign-out-action'))
      .toBeLessThan(testIds.indexOf('onboarding-secondary-actions'));
  });

  it('shows the discard confirmation actions without changing the primary CTA', () => {
    const keepEditing = jest.fn();
    const confirmDiscardAndSignOut = jest.fn();
    const screen = render(
      <OnboardingFooter
        {...defaultProps}
        signOut={{
          ...defaultProps.signOut,
          discardConfirmationVisible: true,
          keepEditing,
          confirmDiscardAndSignOut,
        }}
      />,
    );

    fireEvent.press(screen.getByLabelText('Keep editing'));
    fireEvent.press(screen.getByLabelText('Sign out and discard unsaved changes'));
    expect(keepEditing).toHaveBeenCalledTimes(1);
    expect(confirmDiscardAndSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Continue to the next onboarding step')).toBeTruthy();
  });

  it('disables Sign Out while a sign-out operation is running', () => {
    const screen = render(
      <OnboardingFooter
        {...defaultProps}
        signOut={{ ...defaultProps.signOut, signingOut: true }}
      />,
    );
    const signOut = screen.getByLabelText('Signing out');

    expect(signOut.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(signOut);
    expect(defaultProps.signOut.requestSignOut).not.toHaveBeenCalled();
  });

  it('supports the final-step Finish label and accessible name', () => {
    const screen = render(
      <OnboardingFooter
        {...defaultProps}
        continueLabel="FINISH →"
        continueAccessibilityLabel="Finish onboarding"
      />,
    );
    expect(screen.getByLabelText('Finish onboarding')).toBeTruthy();
    expect(screen.getByText('FINISH →')).toBeTruthy();
  });

  it('supports final-step busy copy and accessible state', () => {
    const screen = render(
      <OnboardingFooter
        {...defaultProps}
        busy
        continueLabel="FINISH →"
        savingLabel="FINISHING…"
        continueAccessibilityLabel="Finish onboarding"
        savingAccessibilityLabel="Completing onboarding"
      />,
    );
    const button = screen.getByLabelText('Completing onboarding');
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(screen.getByText('FINISHING…')).toBeTruthy();
  });
});
