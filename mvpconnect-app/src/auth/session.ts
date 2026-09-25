import { authTransport } from './authTransport';
import { credentialStore } from './credentialStore';
import { clearLegacyAuth } from './legacyStorage';
import { SessionController } from './sessionController';
import { navigateAfterSessionExit, resetSessionCache } from './sessionExit';
import { runtimeCoordination } from './webCoordination';

export const sessionController = new SessionController({
  transport: authTransport, credentials: credentialStore, coordination: runtimeCoordination(),
  clearLegacy: clearLegacyAuth, resetCache: resetSessionCache, onExit: navigateAfterSessionExit,
});
