import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';

interface OnboardingFooterProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  canContinue: boolean;
  busy: boolean;
  backDisabled: boolean;
  showBack: boolean;
  showSkip: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  continueLabel?: string;
  savingLabel?: string;
  continueAccessibilityLabel?: string;
  savingAccessibilityLabel?: string;
}

const ContinueButton = ({
  config,
  disabled,
  saving,
  fullWidth = false,
  onPress,
  label = 'CONTINUE →',
  savingLabel = 'SAVING…',
  accessibilityLabel = 'Continue to the next onboarding step',
  savingAccessibilityLabel = 'Saving onboarding step',
}: {
  config: OnboardingPersonaConfig;
  disabled: boolean;
  saving: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  label?: string;
  savingLabel?: string;
  accessibilityLabel?: string;
  savingAccessibilityLabel?: string;
}) => (
  <TouchableOpacity
    style={[
      styles.continueButton,
      fullWidth && styles.continueButtonMobile,
      disabled && styles.actionDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={saving ? savingAccessibilityLabel : accessibilityLabel}
    accessibilityState={{ disabled, busy: saving }}
  >
    <OnboardingAccentFill config={config} style={styles.accentFill} />
    <Text style={styles.continueButtonText}>{saving ? savingLabel : label}</Text>
  </TouchableOpacity>
);

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  config,
  mobile,
  canContinue,
  busy,
  backDisabled,
  showBack,
  showSkip,
  onBack,
  onContinue,
  onSkip,
  continueLabel,
  savingLabel,
  continueAccessibilityLabel,
  savingAccessibilityLabel,
}) => {
  const secondaryActions = (
    <View style={[styles.secondaryActions, !mobile && styles.secondaryActionsDesktop]}>
      {showBack ? (
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onBack}
          disabled={backDisabled}
          accessibilityRole="button"
          accessibilityLabel="Go back to the previous onboarding step"
          accessibilityState={{ disabled: backDisabled }}
        >
          <Text style={styles.secondaryActionText}>← BACK</Text>
        </TouchableOpacity>
      ) : <View style={styles.secondaryAction} />}
      {showSkip ? (
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onSkip}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Skip this optional step for now"
          accessibilityState={{ disabled: busy }}
        >
          <Text style={[styles.secondaryActionText, { color: config.accentEnd ?? config.accentStart }]}>
            SKIP FOR NOW
          </Text>
        </TouchableOpacity>
      ) : <View style={styles.secondaryAction} />}
    </View>
  );

  if (mobile) {
    return (
      <View style={styles.footerMobile}>
        <ContinueButton
          config={config}
          disabled={!canContinue || busy}
          saving={busy}
          fullWidth
          onPress={onContinue}
          label={continueLabel}
          savingLabel={savingLabel}
          accessibilityLabel={continueAccessibilityLabel}
          savingAccessibilityLabel={savingAccessibilityLabel}
        />
        {secondaryActions}
      </View>
    );
  }

  return (
    <View style={styles.footerDesktop}>
      {secondaryActions}
      <ContinueButton
        config={config}
        disabled={!canContinue || busy}
        saving={busy}
        onPress={onContinue}
        label={continueLabel}
        savingLabel={savingLabel}
        accessibilityLabel={continueAccessibilityLabel}
        savingAccessibilityLabel={savingAccessibilityLabel}
      />
    </View>
  );
};
