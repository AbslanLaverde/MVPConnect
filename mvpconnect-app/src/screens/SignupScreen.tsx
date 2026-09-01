import React, { useState } from 'react';
import { SignupRole, SignupRoleSelection } from '../components/SignupRoleSelection';
import { SignupAccountScreen } from './signup/SignupAccountScreen';
import {
  SIGNUP_ACCOUNT_CONFIG,
  SignupPersona,
} from './signup/signupAccountConfig';

interface SignupScreenProps {
  navigation?: any;
  route?: {
    name: string;
  };
}

const PERSONA_BY_ROUTE: Record<string, SignupPersona | undefined> = {
  SignupArtist: 'artist',
  SignupVenue: 'venue',
  SignupPromoter: 'promoter',
};

const ROUTE_BY_USER_TYPE: Record<SignupRole, string> = {
  MUSICIAN: 'SignupArtist',
  VENUE: 'SignupVenue',
  PROMOTER: 'SignupPromoter',
};

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation, route }) => {
  const persona = PERSONA_BY_ROUTE[route?.name ?? 'Signup'];
  const [focusedRole, setFocusedRole] = useState<SignupRole>('MUSICIAN');

  if (persona) {
    return (
      <SignupAccountScreen
        config={SIGNUP_ACCOUNT_CONFIG[persona]}
        navigation={navigation}
      />
    );
  }

  return (
    <SignupRoleSelection
      focusedRole={focusedRole}
      onFocusedRoleChange={setFocusedRole}
      onCommitRole={(role) => navigation.navigate(ROUTE_BY_USER_TYPE[role])}
      onSignIn={() => navigation.navigate('Login')}
    />
  );
};
