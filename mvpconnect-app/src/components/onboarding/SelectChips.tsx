import React from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import type { TaxonomyOption } from '../../onboarding/taxonomy/types';
import { OnboardingAccentFill } from '../../onboarding/OnboardingAccent';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export interface SelectionOption<Value extends string = string> extends TaxonomyOption<Value> {
  disabled?: boolean;
}

export interface SelectChipsProps<Value extends string = string> {
  label: string;
  options: readonly SelectionOption<Value>[];
  value: readonly Value[];
  onChange: (value: Value[]) => void;
  maxSelections?: number;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  accessibilityLabel?: string;
  accentConfig?: OnboardingPersonaConfig;
  variant?: 'compact' | 'expressive';
  showCounter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const DEFAULT_SELECT_CHIP_LIMIT = 5;

export const SelectChips = <Value extends string,>({
  label,
  options,
  value,
  onChange,
  maxSelections = DEFAULT_SELECT_CHIP_LIMIT,
  required = false,
  optional = false,
  disabled = false,
  helperText,
  error,
  accessibilityLabel,
  accentConfig,
  variant = 'compact',
  showCounter = false,
  containerStyle,
}: SelectChipsProps<Value>) => {
  const limitReached = value.length >= maxSelections;

  const toggle = (option: SelectionOption<Value>) => {
    const selected = value.includes(option.value);
    if (disabled || option.disabled || (!selected && limitReached)) return;
    onChange(selected
      ? value.filter((candidate) => candidate !== option.value)
      : [...value, option.value]);
  };

  return (
    <FieldFrame
      label={label}
      required={required}
      optional={optional}
      helperText={helperText}
      helperBefore
      error={error}
      containerStyle={containerStyle}
      headerAccessory={showCounter ? (
        <Text
          testID={`${label}-selection-count`}
          style={fieldStyles.selectionCounter}
          accessibilityLabel={`${value.length} of ${maxSelections} selected`}
        >
          {`${value.length} / ${maxSelections}`}
        </Text>
      ) : undefined}
    >
      <View
        style={fieldStyles.optionsWrap}
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {options.map((option) => {
          const selected = value.includes(option.value);
          const unavailable = disabled || Boolean(option.disabled) || (!selected && limitReached);
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                fieldStyles.chip,
                variant === 'compact' ? fieldStyles.chipCompact : fieldStyles.chipExpressive,
                selected && fieldStyles.chipSelected,
                selected && accentConfig && { borderColor: accentConfig.accentStart },
                unavailable && fieldStyles.chipUnavailable,
              ]}
              onPress={() => toggle(option)}
              disabled={unavailable}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityHint={!selected && limitReached
                ? `Maximum of ${maxSelections} selections reached. Deselect another option first.`
                : undefined}
              accessibilityState={{ checked: selected, disabled: unavailable }}
            >
              {selected && accentConfig ? (
                <OnboardingAccentFill
                  config={accentConfig}
                  style={fieldStyles.chipAccentFill}
                  testID={`${label}-${option.value}-selected-accent`}
                />
              ) : null}
              <Text style={[fieldStyles.chipText, selected && fieldStyles.chipTextSelected]}>
                {selected ? `${option.label} ×` : option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {limitReached ? (
        <Text style={fieldStyles.limitText} accessibilityLiveRegion="polite">
          {`MAXIMUM ${maxSelections} SELECTED — DESELECT ONE TO CHANGE.`}
        </Text>
      ) : null}
    </FieldFrame>
  );
};
