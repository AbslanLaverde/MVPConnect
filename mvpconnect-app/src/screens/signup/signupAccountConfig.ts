import { theme } from '../../theme/theme';
import {
  authAPI,
  AuthResponse,
  SignupMusicianData,
  SignupPromoterData,
  SignupVenueData,
} from '../../services/api';

export type SignupPersona = 'artist' | 'venue' | 'promoter';
export type SignupUserType = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

export interface SignupAccountConfig {
  persona: SignupPersona;
  userType: SignupUserType;
  eyebrow: string;
  headline: string;
  support: string;
  nameLabel: string;
  namePlaceholder: string;
  nameRequiredError: string;
  cta: string;
  accent: string;
  usesConnectionGradient: boolean;
  submit: (name: string, email: string, password: string) => Promise<AuthResponse>;
}

export const SIGNUP_ACCOUNT_CONFIG: Record<SignupPersona, SignupAccountConfig> = {
  artist: {
    persona: 'artist',
    userType: 'MUSICIAN',
    eyebrow: 'ARTIST ACCOUNT',
    headline: 'MAKE YOUR\nINTRODUCTION.',
    support: "Just the essentials.\nWe'll build your artist profile next.",
    nameLabel: 'ARTIST / BAND NAME',
    namePlaceholder: 'Your artist or band name',
    nameRequiredError: 'Artist/Band name is required.',
    cta: 'CREATE ARTIST ACCOUNT →',
    accent: theme.personas.artist.accentStart,
    usesConnectionGradient: true,
    submit: (name, email, password) => {
      const payload: SignupMusicianData = { name, email, password };
      return authAPI.signupMusician(payload);
    },
  },
  venue: {
    persona: 'venue',
    userType: 'VENUE',
    eyebrow: 'VENUE ACCOUNT',
    headline: 'OPEN THE\nDOORS.',
    support: "Just the essentials.\nWe'll set up your venue next.",
    nameLabel: 'VENUE NAME',
    namePlaceholder: 'Your venue name',
    nameRequiredError: 'Venue name is required.',
    cta: 'CREATE VENUE ACCOUNT →',
    accent: theme.personas.venue.accent,
    usesConnectionGradient: false,
    submit: (name, email, password) => {
      const payload: SignupVenueData = { venueName: name, email, password };
      return authAPI.signupVenue(payload);
    },
  },
  promoter: {
    persona: 'promoter',
    userType: 'PROMOTER',
    eyebrow: 'PROMOTER ACCOUNT',
    headline: 'BUILD YOUR\nNETWORK.',
    support: "Just the essentials.\nWe'll build your promoter profile next.",
    nameLabel: 'PROMOTER / BUSINESS NAME',
    namePlaceholder: 'Your name or business name',
    nameRequiredError: 'Promoter/Business name is required.',
    cta: 'CREATE PROMOTER ACCOUNT →',
    accent: theme.personas.promoter.accent,
    usesConnectionGradient: false,
    submit: (name, email, password) => {
      const payload: SignupPromoterData = { businessName: name, email, password };
      return authAPI.signupPromoter(payload);
    },
  },
};
