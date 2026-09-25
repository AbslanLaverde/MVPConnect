import React, { useEffect, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppNavigator } from '../navigation/AppNavigator';
import { captureStartupLink } from '../navigation/startupLink';
import { store } from '../store/store';
import { theme } from '../theme/theme';
import { sessionController } from './session';
import { SessionBootstrap } from './sessionBootstrap';
import { loadStartupEntry } from './startupEntry';

const startup = new SessionBootstrap({ session: sessionController, captureLink: captureStartupLink,
  loadEntry: () => loadStartupEntry(sessionController, store.dispatch) });

export function SessionStartupBoundary({ fontsReady, bootstrap = startup }: {
  fontsReady: boolean; bootstrap?: SessionBootstrap;
}) {
  const state = useSyncExternalStore(bootstrap.subscribe, bootstrap.getSnapshot, bootstrap.getSnapshot);
  useEffect(() => { void bootstrap.start(); }, [bootstrap]);
  if (fontsReady && 'route' in state) {
    return <AppNavigator initialRoute={state.route} onReady={bootstrap.release} />;
  }
  const retryable = state.status === 'ERROR_RETRYABLE';
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.brand} accessibilityRole="header">MVPConnect</Text>
        <View accessibilityLiveRegion="polite" accessibilityState={{ busy: !retryable }}>
          {!retryable && <ActivityIndicator color={theme.colors.brandBlue} accessibilityLabel="Restoring your session" />}
          <Text style={styles.message}>{retryable
            ? "We couldn't restore your session. Check your connection and try again."
            : 'Restoring your session…'}</Text>
        </View>
        {retryable && <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => { void bootstrap.start(); }} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={bootstrap.signOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </Pressable>
        </View>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.pageBg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 24 },
  brand: { color: theme.colors.brandWarmWhite, fontSize: 30, fontWeight: '700' },
  message: { color: theme.colors.mutedText, fontSize: 16, textAlign: 'center', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  button: { minHeight: 48, minWidth: 96, padding: 14, borderRadius: 8, backgroundColor: theme.colors.elevatedSurface },
  buttonText: { color: theme.colors.brandWarmWhite, fontSize: 16, textAlign: 'center' },
});
