import AsyncStorage from '@react-native-async-storage/async-storage';

// Transitional deletion only. No code reads or writes legacy bearer tokens or persona hints.
export const clearLegacyAuth = async (): Promise<void> => {
  await AsyncStorage.multiRemove(['authToken', 'userType']);
};
