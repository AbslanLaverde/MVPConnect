// TypeScript / native default. Metro selects .web.ts in the browser.
import { credentialStore as nativeStore } from './credentialStore.native';
import type { CredentialStore } from './authTypes';
export const credentialStore: CredentialStore = nativeStore;
