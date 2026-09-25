import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';
import type { ExitReason } from '../auth/authTypes';

export const rootNavigation = createNavigationContainerRef<RootStackParamList>();
let pendingExit: ExitReason | undefined;
export const flushSessionNavigation = (): void => {
  if (!pendingExit || !rootNavigation.isReady()) return;
  const reason = pendingExit;
  pendingExit = undefined;
  rootNavigation.resetRoot({ index: 0, routes: [{ name: 'Login',
    ...(reason === 'SESSION_EXPIRED' ? { params: { sessionNotice: 'SESSION_EXPIRED' as const } } : {}),
  }] });
};
export const resetToLogin = (reason: ExitReason): void => {
  pendingExit = reason;
  flushSessionNavigation();
};
