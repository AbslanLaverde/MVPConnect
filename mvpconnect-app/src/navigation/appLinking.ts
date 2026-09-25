import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const appLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mvpconnect://'],
  // Bootstrap has already captured and validated the cold link. Warm linking stays unchanged.
  getInitialURL: async () => null,
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      SignupArtist: 'signup/artist',
      SignupVenue: 'signup/venue',
      SignupPromoter: 'signup/promoter',
      Onboarding: 'onboarding/:persona/:step',
      OAuthResult: 'oauth/result',
      Welcome: 'welcome',
      AuthenticatedApp: {
        // Shared-shell nesting is internal; public paths belong to its pages.
        path: '',
        screens: {
          ArtistHome: 'ArtistHome',
          VenueHome: 'VenueHome',
          PromoterHome: 'PromoterHome',
        },
      },
    },
  },
};
