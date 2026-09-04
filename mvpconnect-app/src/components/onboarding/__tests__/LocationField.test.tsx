import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  LocationField,
  LocationSuggestionProvider,
  LocationValue,
} from '../LocationField';

const VALUE: LocationValue = {
  displayName: 'Brooklyn, NY, USA',
  city: 'Brooklyn',
  state: 'NY',
  country: 'USA',
  latitude: 40.6782,
  longitude: -73.9442,
  placeId: 'brooklyn-place',
};

describe('LocationField', () => {
  it('preserves structured provider metadata when the optional neighborhood changes', () => {
    const onChange = jest.fn();
    const screen = render(<LocationField value={VALUE} onChange={onChange} />);

    fireEvent.changeText(screen.getByLabelText('Neighborhood, optional'), 'Williamsburg');

    expect(onChange).toHaveBeenCalledWith({ ...VALUE, neighborhood: 'Williamsburg' });
  });

  it('works without a provider and does not retain stale provider metadata after manual edits', () => {
    const onChange = jest.fn();
    const screen = render(<LocationField value={{ ...VALUE, neighborhood: 'Bushwick' }} onChange={onChange} />);

    fireEvent.changeText(screen.getByLabelText('CITY / STATE, optional'), 'Queens, NY');

    expect(onChange).toHaveBeenCalledWith({
      displayName: 'Queens, NY',
      city: '',
      state: '',
      country: '',
      neighborhood: 'Bushwick',
    });
  });

  it('accepts a provider-selected structured location through the provider abstraction', async () => {
    const suggestion: LocationValue = {
      displayName: 'Austin, TX, USA',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      latitude: 30.2672,
      longitude: -97.7431,
      placeId: 'austin-place',
    };
    const provider: LocationSuggestionProvider = {
      search: jest.fn().mockResolvedValue([suggestion]),
    };
    const onChange = jest.fn();
    const screen = render(
      <LocationField
        value={{ ...VALUE, displayName: 'Aus' }}
        onChange={onChange}
        provider={provider}
        suggestionDelayMs={0}
      />,
    );

    await waitFor(() => expect(provider.search).toHaveBeenCalledWith('Aus'));
    fireEvent.press(await screen.findByLabelText('Use location Austin, TX, USA'));

    expect(onChange).toHaveBeenLastCalledWith(suggestion);
  });
});
