import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { OnboardingAccentFill } from '../../onboarding/OnboardingAccent';
import type { OnboardingPersonaConfig } from '../../onboarding/onboardingConfig';
import type { EquipmentItemDto } from '../../onboarding/stepThreeTypes';
import { EQUIPMENT_OPTIONS, type EquipmentCode } from '../../onboarding/taxonomy';
import { theme } from '../../theme/theme';
import { FieldFrame } from './FieldFrame';
import { validateNumberFieldValue } from './NumberField';
import { fieldStyles } from './OnboardingFields.styles';

export interface EquipmentSelectorProps {
  value: readonly EquipmentItemDto[];
  onChange: (value: EquipmentItemDto[]) => void;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  accentConfig?: OnboardingPersonaConfig;
  containerStyle?: StyleProp<ViewStyle>;
  onValidityChange?: (valid: boolean) => void;
}

interface EquipmentQuantityControlProps {
  equipmentLabel: string;
  quantity: number | null | undefined;
  disabled: boolean;
  onChange: (quantity: number | undefined) => void;
  onValidityChange: (valid: boolean) => void;
}

const EquipmentQuantityControl: React.FC<EquipmentQuantityControlProps> = ({
  equipmentLabel,
  quantity,
  disabled,
  onChange,
  onValidityChange,
}) => {
  const [rawValue, setRawValue] = useState(quantity == null ? '' : String(quantity));
  const validationError = validateNumberFieldValue(rawValue, {
    min: 1,
    max: 99,
    integerOnly: true,
  });

  useEffect(() => {
    setRawValue(quantity == null ? '' : String(quantity));
  }, [quantity]);

  const handleChange = (nextValue: string) => {
    setRawValue(nextValue);
    const nextError = validateNumberFieldValue(nextValue, {
      min: 1,
      max: 99,
      integerOnly: true,
    });
    onValidityChange(!nextError);

    if (!nextValue.trim()) {
      onChange(undefined);
    } else if (!nextError) {
      onChange(Number(nextValue));
    }
  };

  return (
    <View
      style={[
        fieldStyles.equipmentQuantity,
        Boolean(validationError) && fieldStyles.equipmentQuantityInvalid,
      ]}
    >
      <Text style={fieldStyles.equipmentQuantityLabel}>QTY</Text>
      <TextInput
        value={rawValue}
        onChangeText={handleChange}
        editable={!disabled}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor={theme.colors.warmWhite}
        selectTextOnFocus
        style={fieldStyles.equipmentQuantityInput}
        accessibilityLabel={`${equipmentLabel} quantity, optional`}
        accessibilityHint={validationError ?? 'Enter an optional whole number from 1 to 99. Leave blank if unspecified.'}
        accessibilityState={{ disabled }}
      />
    </View>
  );
};

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({
  value,
  onChange,
  label = 'Equipment',
  helperText = 'Select equipment, then optionally add a quantity.',
  error,
  disabled = false,
  accentConfig,
  containerStyle,
  onValidityChange,
}) => {
  const [quantityValidity, setQuantityValidity] = useState<Record<string, boolean>>({});
  const selectedItem = (code: EquipmentCode) => value.find((item) => item.code === code);

  useEffect(() => {
    onValidityChange?.(value.every((item) => quantityValidity[item.code] !== false));
  }, [onValidityChange, quantityValidity, value]);

  const toggle = (code: EquipmentCode) => {
    if (disabled) return;
    const selected = selectedItem(code);
    setQuantityValidity((current) => {
      if (selected) {
        const next = { ...current };
        delete next[code];
        return next;
      }
      return { ...current, [code]: true };
    });
    onChange(selected
      ? value.filter((item) => item.code !== code)
      : [...value, { code, quantity: null }]);
  };

  const updateQuantity = (code: EquipmentCode, quantity: number | undefined) => {
    if (disabled) return;
    onChange(value.map((item) => item.code === code
      ? { ...item, quantity: quantity ?? null }
      : item));
  };

  return (
    <FieldFrame
      label={label}
      optional
      helperText={helperText}
      helperBefore
      error={error}
      containerStyle={containerStyle}
    >
      <View style={fieldStyles.equipmentGrid} accessibilityLabel={label}>
        {EQUIPMENT_OPTIONS.map((option) => {
          const selected = selectedItem(option.value);
          return (
            <View
              key={option.value}
              testID={`equipment-${option.value}-tile`}
              style={[
                fieldStyles.equipmentItem,
                selected && fieldStyles.equipmentItemSelected,
                selected && accentConfig && { borderColor: accentConfig.accentStart },
                disabled && fieldStyles.equipmentItemDisabled,
              ]}
            >
              {selected && accentConfig ? (
                <OnboardingAccentFill
                  config={accentConfig}
                  style={fieldStyles.equipmentAccentFill}
                  testID={`equipment-${option.value}-selected-accent`}
                />
              ) : null}
              <TouchableOpacity
                style={fieldStyles.equipmentToggle}
                onPress={() => toggle(option.value)}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityHint={selected
                  ? 'Deselects this equipment and removes its quantity.'
                  : 'Selects this equipment and enables an optional quantity.'}
                accessibilityState={{ checked: Boolean(selected), disabled }}
              >
                <Text style={[
                  fieldStyles.equipmentLabel,
                  selected && fieldStyles.equipmentLabelSelected,
                ]} numberOfLines={2}>
                  {selected ? `✓ ${option.label}` : option.label}
                </Text>
              </TouchableOpacity>
              {selected ? (
                <EquipmentQuantityControl
                  equipmentLabel={option.label}
                  quantity={selected.quantity}
                  disabled={disabled}
                  onChange={(quantity) => updateQuantity(option.value, quantity)}
                  onValidityChange={(valid) => setQuantityValidity((current) => (
                    current[option.value] === valid
                      ? current
                      : { ...current, [option.value]: valid }
                  ))}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </FieldFrame>
  );
};
