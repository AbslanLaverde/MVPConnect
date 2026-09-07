import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import type { ArtistReferenceProvider } from '../../services/externalArtistService';
import { theme } from '../../theme/theme';
import { ONBOARDING_CONFIG } from '../onboardingConfig';
import { OnboardingStepTwoForm } from '../OnboardingStepTwoForm';
import {
  emptyStepTwoData,
  validateStepTwoData,
} from '../onboardingStepTwo';
import type { OnboardingPersona } from '../onboardingTypes';
import type { StepTwoRequest } from '../stepTwoTypes';

const artistProvider: ArtistReferenceProvider = {
  searchLocal: jest.fn().mockResolvedValue([]),
  searchSpotify: jest.fn().mockResolvedValue([]),
  resolveSpotify: jest.fn(),
  createFreeForm: jest.fn(),
};

const Harness = ({
  persona,
  initial = emptyStepTwoData(persona),
}: {
  persona: OnboardingPersona;
  initial?: StepTwoRequest;
}) => {
  const [data, setData] = useState(initial);
  const validation = validateStepTwoData(persona, data);
  const config = ONBOARDING_CONFIG[persona];
  return (
    <OnboardingStepTwoForm
      config={config}
      mobile={false}
      position={2}
      totalSteps={persona === 'venue' ? 6 : 5}
      stepLabel={config.stepPresentation[
        persona === 'artist' ? 'sound' : persona === 'venue' ? 'music' : 'specialties'
      ].label}
      data={data}
      errors={validation.errors}
      showErrors
      onChange={setData}
      artistProvider={artistProvider}
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

describe('OnboardingStepTwoForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Artist sections in the required order', () => {
    const screen = render(<Harness persona="artist" />);
    expect(screen.getByText('WHAT DO YOU\nSOUND LIKE?')).toBeTruthy();
    expectTextOrder(screen, ['YOUR GENRES', "WHAT'S THE VIBE?", 'WHERE DO YOU PLAY?', 'SOUNDS LIKE']);
  });

  it('renders Venue sections in the required order', () => {
    const screen = render(<Harness persona="venue" />);
    expect(screen.getByText('YOUR MUSIC')).toBeTruthy();
    expect(screen.getByText('WHAT SOUNDS\nRIGHT IN THIS ROOM?')).toBeTruthy();
    expectTextOrder(screen, ['YOUR GENRES', "WHAT'S THE AMBIENCE?", 'WHAT HAPPENS HERE?', "ARTISTS YOU'VE BOOKED"]);
  });

  it('renders Promoter sections in the required order and marks Event Type required', () => {
    const screen = render(<Harness persona="promoter" />);
    expect(screen.getByText('WHAT KIND OF SHOWS\nDO YOU BUILD?')).toBeTruthy();
    expectTextOrder(screen, ['YOUR GENRES', 'WHAT DO YOU PRODUCE?', "WHAT'S THE ENERGY?", "ARTISTS YOU'VE WORKED WITH"]);
    expect(screen.getByText('WHAT DO YOU PRODUCE? *')).toBeTruthy();
  });

  it('uses gradient, violet, and blue selected accents by persona', () => {
    const artistScreen = render(<Harness persona="artist" initial={{
      genres: ['ROCK'], vibes: ['RAW'], eventTypes: [], soundsLikeArtists: [],
    }} />);
    expect(artistScreen.getByTestId('YOUR GENRES-ROCK-selected-accent').props.children).toBeTruthy();
    artistScreen.unmount();

    const venueScreen = render(<Harness persona="venue" initial={{
      genres: ['ROCK'], ambience: ['RAW'], eventTypes: [], artistsBooked: [],
    }} />);
    expect(StyleSheet.flatten(venueScreen.getByTestId('YOUR GENRES-ROCK-selected-accent').props.style).backgroundColor)
      .toBe(theme.personas.venue.accent);
    venueScreen.unmount();

    const promoterScreen = render(<Harness persona="promoter" initial={{
      genres: ['ROCK'], eventTypes: ['CONCERT'], vibes: [], artistsWorkedWith: [],
    }} />);
    expect(StyleSheet.flatten(promoterScreen.getByTestId('YOUR GENRES-ROCK-selected-accent').props.style).backgroundColor)
      .toBe(theme.personas.promoter.accent);
  });

  it('enforces five genres while keeping selected values available for deselection', () => {
    const screen = render(<Harness persona="artist" />);
    ['Alternative', 'Blues', 'Classical', 'Country', 'Electronic'].forEach((label) => {
      fireEvent.press(screen.getByLabelText(label));
    });
    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(screen.getAllByLabelText('Experimental')[0].props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByLabelText('Alternative'));
    expect(screen.getAllByLabelText('Experimental')[0].props.accessibilityState.disabled).toBe(false);
  });

  it('enforces the three-vibe maximum', () => {
    const screen = render(<Harness persona="artist" />);
    ['Atmospheric', 'Dark', 'Dreamy'].forEach((label) => fireEvent.press(screen.getByLabelText(label)));
    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getByLabelText('Energetic').props.accessibilityState.disabled).toBe(true);
  });
});
