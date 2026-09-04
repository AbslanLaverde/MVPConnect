import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export interface SelectionOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectChipsProps {
  label: string;
  options: readonly SelectionOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  accessibilityLabel?: string;
}

export const DEFAULT_SELECT_CHIP_LIMIT = 5;

export const SelectChips: React.FC<SelectChipsProps> = ({
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
}) => {
  const limitReached = value.length >= maxSelections;

  const toggle = (option: SelectionOption) => {
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
      error={error}
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
                selected && fieldStyles.chipSelected,
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
