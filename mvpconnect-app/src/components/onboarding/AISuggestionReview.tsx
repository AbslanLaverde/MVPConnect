import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export type AISuggestionStatus =
  | 'SUGGESTED'
  | 'PENDING_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'USER_ADDED';

export interface AISuggestion {
  id: string;
  label: string;
  status: AISuggestionStatus;
  metadata?: Record<string, unknown>;
}

export interface AISuggestionReviewProps {
  suggestions: readonly AISuggestion[];
  onChange: (suggestions: AISuggestion[]) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

const replaceStatus = (
  suggestions: readonly AISuggestion[],
  id: string,
  status: AISuggestionStatus,
) => suggestions.map((suggestion) => (
  suggestion.id === id ? { ...suggestion, status } : suggestion
));

export const AISuggestionReview: React.FC<AISuggestionReviewProps> = ({
  suggestions,
  onChange,
  label = 'AI SUGGESTED',
  helperText = 'Review each suggestion. Nothing becomes part of your profile until you accept it.',
  disabled = false,
}) => (
  <FieldFrame label={label} helperText={helperText}>
    <View style={fieldStyles.suggestionPanel}>
      {suggestions.map((suggestion) => {
        const pending = suggestion.status === 'SUGGESTED' || suggestion.status === 'PENDING_REVIEW';
        const userAdded = suggestion.status === 'USER_ADDED';
        return (
          <View
            key={suggestion.id}
            style={fieldStyles.suggestionRow}
            accessibilityLabel={`${userAdded ? 'User added' : 'AI suggested'} ${suggestion.label}, ${suggestion.status.toLowerCase().replace('_', ' ')}`}
          >
            <Text style={fieldStyles.suggestionOrigin}>
              {userAdded ? 'YOU ADDED' : 'AI SUGGESTION'}
            </Text>
            <Text style={fieldStyles.suggestionLabel}>{suggestion.label}</Text>
            <Text style={fieldStyles.suggestionState}>{suggestion.status.replace('_', ' ')}</Text>
            <View style={fieldStyles.suggestionActions}>
              {pending ? (
                <>
                  <TouchableOpacity
                    style={fieldStyles.textAction}
                    onPress={() => onChange(replaceStatus(suggestions, suggestion.id, 'ACCEPTED'))}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Accept AI suggestion ${suggestion.label}`}
                    accessibilityState={{ disabled }}
                  >
                    <Text style={fieldStyles.textActionLabel}>ACCEPT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={fieldStyles.textAction}
                    onPress={() => onChange(replaceStatus(suggestions, suggestion.id, 'REJECTED'))}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Reject AI suggestion ${suggestion.label}`}
                    accessibilityState={{ disabled }}
                  >
                    <Text style={[fieldStyles.textActionLabel, fieldStyles.removeActionLabel]}>REJECT</Text>
                  </TouchableOpacity>
                </>
              ) : suggestion.status === 'REJECTED' ? (
                <TouchableOpacity
                  style={fieldStyles.textAction}
                  onPress={() => onChange(replaceStatus(suggestions, suggestion.id, 'PENDING_REVIEW'))}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${suggestion.label} again`}
                  accessibilityState={{ disabled }}
                >
                  <Text style={fieldStyles.textActionLabel}>REVIEW AGAIN</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={fieldStyles.textAction}
                  onPress={() => onChange(userAdded
                    ? suggestions.filter((candidate) => candidate.id !== suggestion.id)
                    : replaceStatus(suggestions, suggestion.id, 'REJECTED'))}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${suggestion.label}`}
                  accessibilityState={{ disabled }}
                >
                  <Text style={[fieldStyles.textActionLabel, fieldStyles.removeActionLabel]}>REMOVE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  </FieldFrame>
);
