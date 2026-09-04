import React from 'react';
import { Text, View } from 'react-native';
import { TextField, TextFieldProps } from './TextField';
import { fieldStyles } from './OnboardingFields.styles';

export interface TextAreaProps extends Omit<TextFieldProps, 'multiline'> {
  showCharacterCount?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  maxLength,
  showCharacterCount = false,
  inputContainerStyle,
  inputStyle,
  ...props
}) => {
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <View>
      <TextField
        {...props}
        value={value}
        maxLength={maxLength}
        multiline
        inputContainerStyle={[fieldStyles.textareaContainer, inputContainerStyle]}
        inputStyle={[fieldStyles.textareaInput, inputStyle]}
      />
      {showCharacterCount ? (
        <Text style={fieldStyles.characterCount} accessibilityLiveRegion="polite">
          {maxLength ? `${length} / ${maxLength}` : String(length)}
        </Text>
      ) : null}
    </View>
  );
};
