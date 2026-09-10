import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { OnboardingAccentFill } from './OnboardingAccent';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import type { GoalCode, GoalsStepRequest } from './goalTypes';
import { GOALS_SUPPORT_COPY, GOAL_OPTIONS, toggleGoal } from './onboardingGoals';
import { goalsStyles } from './OnboardingGoals.styles';

interface OnboardingGoalsFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  data: GoalsStepRequest;
  error?: string;
  showError: boolean;
  disabled?: boolean;
  onChange: (data: GoalsStepRequest) => void;
}

export const OnboardingGoalsForm: React.FC<OnboardingGoalsFormProps> = ({
  config,
  mobile,
  position,
  totalSteps,
  stepLabel,
  data,
  error,
  showError,
  disabled = false,
  onChange,
}) => {
  const accent = config.accentEnd ?? config.accentStart;
  const twoColumns = config.persona === 'artist' && !mobile;
  const selectedGoals: readonly GoalCode[] = data.connectionGoals;

  return (
    <View testID={`onboarding-goals-${config.persona}`} style={goalsStyles.layout}>
      <View style={[goalsStyles.introRow, mobile && goalsStyles.introRowMobile]}>
        <View style={goalsStyles.introCopy}>
          <Text
            style={[goalsStyles.stepMeta, { color: config.accentStart }]}
            accessibilityLabel={`Step ${position} of ${totalSteps}, ${stepLabel}`}
          >
            {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
            <Text style={goalsStyles.stepLabel}>{stepLabel}</Text>
          </Text>
          <Text accessibilityRole="header" style={[goalsStyles.headline, mobile && goalsStyles.headlineMobile]}>
            WHAT'S NEXT?
          </Text>
          <View style={goalsStyles.headingRule}>
            <OnboardingAccentFill config={config} style={goalsStyles.accentFill} />
          </View>
          <Text style={goalsStyles.support}>{GOALS_SUPPORT_COPY[config.persona]}</Text>
        </View>
        <View style={[goalsStyles.reassurance, mobile && goalsStyles.reassuranceMobile]}>
          <Text accessibilityElementsHidden style={[goalsStyles.reassuranceIcon, { color: accent }]}>◎</Text>
          <View style={goalsStyles.reassuranceCopy}>
            <Text style={goalsStyles.reassuranceTitle}>Your goals guide your experience.</Text>
            <Text style={goalsStyles.reassuranceBody}>
              These help us understand what you want to accomplish so we can suggest the right people, places, and opportunities.
            </Text>
          </View>
        </View>
      </View>

      <View style={goalsStyles.goalsSection}>
        <View style={[goalsStyles.goalsBody, mobile && goalsStyles.goalsBodyMobile]}>
          <View style={[goalsStyles.sectionCopy, mobile && goalsStyles.sectionCopyMobile]}>
            <Text style={goalsStyles.sectionTitle}>SELECT YOUR GOALS</Text>
            <Text style={goalsStyles.sectionHelper}>Choose at least one. You can select as many as apply.</Text>
          </View>
          <View
            style={[goalsStyles.goalGrid, mobile && goalsStyles.goalGridMobile]}
            accessibilityRole="list"
            accessibilityLabel={`${config.label} goals`}
          >
            {GOAL_OPTIONS[config.persona].map((option) => {
              const selected = selectedGoals.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }: any) => [
                    goalsStyles.goalCard,
                    twoColumns && goalsStyles.goalCardHalf,
                    selected && goalsStyles.goalCardSelected,
                    selected && { borderColor: config.accentStart },
                    pressed && goalsStyles.goalCardPressed,
                  ] as any}
                  onPress={() => onChange(toggleGoal(data, option.value as GoalCode))}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityState={{ checked: selected, selected, disabled }}
                >
                  {selected ? <OnboardingAccentFill config={config} style={goalsStyles.selectedWash} /> : null}
                  <View style={[goalsStyles.goalSymbolRing, { borderColor: accent }]}>
                    <Text accessibilityElementsHidden style={[goalsStyles.goalSymbol, { color: accent }]}>
                      {option.symbol}
                    </Text>
                  </View>
                  <View style={goalsStyles.goalCopy}>
                    <Text style={goalsStyles.goalLabel}>{option.label}</Text>
                    <Text style={goalsStyles.goalDescription}>{option.description}</Text>
                  </View>
                  <View style={[goalsStyles.checkbox, selected && { borderColor: config.accentStart }]}>
                    {selected ? <OnboardingAccentFill config={config} style={goalsStyles.accentFill} /> : null}
                    <Text style={goalsStyles.checkboxMark}>{selected ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        {showError && error ? <Text accessibilityRole="alert" style={goalsStyles.error}>{error}</Text> : null}
      </View>
    </View>
  );
};
