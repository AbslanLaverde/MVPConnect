import React from 'react';
import 'react-native-gesture-handler/jestSetup';
import { AccessibilityInfo, BackHandler, Dimensions, ScrollView, StyleSheet, processColor } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '../AppNavigator';
import { rootNavigation } from '../rootNavigation';
import { authenticatedAppRoute, resolveAuthenticatedHomeRoute } from '../authenticatedRoutes';
import type { AuthenticatedPersona } from '../authenticatedRoutes';
import { authenticatedNavItems } from '../authenticatedNavItems';
import { store } from '../../store/store';
import { onboardingApi, type SelfAccountResponse } from '../../onboarding/onboardingApi';
import { sessionController } from '../../auth/session';
import { authTransport } from '../../auth/authTransport';
import { response, deferred } from '../../auth/__testUtils__/sessionTestSupport';
import type { StartupRoute } from '../../auth/startupEntry';
import api from '../../services/api';
import { createAuthenticatedApi } from '../../auth/authenticatedApi';
import { AxiosError } from 'axios';
import { APP_CONTENT_MAX_WIDTH, appHorizontalPadding } from '../../appShell/appLayout';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('../../auth/authTransport', () => ({ authTransport: {
  login: jest.fn(), signup: jest.fn(), refresh: jest.fn(), logout: jest.fn(async () => {}),
} }));
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() },
  authAPI: { login: (input: object) => require('../../auth/session').sessionController.login(input) },
}));
jest.mock('../../components/MatchShowcase', () => ({ MatchShowcase: () => null }));
// These workflow screens are outside the branch; keep the actual Login, Welcome,
// three Homes, navigation, RTK cache and session-exit pipeline in this integration.
jest.mock('../../screens/SignupScreen', () => ({ SignupScreen: () => null }));
jest.mock('../../screens/ProfileScreen', () => ({ ProfileScreen: () => null }));
jest.mock('../../onboarding/OnboardingShell', () => ({ OnboardingShell: () => null }));
jest.mock('../../screens/OAuthResultScreen', () => ({ OAuthResultScreen: () => null }));

let identity: SelfAccountResponse;
const client = createAuthenticatedApi(sessionController);
let workflow: { persona: AuthenticatedPersona; status: string; currentStep: string | null; onboardingVersion: number; steps: object[] };
const originalWindow = Dimensions.get('window');
const originalScreen = Dimensions.get('screen');
const setWidth = (width: number) => act(() => Dimensions.set({
  window: { ...originalWindow, width, height: 800 }, screen: { ...originalScreen, width, height: 800 },
}));

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  setWidth(1440);
  identity = { id: 'user-A', persona: 'MUSICIAN', displayName: 'Glass Houses', email: 'A@example.test' };
  workflow = { persona: 'MUSICIAN', status: 'COMPLETED', currentStep: null, onboardingVersion: 2, steps: [] };
  (authTransport.login as jest.Mock).mockImplementation(async () => ({ ...response(), userType: identity.persona }));
  (api.get as jest.Mock).mockImplementation((...args) => (client.get as Function)(...args));
  (api.post as jest.Mock).mockImplementation((...args) => (client.post as Function)(...args));
  client.defaults.adapter = async (config) => ({ data: config.url === '/me' ? identity : workflow,
    status: 200, statusText: 'OK', headers: {}, config });
  await sessionController.login({ email: 'A@example.test', password: 'test-only' });
});
afterEach(() => {
  cleanup(); store.dispatch(onboardingApi.util.resetApiState());
  act(() => jest.runOnlyPendingTimers());
  jest.restoreAllMocks();
  act(() => Dimensions.set({ window: originalWindow, screen: originalScreen }));
});

const renderApp = (initialRoute: StartupRoute = authenticatedAppRoute(resolveAuthenticatedHomeRoute(identity))) => render(
  <Provider store={store}><SafeAreaProvider><AppNavigator initialRoute={initialRoute} /></SafeAreaProvider></Provider>,
);
const assertHome = async (home: string) => {
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe(home));
  expect(rootNavigation.getRootState().routes.map((route) => route.name)).toEqual(['AuthenticatedApp']);
  expect(rootNavigation.canGoBack()).toBe(false);
};
const cases = [['MUSICIAN', 'ArtistHome', 'ARTIST'], ['VENUE', 'VenueHome', 'VENUE'],
  ['PROMOTER', 'PromoterHome', 'PROMOTER']] as const;

