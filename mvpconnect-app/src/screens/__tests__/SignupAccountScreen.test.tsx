import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SignupAccountScreen } from '../signup/SignupAccountScreen';
import { SIGNUP_ACCOUNT_CONFIG } from '../signup/signupAccountConfig';
import { authAPI } from '../../services/api';

jest.mock('../../auth/session', () => ({ sessionController: { isCurrent: jest.fn(() => true) } }));
jest.mock('../../services/api', () => ({ authAPI: {
  signupMusician: jest.fn(), signupVenue: jest.fn(), signupPromoter: jest.fn(),
} }));
jest.mock('../../../assets/branding/mvpconnect-logo-native.png', () => ({ testUri: 'logo' }));

it.each([
  ['artist', 'signupMusician', 'name', 'basics', 'MUSICIAN'],
  ['venue', 'signupVenue', 'venueName', 'room', 'VENUE'],
  ['promoter', 'signupPromoter', 'businessName', 'business', 'PROMOTER'],
] as const)('keeps %s signup entering its persona onboarding after session establishment', async (persona, method, nameField, step, userType) => {
  jest.clearAllMocks();
  (authAPI[method] as jest.Mock).mockResolvedValue({ sessionId: 'session', userId: 'user', userType, email: 'a@example.test', generation: 1 });
  const navigation = { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() };
  const config = SIGNUP_ACCOUNT_CONFIG[persona];
  const screen = render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 800 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
    <SignupAccountScreen config={config} navigation={navigation} />
  </SafeAreaProvider>);
  fireEvent.changeText(screen.getByLabelText(`${config.nameLabel}, required`), 'Test Name');
  fireEvent.changeText(screen.getByLabelText('EMAIL, required'), 'A@example.test');
  fireEvent.changeText(screen.getByLabelText('PASSWORD, required'), 'test-password');
  fireEvent.press(screen.getByLabelText(`Create ${persona} account`));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Onboarding', { persona, step }));
  expect(authAPI[method]).toHaveBeenCalledWith({ [nameField]: 'Test Name', email: 'a@example.test', password: 'test-password' });
});
