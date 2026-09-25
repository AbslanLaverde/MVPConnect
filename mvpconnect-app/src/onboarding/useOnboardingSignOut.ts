import { useCallback, useEffect, useRef, useState } from 'react';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { sessionController } from '../auth/session';

export interface OnboardingSignOutController {
  signingOut: boolean;
  discardConfirmationVisible: boolean;
  errorMessage?: string;
  requestSignOut: () => void;
  keepEditing: () => void;
  confirmDiscardAndSignOut: () => void;
  isSignOutPending: () => boolean;
}

interface UseOnboardingSignOutOptions {
  navigation: StackNavigationProp<RootStackParamList, 'Onboarding'>;
  dirty: boolean;
  valid: boolean;
  persistenceBusy: boolean;
  flushValidDraft: () => Promise<boolean>;
}

const waitForNextPersistenceCheck = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 25));

export const useOnboardingSignOut = ({
  dirty,
  valid,
  persistenceBusy,
  flushValidDraft,
}: UseOnboardingSignOutOptions): OnboardingSignOutController => {
  const [signingOut, setSigningOut] = useState(false);
  const [discardConfirmationVisible, setDiscardConfirmationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const operationActive = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ dirty, valid, persistenceBusy, flushValidDraft });
  latest.current = { dirty, valid, persistenceBusy, flushValidDraft };

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const waitForPersistence = useCallback(async () => {
    while (mounted.current && latest.current.persistenceBusy) {
      await waitForNextPersistenceCheck();
    }
    return mounted.current;
  }, []);

  const performSignOut = useCallback(async (discardInvalidChanges: boolean) => {
    if (operationActive.current) return;
    operationActive.current = true;
    setSigningOut(true);
    setDiscardConfirmationVisible(false);
    setErrorMessage(undefined);

    try {
      if (!(await waitForPersistence())) return;

      if (!discardInvalidChanges && latest.current.dirty) {
        if (!latest.current.valid) {
          setDiscardConfirmationVisible(true);
          return;
        }
        if (!(await latest.current.flushValidDraft())) return;
      }

      if (!mounted.current) return;
      await sessionController.signOut();
    } catch {
      if (mounted.current) {
        setErrorMessage("WE COULDN'T SIGN YOU OUT. PLEASE TRY AGAIN.");
      }
    } finally {
      operationActive.current = false;
      if (mounted.current) setSigningOut(false);
    }
  }, [waitForPersistence]);

  const requestSignOut = useCallback(() => {
    if (operationActive.current || discardConfirmationVisible) return;
    setErrorMessage(undefined);
    if (latest.current.dirty && !latest.current.valid) {
      setDiscardConfirmationVisible(true);
      return;
    }
    void performSignOut(false);
  }, [discardConfirmationVisible, performSignOut]);

  const keepEditing = useCallback(() => {
    if (operationActive.current) return;
    setDiscardConfirmationVisible(false);
  }, []);

  const confirmDiscardAndSignOut = useCallback(() => {
    void performSignOut(true);
  }, [performSignOut]);

  const isSignOutPending = useCallback(() => operationActive.current, []);

  return {
    signingOut,
    discardConfirmationVisible,
    errorMessage,
    requestSignOut,
    keepEditing,
    confirmDiscardAndSignOut,
    isSignOutPending,
  };
};
