import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
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

const renderForm = (persona: 'artist' | 'venue' | 'promoter', mobile = false) => {
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
      errors={{}}
      showErrors={false}
      mediaState={emptyMedia}
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
});

