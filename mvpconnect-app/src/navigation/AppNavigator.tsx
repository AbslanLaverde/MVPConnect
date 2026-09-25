import React from 'react';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingShell } from '../onboarding/OnboardingShell';
import type { OnboardingPersona } from '../onboarding/onboardingTypes';
import { theme } from '../theme/theme';
import { OAuthResultScreen } from '../screens/OAuthResultScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { ArtistHomeScreen } from '../home/artist/ArtistHomeScreen';
import { VenueHomeScreen } from '../home/venue/VenueHomeScreen';
import { PromoterHomeScreen } from '../home/promoter/PromoterHomeScreen';
import { rootNavigation, finishStartupNavigation } from './rootNavigation';
import type { SessionNotice } from '../auth/authTypes';
import type { StartupRoute } from '../auth/startupEntry';

export type RootStackParamList = {
  Login: { sessionNotice?: SessionNotice } | undefined;
  Signup: undefined;
  SignupArtist: undefined;
  SignupVenue: undefined;
  SignupPromoter: undefined;
  Onboarding: { persona: OnboardingPersona; step: string };
  OAuthResult: { attemptId?: string; provider?: string; status?: string } | undefined;
  Welcome: undefined;
  ArtistHome: undefined;
  VenueHome: undefined;
  PromoterHome: undefined;
  Profile: { userId: string; userName?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
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
    },
  },
};

export const AppNavigator: React.FC<{ initialRoute: StartupRoute; onReady?: () => void }> = ({ initialRoute, onReady }) => {
  return (
    <NavigationContainer linking={linking} ref={rootNavigation}
      initialState={{ index: 0, routes: [initialRoute] }}
      onReady={() => { onReady?.(); finishStartupNavigation(initialRoute); }}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primaryBg,
            borderBottomColor: theme.colors.border,
            borderBottomWidth: 1,
          },
          headerTintColor: theme.colors.primaryText,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          cardStyle: {
            backgroundColor: theme.colors.primaryBg,
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignupArtist"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignupVenue"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignupPromoter"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingShell}
          options={{ headerShown: false, animationEnabled: false }}
        />
        <Stack.Screen
          name="OAuthResult"
          component={OAuthResultScreen}
          options={{ headerShown: false, animationEnabled: false }}
        />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false, animationEnabled: false }}
        />
        <Stack.Screen
          name="ArtistHome"
          component={ArtistHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VenueHome"
          component={VenueHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PromoterHome"
          component={PromoterHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Edit Profile',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
