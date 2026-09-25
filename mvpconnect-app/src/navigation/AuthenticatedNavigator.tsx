import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ArtistHomeScreen } from '../home/artist/ArtistHomeScreen';
import { VenueHomeScreen } from '../home/venue/VenueHomeScreen';
import { PromoterHomeScreen } from '../home/promoter/PromoterHomeScreen';
import { theme } from '../theme/theme';
import type { AuthenticatedStackParamList } from './authenticatedRoutes';

const Stack = createStackNavigator<AuthenticatedStackParamList>();

export const AuthenticatedNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: theme.colors.pageBg } }}>
    <Stack.Screen name="ArtistHome" component={ArtistHomeScreen} />
    <Stack.Screen name="VenueHome" component={VenueHomeScreen} />
    <Stack.Screen name="PromoterHome" component={PromoterHomeScreen} />
  </Stack.Navigator>
);
