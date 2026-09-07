import React, { useState } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AISuggestion, AISuggestionReview } from '../AISuggestionReview';
import { GenreSelector } from '../GenreSelector';
import { SocialConnectionField, SocialConnectionValue } from '../SocialConnectionField';
import type { GenreCode } from '../../../onboarding/taxonomy';

const GenreHarness = () => {
  const [genres, setGenres] = useState<GenreCode[]>([]);
  return (
    <>
      <GenreSelector value={genres} onChange={setGenres} maxSelections={1} />
      <Text accessibilityLabel="Selected genre values">{genres.join(',')}</Text>
    </>
  );
};

const SuggestionHarness = () => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([
    { id: 'raw', label: 'Raw', status: 'PENDING_REVIEW' },
    { id: 'energetic', label: 'Energetic', status: 'SUGGESTED' },
  ]);
  return <AISuggestionReview suggestions={suggestions} onChange={setSuggestions} />;
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

describe('domain-aware onboarding fields', () => {
  it('uses the centralized genre taxonomy, configurable maximum, and no free-form Other', () => {
    const screen = render(<GenreHarness />);

    fireEvent.press(screen.getByLabelText('Rock'));
    expect(screen.getByLabelText('Rock').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Selected genre values').props.children).toBe('ROCK');
    expect(screen.getByLabelText('Jazz').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByLabelText('Other')).toBeNull();
  });

  it('requires the user to accept or reject AI suggestions explicitly', () => {
    const screen = render(<SuggestionHarness />);

    fireEvent.press(screen.getByLabelText('Accept AI suggestion Raw'));
    expect(screen.getByLabelText('AI suggested Raw, accepted')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Reject AI suggestion Energetic'));
    expect(screen.getByLabelText('AI suggested Energetic, rejected')).toBeTruthy();
  });
});

describe('SocialConnectionField', () => {
  const connect = jest.fn();
  const disconnect = jest.fn();
  const renderState = (value: SocialConnectionValue) => render(
    <SocialConnectionField value={value} onConnect={connect} onDisconnect={disconnect} />,
  );

  beforeEach(() => jest.clearAllMocks());

  it('supports disconnected and connecting states', () => {
    const disconnected = renderState({ provider: 'SPOTIFY', status: 'NOT_CONNECTED' });
    fireEvent.press(disconnected.getByLabelText('Connect SPOTIFY'));
    expect(connect).toHaveBeenCalledWith('SPOTIFY');
    disconnected.unmount();

    const connecting = renderState({ provider: 'SPOTIFY', status: 'CONNECTING' });
    expect(connecting.getByLabelText('Connecting')).toBeTruthy();
    expect(connecting.getByLabelText('Connect SPOTIFY').props.accessibilityState.disabled).toBe(true);
  });

  it('supports connected provider identity, provider metadata, and disconnect', () => {
    const screen = renderState({
      provider: 'YOUTUBE',
      status: 'CONNECTED',
      displayName: 'Glass Houses',
      username: '@glasshouses',
      profileUrl: 'https://youtube.example/glasshouses',
      providerMetadata: { channelId: 'channel-1', subscribers: 2400 },
    });

    expect(screen.getByText('Glass Houses')).toBeTruthy();
    expect(screen.getByText('channelId: channel-1')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Disconnect YOUTUBE'));
    expect(disconnect).toHaveBeenCalledWith('YOUTUBE');
  });

  it('shows provider errors inline and offers retry', () => {
    const screen = renderState({
      provider: 'INSTAGRAM',
      status: 'ERROR',
      error: 'Instagram connection failed.',
    });

    expect(screen.getByText('Instagram connection failed.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Connect INSTAGRAM'));
    expect(connect).toHaveBeenCalledWith('INSTAGRAM');
  });
});