it.each(cases)('mounts restored %s inside one shell and shares one /me request with %s', async (persona, home, label) => {
  identity.persona = persona;
  const view = renderApp();
  await assertHome(home);
  await waitFor(() => expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).status).not.toBe('pending'));
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).error).toBeUndefined();
  await waitFor(() => expect(view.getByTestId('account-trigger-name').props.children).toBe(identity.displayName));
  expect(view.getAllByTestId('authenticated-header')).toHaveLength(1);
  expect(view.getByText(label)).toBeTruthy();
  expect(view.getByText('NEEDS YOUR ATTENTION')).toBeTruthy();
  expect(view.getByText('YOU’RE ALL CAUGHT UP')).toBeTruthy();
  expect((api.get as jest.Mock).mock.calls.filter(([path]) => path === '/me')).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  const shellKey = rootNavigation.getRootState().routes[0].key;
  fireEvent.press(view.getByRole('button', { name: 'MVPConnect Home' }));
  fireEvent.press(view.getByRole('button', { name: 'Nav' }));
  expect(view.getByRole('button', { name: 'Home' })).toBeTruthy();
  expect(StyleSheet.flatten(view.getByRole('button', { name: 'Home' }).props.style).backgroundColor).toBeUndefined();
  expect(view.queryByTestId('menu-interaction-highlight', { includeHiddenElements: true })).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Home' }));
  expect(view.queryByTestId('authenticated-nav-menu')).toBeNull();
  expect(rootNavigation.getRootState().routes[0].key).toBe(shellKey);
  expect(rootNavigation.getCurrentRoute()?.name).toBe(home);
});

it.each(cases)('returning %s Login resets into %s without Login behind Back', async (persona, home) => {
  identity.persona = persona; workflow.persona = persona;
  const view = renderApp({ name: 'Login' });
  expect(view.queryByTestId('authenticated-header')).toBeNull();
  fireEvent.changeText(view.getByLabelText('EMAIL, required'), 'A@example.test');
  fireEvent.changeText(view.getByLabelText('PASSWORD, required'), 'test-only');
  fireEvent.press(view.getByRole('button', { name: 'Sign in to your account' }));
  await assertHome(home);
  expect(view.getByTestId('authenticated-header')).toBeTruthy();
});

