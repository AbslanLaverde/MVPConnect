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

  it('preserves spaces while a structured city is being edited', () => {
    const onChange = jest.fn();
    const screen = render(<LocationField value={VALUE} onChange={onChange} mode="city" />);

    fireEvent.changeText(screen.getByLabelText('City, required'), 'Mount Vernon ');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ city: 'Mount Vernon ' }));
  });

  it('resolves a structured suggestion only after it is selected', async () => {
    const suggestion: LocationValue = {
      displayName: 'Mount Vernon, NY, USA',
      city: '',
      state: '',
      country: '',
      placeId: 'mount-vernon-place',
    };
    const resolved: LocationValue = {
      ...suggestion,
      city: 'Mount Vernon',
      state: 'NY',
      country: 'United States',
      latitude: 40.9126,
      longitude: -73.8371,
    };
    const provider: LocationSuggestionProvider = {
      search: jest.fn().mockResolvedValue([suggestion]),
      resolve: jest.fn().mockResolvedValue(resolved),
    };
    const onChange = jest.fn();
    const ControlledLocationField = () => {
      const [current, setCurrent] = React.useState<LocationValue>({ ...VALUE, city: '' });
      return (
        <LocationField
          value={current}
          onChange={(next) => {
            onChange(next);
            setCurrent(next);
          }}
          provider={provider}
          suggestionDelayMs={0}
          mode="city"
        />
      );
    };
    const screen = render(<ControlledLocationField />);

    fireEvent.changeText(screen.getByLabelText('City, required'), 'Mount Ver');

    await waitFor(() => expect(provider.search).toHaveBeenCalledWith('Mount Ver'));
    expect(screen.getByLabelText('Google Maps')).toBeTruthy();
    fireEvent.press(await screen.findByLabelText('Use location Mount Vernon, NY, USA'));

    await waitFor(() => expect(provider.resolve).toHaveBeenCalledWith(suggestion));
    expect(onChange).toHaveBeenLastCalledWith(resolved);
  });
});
