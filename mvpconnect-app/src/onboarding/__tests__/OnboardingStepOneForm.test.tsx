import React from 'react';
import { StyleSheet } from 'react-native';
import { render, within } from '@testing-library/react-native';
import type { MediaUploadAdapter, MediaUploaderState } from '../../components/onboarding/MediaUploader';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingStepOneForm } from '../OnboardingStepOneForm';
import type { StepOneData } from '../onboardingStepOne';

const adapter: MediaUploadAdapter = {
  upload: jest.fn(),
  remove: jest.fn(),
};
const emptyMedia: MediaUploaderState = { status: 'EMPTY' };
const location = {
  displayName: '',
  addressLine1: null,
  addressLine2: null,
  city: '',
  state: '',
  postalCode: null,
  country: '',
  latitude: null,
  longitude: null,
  neighborhood: null,
  placeId: null,
};

const renderForm = (
  persona: 'artist' | 'venue' | 'promoter',
  mobile = false,
  mediaState: MediaUploaderState = emptyMedia,
  profileImageError?: string,
) => {
  const data: StepOneData = persona === 'venue'
    ? { description: null, location }
    : persona === 'promoter'
      ? { bio: null, location, websiteUrl: null, phone: null }
      : { bio: null, location };
  return render(
    <OnboardingStepOneForm
      config={ONBOARDING_CONFIG[persona]}
      mobile={mobile}
      position={1}
      totalSteps={persona === 'venue' ? 6 : 5}
      stepLabel={ONBOARDING_CONFIG[persona].stepPresentation[ONBOARDING_CONFIG[persona].entryStep].label}
      displayName="Example Account"
      data={data}
      errors={profileImageError ? { profileImage: profileImageError } : {}}
      showErrors={Boolean(profileImageError)}
      mediaState={mediaState}
      onMediaStateChange={jest.fn()}
      onSelectImage={jest.fn()}
      mediaAdapter={adapter}
      onChange={jest.fn()}
    />,
  );
};

describe('Onboarding Step 1 forms', () => {
  it('renders Artist Basics fields without collecting the name again', () => {
    const screen = renderForm('artist');
    expect(screen.getByText('WHO ARE YOU\nWHEN THE LIGHTS COME UP?')).toBeTruthy();
    expect(screen.getByLabelText('BIO, optional')).toBeTruthy();
    expect(screen.getByLabelText('City, required')).toBeTruthy();
    expect(screen.getByLabelText('State, required')).toBeTruthy();
    expect(screen.getByLabelText('Country, required')).toBeTruthy();
    expect(screen.queryByLabelText('Street address, required')).toBeNull();
    expect(screen.queryByText('ARTIST / BAND NAME')).toBeNull();
  });

  it('renders Venue Room address and capacity fields', () => {
    const screen = renderForm('venue');
    expect(screen.getByLabelText('DESCRIPTION, optional')).toBeTruthy();
    expect(screen.getByLabelText('Street address, required')).toBeTruthy();
    expect(screen.getByLabelText('Address line 2, optional')).toBeTruthy();
    expect(screen.getByLabelText('Postal code, optional')).toBeTruthy();
    expect(screen.getByLabelText('CAPACITY, required')).toBeTruthy();
  });

  it('renders Promoter Business fields and private-phone helper', () => {
    const screen = renderForm('promoter');
    expect(screen.getByLabelText('BIO, optional')).toBeTruthy();
    expect(screen.getByLabelText('WEBSITE, optional')).toBeTruthy();
    expect(screen.getByLabelText('PHONE, optional')).toBeTruthy();
    expect(screen.getByText('Used for your account. Not shown publicly.')).toBeTruthy();
  });

  it('uses the large desktop and balanced compact mobile identity treatments', () => {
    const desktop = renderForm('artist');
    expect(desktop.getByTestId('onboarding-identity-desktop')).toBeTruthy();
    expect(StyleSheet.flatten(desktop.getByTestId('onboarding-step-one-layout').props.style).flexDirection)
      .toBe('row');
    desktop.unmount();

    const mobile = renderForm('artist', true);
    expect(mobile.getByTestId('onboarding-identity-mobile')).toBeTruthy();
    expect(StyleSheet.flatten(mobile.getByTestId('onboarding-step-one-layout').props.style).flexDirection)
      .toBe('column');
  });

  it('keeps the empty uploader inside one card and renders validation outside it', () => {
    const error = 'Add and finish uploading a profile image.';
    const screen = renderForm('artist', true, emptyMedia, error);
    const card = screen.getByTestId('onboarding-profile-image-card');
    const cardQueries = within(card);

    expect(cardQueries.getByText('ADD YOUR IMAGE')).toBeTruthy();
    expect(cardQueries.getByText('JPG · PNG · WEBP\nMAX 10 MB')).toBeTruthy();
    expect(cardQueries.getByText('SELECT AN IMAGE')).toBeTruthy();
    expect(cardQueries.getByLabelText('Select image')).toBeTruthy();
    expect(cardQueries.queryByText(error)).toBeNull();
    expect(screen.getByText(error)).toBeTruthy();

    expect(StyleSheet.flatten(card.props.style)).toEqual(expect.objectContaining({
      width: '100%',
      position: 'relative',
    }));
  });

  it('keeps uploaded preview, status, and actions inside the same card', () => {
    const screen = renderForm('artist', true, {
      status: 'UPLOADED',
      media: { id: 'media-1', url: 'https://example.com/profile.jpg' },
    });
    const cardQueries = within(screen.getByTestId('onboarding-profile-image-card'));

    expect(cardQueries.getByLabelText('Selected profile image preview')).toBeTruthy();
    expect(cardQueries.getByText('UPLOADED')).toBeTruthy();
    expect(cardQueries.getByLabelText('Replace image')).toBeTruthy();
    expect(cardQueries.getByLabelText('Remove image')).toBeTruthy();
  });
});

