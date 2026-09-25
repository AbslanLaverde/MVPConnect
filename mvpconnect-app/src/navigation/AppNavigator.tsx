import React from 'react';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingShell } from '../onboarding/OnboardingShell';
import type { OnboardingPersona } from '../onboarding/onboardingTypes';
import { theme } from '../theme/theme';
import { OAuthResultScreen } from '../screens/OAuthResultScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthenticatedAppShell } from '../appShell/AuthenticatedAppShell';
import type { AuthenticatedStackParamList } from './authenticatedRoutes';
import { rootNavigation, finishStartupNavigation } from './rootNavigation';
import type { SessionNotice } from '../auth/authTypes';
import type { StartupRoute } from '../auth/startupEntry';
import { appLinking } from './appLinking';

export type RootStackParamList = {
  Login: { sessionNotice?: SessionNotice } | undefined;
  Signup: undefined;
  SignupArtist: undefined;
  SignupVenue: undefined;
  SignupPromoter: undefined;
  Onboarding: { persona: OnboardingPersona; step: string };
  OAuthResult: { attemptId?: string; provider?: string; status?: string } | undefined;
  Welcome: undefined;
  AuthenticatedApp: NavigatorScreenParams<AuthenticatedStackParamList>;
  Profile: { userId: string; userName?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC<{ initialRoute: StartupRoute; onReady?: () => void }> = ({ initialRoute, onReady }) => {
  return (
    <NavigationContainer linking={appLinking} ref={rootNavigation}
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
          name="AuthenticatedApp"
          component={AuthenticatedAppShell}
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
