import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';
import type { OnboardingSignOutController } from './useOnboardingSignOut';

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
  signOut: OnboardingSignOutController;
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
    testID="onboarding-primary-action"
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
  signOut,
  continueLabel,
  savingLabel,
  continueAccessibilityLabel,
  savingAccessibilityLabel,
}) => {
  const actionsBusy = busy || signOut.signingOut;
  const signOutAction = (
    <TouchableOpacity
      style={[styles.signOutAction, signOut.signingOut && styles.actionDisabled]}
      onPress={signOut.requestSignOut}
      disabled={signOut.signingOut}
      accessibilityRole="button"
      accessibilityLabel={signOut.signingOut ? 'Signing out' : 'Sign out'}
      accessibilityState={{ disabled: signOut.signingOut, busy: signOut.signingOut }}
      testID="onboarding-sign-out-action"
    >
      <Text style={styles.signOutActionText}>
        {signOut.signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
      </Text>
    </TouchableOpacity>
  );

  const secondaryActions = (
    <View
      style={[styles.secondaryActions, !mobile && styles.secondaryActionsDesktop]}
      testID="onboarding-secondary-actions"
    >
      {showBack ? (
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onBack}
          disabled={backDisabled || signOut.signingOut}
          accessibilityRole="button"
          accessibilityLabel="Go back to the previous onboarding step"
          accessibilityState={{ disabled: backDisabled || signOut.signingOut }}
        >
          <Text style={styles.secondaryActionText}>← BACK</Text>
        </TouchableOpacity>
      ) : <View style={styles.secondaryAction} />}
      {showSkip ? (
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onSkip}
          disabled={actionsBusy}
          accessibilityRole="button"
          accessibilityLabel="Skip this optional step for now"
          accessibilityState={{ disabled: actionsBusy }}
        >
          <Text style={[styles.secondaryActionText, { color: config.accentEnd ?? config.accentStart }]}>
            SKIP FOR NOW
          </Text>
        </TouchableOpacity>
      ) : <View style={styles.secondaryAction} />}
    </View>
  );

  const discardDialog = (
    <Modal
      visible={signOut.discardConfirmationVisible}
      transparent
      animationType="fade"
      onRequestClose={signOut.keepEditing}
    >
      <View style={styles.signOutDialogBackdrop}>
        <View
          style={styles.signOutDialog}
          accessibilityRole="alert"
          accessibilityLabel="Discard unsaved changes confirmation"
        >
          <Text style={styles.signOutDialogTitle}>DISCARD UNSAVED CHANGES?</Text>
          <Text style={styles.signOutDialogBody}>
            Some changes on this screen haven't been saved. Sign out and discard them?
          </Text>
          <View style={styles.signOutDialogActions}>
            <TouchableOpacity
              style={styles.signOutDialogPrimaryAction}
              onPress={signOut.keepEditing}
              accessibilityRole="button"
              accessibilityLabel="Keep editing"
            >
              <Text style={styles.signOutDialogPrimaryText}>KEEP EDITING</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signOutDialogSecondaryAction}
              onPress={signOut.confirmDiscardAndSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out and discard unsaved changes"
            >
              <Text style={styles.signOutDialogSecondaryText}>SIGN OUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (mobile) {
    return (
      <View style={styles.footerMobile} testID="onboarding-footer-mobile">
        <ContinueButton
          config={config}
          disabled={!canContinue || actionsBusy}
          saving={busy}
          fullWidth
          onPress={onContinue}
          label={continueLabel}
          savingLabel={savingLabel}
          accessibilityLabel={continueAccessibilityLabel}
          savingAccessibilityLabel={savingAccessibilityLabel}
        />
        <View style={styles.signOutActionMobile}>{signOutAction}</View>
        {secondaryActions}
        {signOut.errorMessage ? (
          <View style={styles.errorPanel} accessibilityRole="alert">
            <Text style={styles.errorTitle}>{signOut.errorMessage}</Text>
          </View>
        ) : null}
        {discardDialog}
      </View>
    );
  }

  return (
    <View testID="onboarding-footer-desktop">
      <View style={styles.footerDesktop}>
        <View style={styles.footerDesktopSecondaryArea}>
          {signOutAction}
          {secondaryActions}
        </View>
        <ContinueButton
          config={config}
          disabled={!canContinue || actionsBusy}
          saving={busy}
          onPress={onContinue}
          label={continueLabel}
          savingLabel={savingLabel}
          accessibilityLabel={continueAccessibilityLabel}
          savingAccessibilityLabel={savingAccessibilityLabel}
        />
      </View>
      {signOut.errorMessage ? (
        <View style={styles.errorPanel} accessibilityRole="alert">
          <Text style={styles.errorTitle}>{signOut.errorMessage}</Text>
        </View>
      ) : null}
      {discardDialog}
    </View>
  );
};
