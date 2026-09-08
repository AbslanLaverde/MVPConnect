import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../../../onboarding/onboardingConfig';
import type { OnboardingLocationData } from '../../../onboarding/onboardingStepOne';
import type { LocationSuggestionProvider } from '../LocationField';
import { MarketListInput } from '../MarketListInput';

const austin: OnboardingLocationData = {
  displayName: 'Austin, TX, USA',
  addressLine1: null,
  addressLine2: null,
  city: 'Austin',
  state: 'TX',
  postalCode: null,
  country: 'US',
  latitude: 30.2672,
  longitude: -97.7431,
  neighborhood: null,
  placeId: 'place-austin',
};

const provider: LocationSuggestionProvider = {
  search: jest.fn().mockResolvedValue([{ ...austin, city: '', state: '', country: '' }]),
  resolve: jest.fn().mockResolvedValue(austin),
};

describe('MarketListInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('adds a resolved structured location and supports accessible removal', async () => {
    const onChange = jest.fn();
    const screen = render(
      <MarketListInput
        label="OTHER MARKETS YOU WORK IN"
        value={[]}
        onChange={onChange}
        provider={provider}
        accentConfig={ONBOARDING_CONFIG.promoter}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('SEARCH FOR A CITY / MARKET, optional'), 'Aus');
    await act(async () => jest.advanceTimersByTime(350));
    await waitFor(() => expect(screen.getByLabelText('Use location Austin, TX, USA')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Use location Austin, TX, USA'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([austin]));

    screen.rerender(
      <MarketListInput
        label="OTHER MARKETS YOU WORK IN"
        value={[austin]}
        onChange={onChange}
        provider={provider}
        accentConfig={ONBOARDING_CONFIG.promoter}
      />,
    );
    expect(screen.getByText('Austin, TX')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remove Austin, TX'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('blocks semantic duplicates while preserving the hydrated list', async () => {
    const duplicateProvider: LocationSuggestionProvider = {
      search: jest.fn().mockResolvedValue([{ ...austin, displayName: 'Austin metro' }]),
      resolve: jest.fn().mockResolvedValue({ ...austin, displayName: 'Austin metro', placeId: 'different' }),
    };
    const onChange = jest.fn();
    const screen = render(
      <MarketListInput
        label="OTHER MARKETS YOU WORK IN"
        value={[austin]}
        onChange={onChange}
        provider={duplicateProvider}
        accentConfig={ONBOARDING_CONFIG.promoter}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('SEARCH FOR A CITY / MARKET, optional'), 'Aus');
    await act(async () => jest.advanceTimersByTime(350));
    fireEvent.press(await screen.findByLabelText('Use location Austin metro'));
    expect(await screen.findByText('That market is already in your list.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });
});
