import { resetToLogin } from '../navigation/rootNavigation';
import type { ExitReason } from './authTypes';

// Registered by store.ts after store creation; avoids a store -> API -> session -> store cycle.
let resetCache = () => {};
export const registerSessionCacheReset = (reset: () => void): void => { resetCache = reset; };
export const resetSessionCache = (): void => resetCache();
export const navigateAfterSessionExit = (reason: ExitReason): void => resetToLogin(reason);
