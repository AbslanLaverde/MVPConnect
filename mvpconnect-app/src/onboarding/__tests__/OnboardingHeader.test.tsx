import React from 'react';
import { render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingHeader } from '../OnboardingHeader';

describe('OnboardingHeader identity', () => {
  it('shows the saved Step 1 identity image and account name on later steps', () => {
    const screen = render(
      <OnboardingHeader
        config={ONBOARDING_CONFIG.artist}
        compact={false}
        identity={{
          displayName: 'Glass Houses',
          imageUrl: 'http://127.0.0.1:9000/fresh-profile-access',
        }}
      />,
    );

    expect(screen.getByText('Glass Houses')).toBeTruthy();
    expect(screen.getByLabelText('Glass Houses profile image').props.source.uri)
      .toBe('http://127.0.0.1:9000/fresh-profile-access');
  });

  it('gracefully uses the persona label before an image exists', () => {
    const screen = render(<OnboardingHeader config={ONBOARDING_CONFIG.venue} compact />);
    expect(screen.getByText('VENUE ONBOARDING')).toBeTruthy();
  });
});

