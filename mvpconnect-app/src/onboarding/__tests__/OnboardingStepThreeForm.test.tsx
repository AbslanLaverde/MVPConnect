import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { VenueReferenceProvider } from '../../services/venueIdentityService';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingStepThreeForm } from '../OnboardingStepThreeForm';
import {
  emptyArtistLiveData,
  emptyVenueStageData,
  validateStepThreeData,
} from '../onboardingStepThree';
import type { StepThreeFormData } from '../stepThreeTypes';
import { EQUIPMENT_OPTIONS, PRODUCTION_AMENITY_OPTIONS } from '../taxonomy';

const venueProvider: VenueReferenceProvider = {
  searchLocal: jest.fn().mockResolvedValue([]),
  searchGoogle: jest.fn().mockResolvedValue([]),
  resolveGoogle: jest.fn(),
  createFreeForm: jest.fn(),
};

const Harness = ({
  persona,
  initial = persona === 'artist' ? emptyArtistLiveData() : emptyVenueStageData(),
  mobile = false,
}: {
  persona: 'artist' | 'venue';
  initial?: StepThreeFormData;
  mobile?: boolean;
}) => {
  const [data, setData] = useState(initial);
  const validation = validateStepThreeData(persona, data);
  const config = ONBOARDING_CONFIG[persona];
  return (
    <OnboardingStepThreeForm
      config={config}
      mobile={mobile}
      position={3}
      totalSteps={persona === 'venue' ? 6 : 5}
      stepLabel={config.stepPresentation[persona === 'artist' ? 'live' : 'stage'].label}
      data={data}
      errors={validation.errors}
      showErrors
      onChange={setData}
      venueProvider={venueProvider}
    />
  );
};

const expectTextOrder = (screen: ReturnType<typeof render>, labels: string[]) => {
  const tree = JSON.stringify(screen.toJSON());
  let previousIndex = -1;
  labels.forEach((label) => {
    const index = tree.indexOf(label);
    expect(index).toBeGreaterThan(previousIndex);
    previousIndex = index;
  });
};

describe('OnboardingStepThreeForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Artist Playing Live as 03 / 05 in the required section order', () => {
    const screen = render(<Harness persona="artist" />);

    expect(screen.getByTestId('step-three-meta').props.children[0]).toBe('03 / 05  ');
    expect(screen.getByText('PLAYING LIVE')).toBeTruthy();
    expect(screen.getByText('HOW DO YOU\nSHOW UP LIVE?')).toBeTruthy();
    expectTextOrder(screen, [
      'BOOKING RIGHT NOW',
      "WHAT'S YOUR TYPICAL DRAW?",
      'HOW FAR DO YOU PLAY?',
      'TYPICAL SET LENGTH',
      'WHAT DO YOU BRING?',
      "VENUES YOU'VE PLAYED",
    ]);
    expect(screen.queryByText('PERFORMANCE IMAGES')).toBeNull();
  });

  it('keeps Artist set length single-select', () => {
    const screen = render(<Harness persona="artist" />);

    fireEvent.press(screen.getByLabelText('45 Min'));
    expect(screen.getByLabelText('45 Min').props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByLabelText('60 Min'));
    expect(screen.getByLabelText('45 Min').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText('60 Min').props.accessibilityState.checked).toBe(true);
  });

  it('allows Artist to select all eleven equipment types and add optional quantities', () => {
    const screen = render(<Harness persona="artist" />);

    EQUIPMENT_OPTIONS.forEach(({ label }) => fireEvent.press(screen.getByLabelText(label)));
    EQUIPMENT_OPTIONS.forEach(({ label }) => {
      expect(screen.getByLabelText(label).props.accessibilityState.checked).toBe(true);
    });
    fireEvent.changeText(screen.getByLabelText('Guitar Amp quantity, optional'), '2');
    expect(screen.getByLabelText('Guitar Amp quantity, optional').props.value).toBe('2');
  });

  it('integrates the stable VenueReferenceInput with the five-venue counter', () => {
    const screen = render(<Harness persona="artist" />);

    expect(screen.getByLabelText("VENUES YOU'VE PLAYED venue name")).toBeTruthy();
    expect(screen.getByText('0 / 5')).toBeTruthy();
  });

  it('renders Venue The Stage as 03 / 06 with the canonical section hierarchy', () => {
    const screen = render(<Harness persona="venue" />);

    expect(screen.getByTestId('step-three-meta').props.children[0]).toBe('03 / 06  ');
    expect(screen.getByText('THE STAGE')).toBeTruthy();
    expect(screen.getByText('WHAT CAN ARTISTS\nEXPECT ON STAGE?')).toBeTruthy();
    expectTextOrder(screen, [
      'SOUND SUPPORT',
      'STAGE DIMENSIONS',
      'WHAT EQUIPMENT IS ALREADY HERE?',
      'BEHIND THE STAGE',
    ]);
  });

  it('renders the exact required Venue sound support options', () => {
    const screen = render(<Harness persona="venue" />);

    expect(screen.getByText('SOUND SUPPORT *')).toBeTruthy();
    [
      'In House',
      'Available By Arrangement',
      'Full Soundcheck',
      'Line Check Only',
      'By Arrangement',
      'Full House PA',
      'Limited PA',
      'No PA',
    ].forEach((label) => expect(screen.getByLabelText(label)).toBeTruthy());
  });

  it('renders width and depth only, without generated mockup fields', () => {
    const screen = render(<Harness persona="venue" />);

    expect(screen.getByLabelText('Stage width in feet, optional')).toBeTruthy();
    expect(screen.getByLabelText('Stage depth in feet, optional')).toBeTruthy();
    expect(screen.queryByText(/STAGE HEIGHT/i)).toBeNull();
    expect(screen.queryByText(/ADDITIONAL NOTES/i)).toBeNull();
  });

  it('allows all eleven Venue equipment types and all eight canonical amenities', () => {
    const screen = render(<Harness persona="venue" />);

    EQUIPMENT_OPTIONS.forEach(({ label }) => fireEvent.press(screen.getByLabelText(label)));
    expect(screen.getByLabelText('Instrument Stands').props.accessibilityState.checked).toBe(true);

    PRODUCTION_AMENITY_OPTIONS.forEach(({ label }) => fireEvent.press(screen.getByLabelText(label)));
    PRODUCTION_AMENITY_OPTIONS.forEach(({ label }) => {
      expect(screen.getByLabelText(label).props.accessibilityState.checked).toBe(true);
    });
    expect(screen.queryByLabelText('Backline Support')).toBeNull();
    expect(screen.queryByLabelText('Video / Projection')).toBeNull();
    expect(screen.queryByLabelText('Piano (House)')).toBeNull();
  });

  it('stacks Venue sound support and dimensions in the existing mobile breakpoint mode', () => {
    const screen = render(<Harness persona="venue" mobile />);

    expect(screen.getByTestId('step-three-section-sound-support')).toBeTruthy();
    expect(screen.getByTestId('step-three-section-dimensions')).toBeTruthy();
  });
});