it.each(cases)('Welcome Enter for %s resets into %s without replaying Welcome', async (persona, home) => {
  identity.persona = persona; workflow.persona = persona;
  const view = renderApp({ name: 'Welcome' });
  expect(view.queryByTestId('authenticated-header')).toBeNull();
  await waitFor(() => expect(view.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
  fireEvent.press(view.getByLabelText('Enter MVPConnect'));
  await assertHome(home);
  expect(view.getByTestId('authenticated-header')).toBeTruthy();
});

it.each([false, true])('refreshes cached Venue identity after promotion before Welcome (older /me in flight: %s)', async (inFlight) => {
  identity = { ...identity, persona: 'VENUE', displayName: 'VENUEX' };
  workflow = { ...workflow, persona: 'VENUE', status: 'READY', currentStep: 'goals' };
  const cached = store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate());
  await cached;
  const staleIdentity = identity;
  const uploadedImage = { mediaId: 'onboarding-upload', url: 'https://example.test/venue-upload.jpg', mimeType: 'image/jpeg' };
  const olderRead = deferred<void>();
  const promotedRead = deferred<void>();
  let promoted = false;
  let freshReadStarted = false;
  client.defaults.adapter = async (config) => {
    if (config.url === '/onboarding/complete') {
      // The completion transaction promotes the already uploaded media.
      identity = { ...identity, profileImage: uploadedImage };
      workflow = { ...workflow, status: 'COMPLETED' };
      promoted = true;
      return { data: { persona: 'VENUE', status: 'COMPLETED', onboardingVersion: 2 }, status: 200, statusText: 'OK', headers: {}, config };
    }
    let data: object = workflow;
    if (config.url === '/me') {
      if (!promoted) { await olderRead.promise; data = staleIdentity; }
      else { freshReadStarted = true; await promotedRead.promise; data = identity; }
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const oldRequest = inFlight ? store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate(undefined, { forceRefetch: true })) : undefined;
  if (inFlight) await waitFor(() => expect((api.get as jest.Mock).mock.calls.filter(([path]) => path === '/me')).toHaveLength(2));
  const view = renderApp({ name: 'Onboarding', params: { persona: 'venue', step: 'goals' } });
  // Exercise the real completion/cache boundary and the same Welcome reset as
  // OnboardingRealGoalsSession (whose Finish sequence has separate coverage).
  const completion = store.dispatch(onboardingApi.endpoints.completeOnboarding.initiate());
  const finish = completion.unwrap().then(() => rootNavigation.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
  await waitFor(() => expect(promoted).toBe(true));
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data?.profileImage).toBeUndefined();
  if (inFlight) {
    expect(freshReadStarted).toBe(false);
    await act(async () => { olderRead.resolve(); await oldRequest; });
  }
  await waitFor(() => expect(freshReadStarted).toBe(true));
  expect(rootNavigation.getCurrentRoute()?.name).toBe('Onboarding');
  await act(async () => { promotedRead.resolve(); await finish; });
  expect(rootNavigation.getCurrentRoute()?.name).toBe('Welcome');
  expect(view.queryByTestId('authenticated-header')).toBeNull();
  await waitFor(() => expect(view.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
  fireEvent.press(view.getByLabelText('Enter MVPConnect'));
  await assertHome('VenueHome');
  expect(view.getByTestId('venue-home-avatar').props.source.uri).toBe(uploadedImage.url);
  expect(view.getByTestId('account-trigger-icon', { includeHiddenElements: true })).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  expect(view.getByTestId('account-menu-image').props.source.uri).toBe(uploadedImage.url);
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data?.profileImage).toEqual(uploadedImage);
  // Home and Account consume this cache; neither starts a separate identity read.
  expect((api.get as jest.Mock).mock.calls.filter(([path]) => path === '/me')).toHaveLength(inFlight ? 3 : 2);
  cached.unsubscribe(); oldRequest?.unsubscribe(); completion.reset();
});

it('keeps Welcome retryable after a failed post-completion /me read and never enters Home with stale identity', async () => {
  const cached = store.dispatch(onboardingApi.endpoints.getSelfAccount.initiate()); await cached;
  let failIdentity = true;
  client.defaults.adapter = async (config) => {
    if (config.url === '/me' && failIdentity) throw new AxiosError('temporarily unavailable', undefined, config, undefined,
      { data: {}, status: 503, statusText: 'Unavailable', headers: {}, config });
    return { data: config.url === '/me' ? identity : workflow, status: 200, statusText: 'OK', headers: {}, config };
  };
  const completion = store.dispatch(onboardingApi.endpoints.completeOnboarding.initiate());
  await expect(completion.unwrap()).resolves.toMatchObject({ status: 'COMPLETED' });
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).isError).toBe(true);
  const view = renderApp({ name: 'Welcome' });
  await view.findByLabelText('Retry loading account');
  expect(view.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByLabelText('Enter MVPConnect'));
  expect(rootNavigation.getCurrentRoute()?.name).toBe('Welcome');
  identity = { ...identity, profileImage: { mediaId: 'new-image', url: 'https://example.test/new.jpg', mimeType: 'image/jpeg' } };
  failIdentity = false;
  fireEvent.press(view.getByLabelText('Retry loading account'));
  await waitFor(() => expect(view.getByLabelText('Enter MVPConnect').props.accessibilityState.disabled).toBe(false));
  fireEvent.press(view.getByLabelText('Enter MVPConnect'));
  await assertHome('ArtistHome');
  expect(view.getByTestId('artist-home-avatar').props.source.uri).toBe(identity.profileImage?.url);
  cached.unsubscribe(); completion.reset();
});

it('keeps incomplete Login outside the shell and preserves the resume step', async () => {
  workflow.status = 'IN_PROGRESS'; workflow.currentStep = 'sound';
  workflow.steps = [{ key: 'sound', position: 2, required: true, status: 'IN_PROGRESS', data: {} }];
  const view = renderApp({ name: 'Login' });
  fireEvent.changeText(view.getByLabelText('EMAIL, required'), 'A@example.test');
  fireEvent.changeText(view.getByLabelText('PASSWORD, required'), 'test-only');
  fireEvent.press(view.getByRole('button', { name: 'Sign in to your account' }));
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe('Onboarding'));
  expect(rootNavigation.getCurrentRoute()?.params).toEqual({ persona: 'artist', step: 'sound' });
  expect(view.queryByTestId('authenticated-header')).toBeNull();
});

