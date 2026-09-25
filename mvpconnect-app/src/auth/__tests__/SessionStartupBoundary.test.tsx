import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../../navigation/AppNavigator';
import { SessionStartupBoundary } from '../SessionStartupBoundary';
import { SessionBootstrap } from '../sessionBootstrap';
import { AuthRequestError } from '../authErrors';
import { deferred, fixture } from '../__testUtils__/sessionTestSupport';

jest.mock('../../store/store', () => ({ store: { dispatch: jest.fn() } }));
jest.mock('../session', () => ({ sessionController: {} }));
jest.mock('../startupEntry', () => ({ loadStartupEntry: jest.fn() }));
jest.mock('../../navigation/startupLink', () => ({ captureStartupLink: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../../navigation/AppNavigator', () => ({ AppNavigator: jest.fn(({ initialRoute, onReady }) => {
  const React = require('react'); const { Text } = require('react-native');
  React.useEffect(() => { onReady(); }, []);
  return React.createElement(Text, null, initialRoute.name);
}) }));

beforeEach(() => jest.clearAllMocks());
function setup() {
  const f = fixture('web');
  const loadEntry = jest.fn(async () => ({ name: 'AuthenticatedApp' as const, params: { screen: 'VenueHome' as const } }));
  const bootstrap = new SessionBootstrap({ session: f.controller, captureLink: async () => null, loadEntry });
  return { ...f, bootstrap, loadEntry };
}

it('renders only neutral startup UI while restoring, then mounts only the resolved destination', async () => {
  const f = setup(); const response = deferred<any>(); f.transport.refresh.mockReturnValueOnce(response.promise);
  const view = render(<SessionStartupBoundary fontsReady bootstrap={f.bootstrap} />);
  expect(view.getByText('MVPConnect')).toBeTruthy(); expect(view.getByText('Restoring your session…')).toBeTruthy();
  expect(view.getByLabelText('Restoring your session')).toBeTruthy();
  expect(AppNavigator).not.toHaveBeenCalled(); expect(view.queryByText('Login')).toBeNull(); expect(view.queryByText('AuthenticatedApp')).toBeNull();
  await act(async () => { response.resolve(f.wire()); });
  await waitFor(() => expect(view.getByText('AuthenticatedApp')).toBeTruthy());
  expect(view.queryByText('Login')).toBeNull(); expect(view.queryByText('Restoring your session…')).toBeNull();
  expect((AppNavigator as jest.Mock).mock.calls.every(([props]) => props.initialRoute.name === 'AuthenticatedApp'
    && props.initialRoute.params.screen === 'VenueHome')).toBe(true);
});

it('loads fonts and session in parallel behind the same presentation', async () => {
  const f = setup(); const view = render(<SessionStartupBoundary fontsReady={false} bootstrap={f.bootstrap} />);
  await waitFor(() => expect(f.bootstrap.getSnapshot().status).toBe('READY_AUTHENTICATED'));
  expect(f.transport.refresh).toHaveBeenCalledTimes(1); expect(AppNavigator).not.toHaveBeenCalled();
  expect(view.getByText('Restoring your session…')).toBeTruthy();
  view.rerender(<SessionStartupBoundary fontsReady bootstrap={f.bootstrap} />);
  expect(view.getByText('AuthenticatedApp')).toBeTruthy(); expect(view.queryByText('Login')).toBeNull();
});

it('shows retryable controls without expiry copy and Retry releases the restored screen', async () => {
  const f = setup(); f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'offline', 503));
  const view = render(<SessionStartupBoundary fontsReady bootstrap={f.bootstrap} />);
  await waitFor(() => expect(view.getByText("We couldn't restore your session. Check your connection and try again.")).toBeTruthy());
  expect(AppNavigator).not.toHaveBeenCalled(); expect(view.queryByText(/Your session expired/)).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(view.getByText('AuthenticatedApp')).toBeTruthy());
  expect(f.transport.refresh).toHaveBeenCalledTimes(2);
});

it('Sign Out from retryable UI goes straight to Login through shared session exit', async () => {
  const f = setup(); f.transport.refresh.mockRejectedValueOnce(new AuthRequestError('AUTH_SERVICE_UNAVAILABLE', 'offline', 503));
  const view = render(<SessionStartupBoundary fontsReady bootstrap={f.bootstrap} />);
  await waitFor(() => expect(view.getByRole('button', { name: 'Sign Out' })).toBeTruthy());
  fireEvent.press(view.getByRole('button', { name: 'Sign Out' }));
  await waitFor(() => expect(view.getByText('Login')).toBeTruthy());
  expect(f.onExit).toHaveBeenCalledWith('EXPLICIT_SIGN_OUT');
  expect((AppNavigator as jest.Mock).mock.calls[0][0].initialRoute).toEqual({ name: 'Login' });
});
