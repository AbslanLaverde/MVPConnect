import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { MediaUploadAdapter, MediaUploaderState } from '../../components/onboarding';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingMediaForm, type OnboardingMediaFormProps } from '../OnboardingMediaForm';
import { hydrateMediaStepData } from '../onboardingMediaStep';

const adapter: MediaUploadAdapter = {
  upload: jest.fn(),
  remove: jest.fn(),
};

const baseProps = (persona: 'artist' | 'venue' | 'promoter'): OnboardingMediaFormProps => ({
  config: ONBOARDING_CONFIG[persona],
  mobile: false,
  position: persona === 'venue' ? 5 : 4,
  totalSteps: persona === 'venue' ? 6 : 5,
  stepLabel: 'MEDIA',
  data: hydrateMediaStepData(persona, {}),
  bannerState: { status: 'EMPTY' },
  galleryStates: [] as MediaUploaderState[],
  connections: [],
  artistIdentity: null,
  interactionBusy: false,
  errors: {},
  bannerAdapter: adapter,
  galleryAdapter: adapter,
  onPickImage: jest.fn().mockResolvedValue(undefined),
  onPickGalleryImages: jest.fn().mockResolvedValue([]),
  onBannerChange: jest.fn(),
  onGalleryChange: jest.fn(),
  onWebsiteChange: jest.fn(),
  onUrlConnectionSave: jest.fn().mockResolvedValue(undefined),
  onConnectionRemove: jest.fn().mockResolvedValue(undefined),
  onOAuthConnect: jest.fn().mockResolvedValue(undefined),
  onArtistIdentityAttach: jest.fn().mockResolvedValue(undefined),
  onArtistIdentityDisconnect: jest.fn().mockResolvedValue(undefined),
});

describe('OnboardingMediaForm', () => {
  it.each(['artist', 'venue', 'promoter'] as const)(
    'renders the shared 3:1 Hero guidance for %s',
    (persona) => {
      const screen = render(<OnboardingMediaForm {...baseProps(persona)} />);

      expect(screen.getByText(/Recommended: 1500 × 500 px \(3:1\)\./)).toBeTruthy();
      expect(StyleSheet.flatten(screen.getByTestId('banner-image-surface').props.style))
        .toEqual(expect.objectContaining({ aspectRatio: 3, minHeight: 0 }));
    },
  );

  it.each(['artist', 'venue'] as const)(
    'stretches the mobile Website section for %s without changing URL behavior',
    (persona) => {
      const screen = render(<OnboardingMediaForm {...baseProps(persona)} mobile />);

      expect(StyleSheet.flatten(screen.getByTestId('media-website-content').props.style))
        .toEqual(expect.objectContaining({ width: '100%', alignSelf: 'stretch' }));
      expect(screen.getByLabelText('Website URL, optional').props.keyboardType).toBe('url');
    },
  );

  it('renders the approved Artist content, providers, and eight-image limit', () => {
    const screen = render(<OnboardingMediaForm {...baseProps('artist')} />);

    expect(screen.getByLabelText('Step 04 of 05, MEDIA')).toBeTruthy();
    expect(screen.getByText('MAKE IT YOURS.')).toBeTruthy();
    expect(screen.getByText('SHOW YOURSELF')).toBeTruthy();
    expect(screen.getByLabelText('0 of 8 gallery slots occupied')).toBeTruthy();
    expect(screen.getByText('CONNECT YOUR MUSIC')).toBeTruthy();
    expect(screen.getByText('VIDEO & SOCIAL')).toBeTruthy();
    expect(screen.getByLabelText('Search for your Spotify Artist identity')).toBeTruthy();
    expect(screen.getByLabelText('Connect YouTube')).toBeTruthy();
    expect(screen.getByLabelText('Connect SoundCloud')).toBeTruthy();
    expect(screen.getByLabelText('Website URL, optional')).toBeTruthy();
    expect(screen.queryByText('FEATURED MEDIA')).toBeNull();
  });

  it('renders Venue Media at 05/06 with the ten-image limit and URL-first providers', () => {
    const screen = render(<OnboardingMediaForm {...baseProps('venue')} />);

    expect(screen.getByLabelText('Step 05 of 06, MEDIA')).toBeTruthy();
    expect(screen.getAllByText('SHOW THE ROOM').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('0 of 10 gallery slots occupied')).toBeTruthy();
    expect(screen.getByLabelText('Instagram profile URL or handle')).toBeTruthy();
    expect(screen.getByLabelText('Facebook profile URL or handle')).toBeTruthy();
    expect(screen.getAllByLabelText(/profile URL or handle/)).toHaveLength(2);
    expect(screen.getByLabelText('Website URL, optional')).toBeTruthy();
    expect(screen.queryByText('GOOGLE MAPS')).toBeNull();
  });

  it('does not duplicate Website or expose pastShows for Promoter Media', () => {
    const screen = render(<OnboardingMediaForm {...baseProps('promoter')} />);

    expect(screen.getByText('SHOW YOUR WORK.')).toBeTruthy();
    expect(screen.getByLabelText('0 of 10 gallery slots occupied')).toBeTruthy();
    expect(screen.queryByLabelText('Website URL, optional')).toBeNull();
    expect(screen.queryByText('PAST SHOWS')).toBeNull();
  });

  it('delegates URL-first provider persistence to the shared connection handler', async () => {
    const props = baseProps('venue');
    const screen = render(<OnboardingMediaForm {...props} />);
    fireEvent.changeText(
      screen.getByLabelText('Instagram profile URL or handle'),
      '@thevenue',
    );
    fireEvent.press(screen.getByLabelText('Save Instagram connection'));
    await waitFor(() => expect(props.onUrlConnectionSave).toHaveBeenCalledWith('INSTAGRAM', '@thevenue'));
  });

  it('keeps Hero single-select and delegates only Gallery to the plural picker', async () => {
    const props = baseProps('artist');
    const screen = render(<OnboardingMediaForm {...props} />);

    fireEvent.press(screen.getByLabelText('Select image'));
    await waitFor(() => expect(props.onPickImage).toHaveBeenCalledTimes(1));
    expect(props.onPickGalleryImages).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Add gallery photos'));
    await waitFor(() => expect(props.onPickGalleryImages).toHaveBeenCalledWith(8));
    expect(props.onPickImage).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['artist', 8],
    ['venue', 10],
    ['promoter', 10],
  ] as const)('passes the remaining %s gallery capacity of %s to the plural picker', async (persona, limit) => {
    const props = baseProps(persona);
    const screen = render(<OnboardingMediaForm {...props} />);

    fireEvent.press(screen.getByLabelText('Add gallery photos'));

    await waitFor(() => expect(props.onPickGalleryImages).toHaveBeenCalledWith(limit));
  });
});
