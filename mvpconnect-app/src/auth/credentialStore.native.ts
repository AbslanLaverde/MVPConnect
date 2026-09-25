import * as SecureStore from 'expo-secure-store';
import type { NativeCredentialStore } from './authTypes';

const KEY = 'mvpconnect.refresh-credential.v1';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const credentialStore: NativeCredentialStore = {
  kind: 'native',
  getRefreshCredential: () => SecureStore.getItemAsync(KEY, options),
  setRefreshCredential: (value) => SecureStore.setItemAsync(KEY, value, options),
  clearRefreshCredential: () => SecureStore.deleteItemAsync(KEY, options),
};
