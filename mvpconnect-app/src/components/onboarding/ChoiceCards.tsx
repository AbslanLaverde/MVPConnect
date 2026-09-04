import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export interface ChoiceCardOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ChoiceCardsProps {
  label: string;
  options: readonly ChoiceCardOption[];
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  orientation?: 'row' | 'column';
  accessibilityLabel?: string;
}

export const ChoiceCards: React.FC<ChoiceCardsProps> = ({
  label,
  options,
  value,
  onChange,
  required = false,
  optional = false,
  disabled = false,
  helperText,
  error,
  orientation = 'column',
  accessibilityLabel,
}) => (
  <FieldFrame
    label={label}
    required={required}
    optional={optional}
    helperText={helperText}
    error={error}
  >
    <View
      style={orientation === 'row' ? fieldStyles.choicesRow : fieldStyles.choicesColumn}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const unavailable = disabled || Boolean(option.disabled);
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              fieldStyles.choiceCard,
              orientation === 'row' && fieldStyles.choiceCardRow,
              selected && fieldStyles.choiceCardSelected,
              unavailable && fieldStyles.chipUnavailable,
            ]}
            onPress={() => onChange(option.value)}
            disabled={unavailable}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            accessibilityState={{ checked: selected, selected, disabled: unavailable }}
          >
            <Text style={fieldStyles.choiceLabel}>{option.label}</Text>
            {option.description ? (
              <Text style={fieldStyles.choiceDescription}>{option.description}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  </FieldFrame>
);
