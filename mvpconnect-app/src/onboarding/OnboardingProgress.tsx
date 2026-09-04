import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { configuredStepFor } from './onboardingConfig';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import type { OnboardingState, OnboardingStep } from './onboardingTypes';
import { OnboardingAccentFill } from './OnboardingAccent';
import { styles } from './OnboardingShell.styles';

interface OnboardingProgressProps {
  state: OnboardingState;
  activeStep: OnboardingStep;
  config: OnboardingPersonaConfig;
  mobile: boolean;
  allowPlaceholderNavigation?: boolean;
  onSelect: (stepKey: string) => void;
}

const markerText = (step: OnboardingStep, active: boolean) => {
  if (step.status === 'COMPLETE') return '✓';
  if (step.status === 'SKIPPED') return '–';
  if (active) return '●';
  if (step.status === 'IN_PROGRESS') return '!';
  return '○';
};

const stateLabel = (step: OnboardingStep, active: boolean) => {
  if (active) return 'current step';
  if (step.status === 'COMPLETE') return 'complete';
  if (step.status === 'SKIPPED') return 'skipped';
  if (step.status === 'IN_PROGRESS') return 'incomplete';
  return 'not started';
};

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  state,
  activeStep,
  config,
  mobile,
  allowPlaceholderNavigation = false,
  onSelect,
}) => {
  const orderedSteps = [...state.steps].sort((left, right) => left.position - right.position);
  const activeConfig = configuredStepFor(config.persona, activeStep.key);

  if (mobile) {
    return (
      <View style={styles.progressMobile}>
        <Text
          style={styles.progressAnnouncement}
          accessibilityRole="text"
          accessibilityLabel={`${activeConfig?.label ?? activeStep.key}, step ${activeStep.position} of ${orderedSteps.length}`}
        >
          {`Step ${activeStep.position} of ${orderedSteps.length}`}
        </Text>
        <View style={styles.progressMobileCopy}>
          <Text style={[styles.progressCount, { color: config.accentStart }]}>
            {`${String(activeStep.position).padStart(2, '0')} / ${String(orderedSteps.length).padStart(2, '0')}`}
          </Text>
          <Text style={styles.progressCurrentLabel}>{activeConfig?.label ?? activeStep.key}</Text>
        </View>
        <View style={styles.progressSegments}>
          {orderedSteps.map((step) => {
            const active = step.key === activeStep.key;
            const locallyVisited = allowPlaceholderNavigation && step.position < activeStep.position;
            const unlocked = active || locallyVisited || step.status === 'COMPLETE' || step.status === 'SKIPPED';
            const filled = unlocked || step.status === 'IN_PROGRESS';
            return (
              <TouchableOpacity
                key={step.key}
                style={styles.progressSegmentButton}
                disabled={!unlocked || active}
                onPress={() => onSelect(step.key)}
                accessibilityRole="button"
                accessibilityLabel={`${configuredStepFor(config.persona, step.key)?.label ?? step.key}, ${stateLabel(step, active)}`}
                accessibilityState={{ disabled: !unlocked || active, selected: active }}
              >
                <Text style={styles.progressSegmentState}>{markerText(step, active)}</Text>
                <View style={[styles.progressSegment, !filled && styles.progressSegmentFuture]}>
                  {filled ? <OnboardingAccentFill config={config} style={styles.accentFill} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.progressDesktop}>
      <Text
        style={styles.progressAnnouncement}
        accessibilityRole="text"
        accessibilityLabel={`Step ${activeStep.position} of ${orderedSteps.length}`}
      >
        {`Step ${activeStep.position} of ${orderedSteps.length}`}
      </Text>
      {orderedSteps.map((step, index) => {
        const active = step.key === activeStep.key;
        const locallyVisited = allowPlaceholderNavigation && step.position < activeStep.position;
        const unlocked = active || locallyVisited || step.status === 'COMPLETE' || step.status === 'SKIPPED';
        return (
          <React.Fragment key={step.key}>
            {index > 0 ? <View style={styles.progressConnector} /> : null}
            <TouchableOpacity
              style={styles.progressStep}
              disabled={!unlocked || active}
              onPress={() => onSelect(step.key)}
              accessibilityRole="button"
              accessibilityLabel={`${configuredStepFor(config.persona, step.key)?.label ?? step.key}, ${stateLabel(step, active)}`}
              accessibilityState={{ disabled: !unlocked || active, selected: active }}
            >
              <Text style={[styles.progressNumber, active && { color: config.accentStart }]}>
                {String(step.position).padStart(2, '0')}
              </Text>
              <View
                style={[
                  styles.progressMarker,
                  unlocked && { borderColor: config.accentStart },
                  step.status === 'SKIPPED' && styles.progressMarkerSkipped,
                ]}
              >
                {active || step.status === 'COMPLETE' ? (
                  <OnboardingAccentFill config={config} style={styles.markerAccentFill} />
                ) : null}
                <Text style={[styles.progressMarkerText, (active || step.status === 'COMPLETE') && styles.progressMarkerTextStrong]}>
                  {markerText(step, active)}
                </Text>
              </View>
              <Text style={[styles.progressLabel, active && styles.progressLabelActive]} numberOfLines={1}>
                {configuredStepFor(config.persona, step.key)?.label ?? step.key.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};
