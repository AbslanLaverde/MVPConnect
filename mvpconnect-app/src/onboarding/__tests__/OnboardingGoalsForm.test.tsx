import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingGoalsForm } from '../OnboardingGoalsForm';
import type { GoalsStepRequest } from '../goalTypes';

describe('OnboardingGoalsForm', () => {
  it.each([
    ['artist', 5, 4, 'BOOK MORE SHOWS'],
    ['venue', 6, 3, 'FILL OPEN DATES'],
    ['promoter', 5, 4, 'BOOK MY ARTISTS'],
  ] as const)('renders the real %s final step and its exact goal set', (persona, total, count, goal) => {
    const screen = render(
      <OnboardingGoalsForm
        config={ONBOARDING_CONFIG[persona]}
        mobile={false}
        position={total}
        totalSteps={total}
        stepLabel="YOUR GOALS"
        data={{ connectionGoals: [] }}
        showError={false}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(`Step ${total} of ${total}, YOUR GOALS`)).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(count);
    expect(screen.getByLabelText(goal)).toBeTruthy();
    expect(screen.queryByText('You can always update this later.')).toBeNull();
  });

  it('uses independent checked semantics and toggles the whole goal card', () => {
    const onChange = jest.fn();
    const data: GoalsStepRequest = { connectionGoals: ['BOOK_SHOWS'] };
    const screen = render(
      <OnboardingGoalsForm
        config={ONBOARDING_CONFIG.artist}
        mobile={false}
        position={5}
        totalSteps={5}
        stepLabel="YOUR GOALS"
        data={data}
        showError
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('BOOK MORE SHOWS').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('CONNECT WITH PROMOTERS').props.accessibilityState.checked).toBe(false);
    fireEvent.press(screen.getByLabelText('CONNECT WITH PROMOTERS'));
    expect(onChange).toHaveBeenCalledWith({ connectionGoals: ['BOOK_SHOWS', 'FIND_PROMOTERS'] });
  });

  it('shows the required validation message without offering Skip', () => {
    const screen = render(
      <OnboardingGoalsForm
        config={ONBOARDING_CONFIG.venue}
        mobile
        position={6}
        totalSteps={6}
        stepLabel="YOUR GOALS"
        data={{ connectionGoals: [] }}
        error="Choose at least one goal."
        showError
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('alert').props.children).toBe('Choose at least one goal.');
    expect(screen.queryByText('SKIP FOR NOW')).toBeNull();
  });
});
