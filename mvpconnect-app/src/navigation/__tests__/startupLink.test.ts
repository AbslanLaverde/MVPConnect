import { Linking } from 'react-native';
import { captureStartupLink, parseStartupLink } from '../startupLink';

jest.mock('../../services/api', () => ({ __esModule: true, default: {} }));
jest.mock('../../auth/session', () => ({ sessionController: {} }));

const params = 'attemptId=attempt-1&provider=YOUTUBE&status=SUCCEEDED';
it('validates Native and same-origin Web OAuth returns with the existing parser', () => {
  const intent = { oauth: { attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED' } };
  expect(parseStartupLink(`mvpconnect://oauth/result?${params}`)).toEqual(intent);
  expect(parseStartupLink(`https://app.example.test/oauth/result?${params}`, 'https://app.example.test')).toEqual(intent);
});
it.each(['&code=secret', '&refresh_token=secret', '&extra=value', '&provider=INVALID'])('rejects unsafe OAuth return %s', (suffix) => {
  expect(parseStartupLink(`mvpconnect://oauth/result?${params}${suffix}`)).toBeNull();
});
it('rejects foreign origins and keeps deferred Home/Profile URLs outside startup scope', () => {
  expect(parseStartupLink(`https://foreign.example.test/oauth/result?${params}`, 'https://app.example.test')).toBeNull();
  expect(parseStartupLink('mvpconnect://ArtistHome')).toBeNull();
  expect(parseStartupLink('mvpconnect://Profile/artist')).toBeNull();
  // Workflow, not an untrusted cold URL, selects onboarding step or completed Home.
  expect(parseStartupLink('mvpconnect://onboarding/artist/goals')).toBeNull();
  expect(parseStartupLink('mvpconnect://welcome')).toBeNull();
});
it.each([
  ['login', 'Login'], ['signup', 'Signup'], ['signup/artist', 'SignupArtist'],
  ['signup/venue', 'SignupVenue'], ['signup/promoter', 'SignupPromoter'],
])('preserves cold %s auth linking', (path, auth) => {
  expect(parseStartupLink(`mvpconnect://${path}`)).toEqual({ auth });
});
it('captures the Native cold link before navigation mounts', async () => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValueOnce(`mvpconnect://oauth/result?${params}`);
  expect(await captureStartupLink()).toMatchObject({ oauth: { attemptId: 'attempt-1' } });
  jest.restoreAllMocks();
});
