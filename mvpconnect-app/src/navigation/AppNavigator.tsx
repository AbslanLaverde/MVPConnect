import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { MusicianHomeScreen } from '../screens/MusicianHomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { theme } from '../theme/theme';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MusicianHome: { userId: string; userName: string; userType: string };
  Profile: { userId: string; userName?: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
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
          name="MusicianHome"
          component={MusicianHomeScreen}
          options={({ route }) => ({
            title: route.params?.userName || 'Dashboard',
            headerRight: () => null,
          })}
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
