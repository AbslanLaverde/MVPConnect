import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  externalConnectionService,
  parseOAuthReturnParameters,
  type ParsedOAuthReturn,
} from '../services/externalConnectionService';
import { theme } from '../theme/theme';

type Props = StackScreenProps<RootStackParamList, 'OAuthResult'>;
type ResultState = 'LOADING' | 'SUCCEEDED' | 'FAILED' | 'INVALID';

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const OAuthResultScreen: React.FC<Props> = ({ navigation, route }) => {
  const parsed = parseOAuthReturnParameters((route.params ?? {}) as Record<string, unknown>);
  const [resultState, setResultState] = useState<ResultState>(parsed ? 'LOADING' : 'INVALID');
  const [provider, setProvider] = useState<ParsedOAuthReturn['provider'] | undefined>(parsed?.provider);

  const returnToMedia = () => navigation.replace('Onboarding', { persona: 'artist', step: 'media' });

  useEffect(() => {
    if (!parsed) return undefined;
    let active = true;
    let autoReturnTimer: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      let resolvedState: ResultState = parsed.status;
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const current = await externalConnectionService.status(parsed.attemptId);
          if (current.status !== 'PENDING') {
            resolvedState = current.status;
            break;
          }
          await wait(500);
        }
        await externalConnectionService.list();
      } catch {
        resolvedState = 'FAILED';
      }
      if (!active) return;
      setProvider(parsed.provider);
      setResultState(resolvedState === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED');
      autoReturnTimer = setTimeout(() => {
        if (active) returnToMedia();
      }, 1200);
    })();
    return () => {
      active = false;
      if (autoReturnTimer) clearTimeout(autoReturnTimer);
    };
  }, [parsed?.attemptId, parsed?.provider, parsed?.status]);

  const heading = resultState === 'LOADING'
    ? 'FINISHING CONNECTION…'
    : resultState === 'SUCCEEDED'
      ? `${provider ?? 'PROVIDER'} CONNECTED.`
      : resultState === 'INVALID'
        ? 'INVALID OAUTH RETURN.'
        : `${provider ?? 'PROVIDER'} CONNECTION FAILED.`;
  const body = resultState === 'LOADING'
    ? 'Confirming your account connection with MVPConnect.'
    : resultState === 'SUCCEEDED'
      ? 'Your Media step will refresh with the connected account.'
      : 'No provider code or token was accepted by this page. Return to Media to try again.';

  return (
    <View style={screenStyles.page} accessibilityRole="alert">
      <View style={screenStyles.panel}>
        <Text style={screenStyles.eyebrow}>MVPConnect / MEDIA</Text>
        <Text style={screenStyles.heading}>{heading}</Text>
        <View style={screenStyles.rule} />
        <Text style={screenStyles.body}>{body}</Text>
        {resultState !== 'LOADING' ? (
          <TouchableOpacity
            style={screenStyles.action}
            onPress={returnToMedia}
            accessibilityRole="button"
            accessibilityLabel="Return to Artist Media"
          >
            <Text style={screenStyles.actionText}>RETURN TO MEDIA →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const screenStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 620,
    borderWidth: 1,
    borderColor: theme.colors.strongBorder,
    backgroundColor: theme.colors.elevatedSurface,
    padding: theme.spacing.xl,
  },
  eyebrow: {
    color: theme.colors.brandBlue,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  heading: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayExtraBold,
    fontSize: 38,
    lineHeight: 38,
    marginTop: theme.spacing.md,
  },
  rule: { width: 64, height: 3, backgroundColor: theme.colors.brandViolet, marginVertical: theme.spacing.md },
  body: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 22,
  },
  action: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  actionText: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