it.each([
  { name: 'Login' }, { name: 'Signup' }, { name: 'SignupArtist' }, { name: 'SignupVenue' }, { name: 'SignupPromoter' },
  { name: 'Onboarding', params: { persona: 'artist', step: 'basics' } },
  { name: 'Welcome' }, { name: 'OAuthResult', params: { attemptId: 'safe-attempt' } },
] satisfies StartupRoute[])('does not put $name inside authenticated chrome', async (route) => {
  const view = renderApp(route);
  await waitFor(() => expect(rootNavigation.isReady()).toBe(true));
  expect(view.queryByTestId('authenticated-header')).toBeNull();
});

it('keeps NAV visible, exposes exactly Home and allows only one open menu', async () => {
  const view = renderApp();
  await view.findByText(identity.displayName);
  expect(authenticatedNavItems.map((item) => item.label)).toEqual(['Home']);
  const nav = view.getByRole('button', { name: 'Nav' });
  expect(view.getByText('NAV')).toBeTruthy();
  fireEvent.press(nav);
  expect(nav.props.accessibilityState.expanded).toBe(true);
  expect(StyleSheet.flatten(view.getByRole('button', { name: 'Home' }).props.style).backgroundColor).toBeUndefined();
  expect(view.queryByTestId('menu-interaction-highlight', { includeHiddenElements: true })).toBeNull();
  for (const name of ['Profile', 'Customize Profile', 'Messages', 'Board', 'Discover', 'Network', 'Opportunities', 'Notifications', 'Search', 'Create']) {
    expect(view.queryByText(name)).toBeNull();
  }
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  expect(view.queryByTestId('authenticated-nav-menu')).toBeNull();
  expect(view.getByTestId('authenticated-account-menu')).toBeTruthy();
  fireEvent.press(nav);
  expect(view.queryByTestId('authenticated-account-menu')).toBeNull();
  fireEvent.press(view.getByTestId('menu-outside-dismiss'));
  expect(nav.props.accessibilityState.expanded).toBe(false);
});

