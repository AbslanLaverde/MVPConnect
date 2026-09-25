import { sessionController } from '../../auth/session';
jest.mock('../../auth/session', () => ({
  sessionController: { getGeneration: jest.fn(() => 1), isCurrent: jest.fn(() => true), subscribe: jest.fn(() => () => {}), signOut: jest.fn(), assertGeneration: jest.fn() },
}));
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { OAuthResultScreen } from '../OAuthResultScreen';
import { externalConnectionService } from '../../services/externalConnectionService';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('../../services/externalConnectionService', () => {
  const actual = jest.requireActual('../../services/externalConnectionService');
  return {
    ...actual,
    externalConnectionService: {
      ...actual.externalConnectionService,
      status: jest.fn(),
      list: jest.fn(),
    },
  };
});

const service = externalConnectionService as jest.Mocked<typeof externalConnectionService>;

describe('OAuthResultScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (sessionController.isCurrent as jest.Mock).mockReturnValue(true);
  });

  it('ignores a delayed OAuth result after session exit and cannot navigate back into onboarding', async () => {
    let finish!: (value: unknown) => void;
    service.status.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }) as any);
    const navigation = { replace: jest.fn() } as any;
    const screen = render(<OAuthResultScreen navigation={navigation} route={{ key: 'oauth', name: 'OAuthResult', params: {
      attemptId: 'delayed', provider: 'YOUTUBE', status: 'SUCCEEDED',
    } } as any} />);
    await waitFor(() => expect(service.status).toHaveBeenCalled());
    (sessionController.isCurrent as jest.Mock).mockReturnValue(false);
    await act(async () => {
      finish({ status: 'SUCCEEDED' });
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
    });
    expect(service.list).not.toHaveBeenCalled(); expect(navigation.replace).not.toHaveBeenCalled();
    screen.unmount();
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('confirms the opaque attempt, refreshes connections, and returns to Artist Media', async () => {
    service.status.mockResolvedValue({
      attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED',
      expiresAt: '2026-09-09T20:00:00', updatedAt: '2026-09-09T19:00:00',
    });
    service.list.mockResolvedValue([]);
    const navigation = { replace: jest.fn() } as any;
    const screen = render(<OAuthResultScreen
      navigation={navigation}
      route={{ key: 'OAuthResult', name: 'OAuthResult', params: {
        attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED',
      } } as any}
    />);

    await waitFor(() => expect(screen.getByText('YOUTUBE CONNECTED.')).toBeTruthy());
    expect(service.status).toHaveBeenCalledWith('attempt-1');
    expect(service.list).toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1200));
    expect(navigation.replace).toHaveBeenCalledWith('Onboarding', { persona: 'artist', step: 'media' });
  });

  it('rejects secret-like callback parameters without calling the backend', () => {
    const navigation = { replace: jest.fn() } as any;
    const screen = render(<OAuthResultScreen
      navigation={navigation}
      route={{ key: 'OAuthResult', name: 'OAuthResult', params: {
        attemptId: 'attempt-1', provider: 'YOUTUBE', status: 'SUCCEEDED', code: 'secret',
      } } as any}
    />);

    expect(screen.getByText('INVALID OAUTH RETURN.')).toBeTruthy();
    expect(service.status).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Return to Artist Media'));
    expect(navigation.replace).toHaveBeenCalledWith('Onboarding', { persona: 'artist', step: 'media' });
  });

  it('shows safe failure feedback and never renders provider secrets', async () => {
    service.status.mockResolvedValue({
      attemptId: 'attempt-2', provider: 'SOUNDCLOUD', status: 'FAILED', errorCode: 'PROVIDER_DENIED',
      expiresAt: '2026-09-09T20:00:00', updatedAt: '2026-09-09T19:00:00',
    });
    service.list.mockResolvedValue([]);
    const screen = render(<OAuthResultScreen
      navigation={{ replace: jest.fn() } as any}
      route={{ key: 'OAuthResult', name: 'OAuthResult', params: {
        attemptId: 'attempt-2', provider: 'SOUNDCLOUD', status: 'FAILED',
      } } as any}
    />);

    await waitFor(() => expect(screen.getByText('SOUNDCLOUD CONNECTION FAILED.')).toBeTruthy());
    expect(screen.queryByText(/access_token|refresh_token|code=/i)).toBeNull();
  });
});