it.each(cases)('shows %s as %s account identity with the presentation label %s', async (persona, _home, label) => {
  identity.persona = persona;
  identity.profileImage = { mediaId: 'image', url: 'https://example.test/image.jpg', mimeType: 'image/jpeg' };
  const view = renderApp();
  await view.findByText(identity.displayName);
  const icon = view.getByTestId('account-trigger-icon', { includeHiddenElements: true });
  expect(StyleSheet.flatten(icon.props.style)).toMatchObject({ width: 44, height: 44, borderRadius: 3 });
  const glyph = view.getByTestId('account-icon-glyph', { includeHiddenElements: true });
  if (persona === 'MUSICIAN') {
    expect(glyph.props.stroke.brushRef).toMatch(/^account-accent-/);
    const gradient = icon.findByProps({ name: glyph.props.stroke.brushRef });
    expect(gradient.props.gradient).toEqual([0, Number(processColor('#0ea5e9')) | 0, 1, Number(processColor('#8b5cf6')) | 0]);
  } else expect(glyph.props.stroke).toEqual({ type: 0, payload: processColor(persona === 'VENUE' ? '#8b5cf6' : '#0ea5e9') });
  expect(view.queryByTestId('account-trigger-image')).toBeNull();
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  const image = view.getByTestId('account-menu-image');
  expect(image.props.resizeMode).toBe('cover');
  expect(StyleSheet.flatten(image.props.style)).toMatchObject({ width: 48, height: 48 });
  expect(StyleSheet.flatten(image.props.style).borderRadius).toBeUndefined();
  fireEvent(image, 'error');
  expect(view.getByTestId('account-menu-initials', { includeHiddenElements: true })).toBeTruthy();
  expect(view.queryByTestId('account-menu-image')).toBeNull();
  expect(view.getAllByText(label)).toHaveLength(1); // The page is hidden from accessibility while its menu is open.
  expect(view.queryByText('MUSICIAN')).toBeNull();
  expect(view.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
});

it.each(['loading', 'error'] as const)('keeps Account and real explicit Sign Out usable during /me %s', async (state) => {
  const pending = deferred<{ data: SelfAccountResponse }>();
  client.defaults.adapter = async (config) => {
    if (state === 'error') throw new AxiosError('temporarily unavailable', undefined, config, undefined,
      { data: {}, status: 503, statusText: 'Unavailable', headers: {}, config });
    return { ...await pending.promise, status: 200, statusText: 'OK', headers: {}, config };
  };
  const view = renderApp();
  await waitFor(() => expect(rootNavigation.isReady()).toBe(true));
  if (state === 'error') await waitFor(() => expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).status).toBe('rejected'));
  expect(view.getByTestId('account-trigger-icon', { includeHiddenElements: true })).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  expect(view.getByTestId('account-menu-neutral', { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByRole('button', { name: 'Sign Out' })).toBeTruthy();
  fireEvent.press(view.getByRole('button', { name: 'Sign Out' }));
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe('Login'));
  expect(view.queryByTestId('authenticated-header')).toBeNull();
  expect(view.queryByText('Your session expired. Sign in again to continue.')).toBeNull();
  expect(rootNavigation.canGoBack()).toBe(false);
  await waitFor(() => expect(authTransport.logout).toHaveBeenCalledTimes(1));
  expect(sessionController.getSnapshot().exitReason).toBe('EXPLICIT_SIGN_OUT');
  expect(sessionController.getAccessToken()).toBeUndefined();
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data).toBeUndefined();
  if (state === 'loading') await act(async () => { pending.resolve({ data: identity }); });
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data).toBeUndefined();
});

it('clears loaded /me cache and nested navigation on explicit Sign Out', async () => {
  const view = renderApp();
  await view.findByText(identity.displayName);
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data?.id).toBe(identity.id);
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  fireEvent.press(view.getByRole('button', { name: 'Sign Out' }));
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe('Login'));
  expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).data).toBeUndefined();
  expect(rootNavigation.getRootState().routes.map((route) => route.name)).toEqual(['Login']);
  expect(rootNavigation.canGoBack()).toBe(false);
  expect(view.queryByText(/Your session expired/)).toBeNull();
});

it('global expiry leaves the nested branch and Login consumes its notice once', async () => {
  const view = renderApp(); await view.findByText(identity.displayName);
  fireEvent.press(view.getByRole('button', { name: 'Nav' }));
  await act(async () => { await sessionController.expire(sessionController.getGeneration()); });
  expect(rootNavigation.getRootState().routes.map((route) => route.name)).toEqual(['Login']);
  expect(rootNavigation.canGoBack()).toBe(false);
  expect(view.queryByTestId('authenticated-header')).toBeNull();
  expect(view.getAllByText('Your session expired. Sign in again to continue.')).toHaveLength(1);
  expect(rootNavigation.getCurrentRoute()?.params).toEqual({ sessionNotice: undefined });
});

it('native Back dismisses an open menu and removes its listener on close', async () => {
  const remove = jest.fn(); let handleBack: (() => boolean | null | undefined) | undefined;
  const view = renderApp(); await view.findByText(identity.displayName);
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => { handleBack = handler; return { remove }; });
  fireEvent.press(view.getByRole('button', { name: 'Nav' }));
  act(() => { expect(handleBack?.()).toBe(true); });
  expect(view.queryByTestId('authenticated-nav-menu')).toBeNull();
  expect(remove).toHaveBeenCalled(); expect(rootNavigation.getCurrentRoute()?.name).toBe('ArtistHome');
});

it.each(['logo', 'menu'])('%s Home returns from another child without rebuilding the shell', async (control) => {
  const view = renderApp(); await view.findByText(identity.displayName);
  const shellKey = rootNavigation.getRootState().routes[0].key;
  fireEvent.press(view.getByRole('button', { name: 'Nav' }));
  act(() => rootNavigation.navigate('AuthenticatedApp', { screen: 'VenueHome' }));
  await waitFor(() => expect(view.queryByTestId('authenticated-nav-menu')).toBeNull());
  if (control === 'logo') fireEvent.press(view.getByRole('button', { name: 'MVPConnect Home' }));
  else {
    fireEvent.press(view.getByRole('button', { name: 'Nav' }));
    fireEvent.press(view.getByRole('button', { name: 'Home' }));
  }
  await waitFor(() => expect(rootNavigation.getCurrentRoute()?.name).toBe('ArtistHome'));
  expect(rootNavigation.getRootState().routes[0].key).toBe(shellKey);
  expect(view.getAllByTestId('authenticated-header')).toHaveLength(1);
});

it.each([320, 767, 768, 1024, 1199, 1200, 1440])('keeps all header controls and divider on the shared rail at width %s', async (width) => {
  setWidth(width); identity.displayName = 'A very long display name '.repeat(12);
  const view = renderApp();
  await waitFor(() => expect(onboardingApi.endpoints.getSelfAccount.select()(store.getState()).isSuccess).toBe(true));
  expect(view.getByTestId('account-trigger-icon', { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByRole('button', { name: 'MVPConnect Home' })).toBeTruthy();
  expect(view.getByRole('button', { name: 'Nav' })).toBeTruthy();
  expect(view.getByRole('button', { name: 'Account' })).toBeTruthy();
  expect(StyleSheet.flatten(view.getByLabelText('MVPConnect', { includeHiddenElements: true }).props.style))
    .toMatchObject({ width: width < 768 ? 152 : 184, height: width < 768 ? 32 : 39 });
  expect(StyleSheet.flatten(view.getByTestId('authenticated-header').props.style).paddingTop).toBe(44);
  expect(StyleSheet.flatten(view.getByTestId('authenticated-header-row').props.style).height).toBe(width < 768 ? 64 : 72);
  const homeStyle = StyleSheet.flatten(view.getByTestId('home-scroll-view').props.contentContainerStyle);
  expect(homeStyle.paddingTop).toBe(width < 768 ? 20 : 32);
  expect(homeStyle.paddingBottom).toBe(50);
  expect(StyleSheet.flatten(view.getByTestId('authenticated-header').props.style).paddingHorizontal).toBe(homeStyle.paddingHorizontal);
  const header = StyleSheet.flatten(view.getByTestId('authenticated-header').props.style);
  expect(header).toMatchObject({ width: '100%', backgroundColor: '#0c0e13', paddingHorizontal: appHorizontalPadding(width) });
  expect(header.borderBottomWidth).toBeUndefined();
  expect(header.maxWidth).toBeUndefined();
  const rail = view.getByTestId('authenticated-header-rail');
  expect(StyleSheet.flatten(rail.props.style)).toMatchObject({ width: '100%', maxWidth: APP_CONTENT_MAX_WIDTH, alignSelf: 'center' });
  expect(rail.findByProps({ testID: 'authenticated-header-row' })).toBeTruthy();
  const divider = rail.findByProps({ testID: 'authenticated-header-divider' });
  expect(StyleSheet.flatten(divider.props.style)).toEqual({ height: 1, backgroundColor: '#2b303a' });
  expect(StyleSheet.flatten(view.getByRole('button', { name: 'Account' }).props.style).minHeight).toBe(48);
  if (width < 768) expect(view.queryByTestId('account-trigger-name')).toBeNull();
  else expect(view.getByTestId('account-trigger-name').props.numberOfLines).toBe(1);
  fireEvent.press(view.getByRole('button', { name: 'Account' }));
  expect(view.getAllByText(identity.displayName).some((name) => name.props.numberOfLines === 2)).toBe(true);
  expect(view.queryByLabelText(/hamburger/i)).toBeNull();
});
