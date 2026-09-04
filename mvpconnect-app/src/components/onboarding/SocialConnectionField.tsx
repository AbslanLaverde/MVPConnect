import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export type SocialProvider = 'SPOTIFY' | 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
export type SocialConnectionStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export interface SocialConnectionValue {
  provider: SocialProvider;
  status: SocialConnectionStatus;
  displayName?: string;
  username?: string;
  profileUrl?: string;
  error?: string;
  providerMetadata?: Record<string, string | number | boolean | null>;
}

export interface SocialConnectionFieldProps {
  value: SocialConnectionValue;
  onConnect: (provider: SocialProvider) => void;
  onDisconnect: (provider: SocialProvider) => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}

export const SocialConnectionField: React.FC<SocialConnectionFieldProps> = ({
  value,
  onConnect,
  onDisconnect,
  label,
  helperText = 'Connection controls are prepared; provider authorization is not implemented yet.',
  disabled = false,
}) => {
  const connecting = value.status === 'CONNECTING';
  const connected = value.status === 'CONNECTED';

  return (
    <FieldFrame label={label ?? value.provider} helperText={helperText}>
      <View style={fieldStyles.socialCard}>
        <View style={fieldStyles.socialHeader}>
          <Text style={fieldStyles.socialProvider}>{value.provider}</Text>
          {connecting ? (
            <ActivityIndicator color={theme.colors.brandBlue} accessibilityLabel="Connecting" />
          ) : (
            <Text style={fieldStyles.socialStatus} accessibilityLiveRegion="polite">
              {value.status.replace('_', ' ')}
            </Text>
          )}
        </View>
        {value.displayName || value.username ? (
          <Text style={fieldStyles.socialIdentity}>{value.displayName ?? value.username}</Text>
        ) : null}
        {value.username && value.displayName ? (
          <Text style={fieldStyles.socialDetail}>{`@${value.username.replace(/^@/, '')}`}</Text>
        ) : null}
        {value.profileUrl ? <Text style={fieldStyles.socialDetail}>{value.profileUrl}</Text> : null}
        {value.providerMetadata ? Object.entries(value.providerMetadata).map(([key, metadataValue]) => (
          <Text key={key} style={fieldStyles.socialDetail}>
            {`${key}: ${String(metadataValue)}`}
          </Text>
        )) : null}
        {value.status === 'ERROR' && value.error ? (
          <Text style={fieldStyles.error} accessibilityRole="alert">{value.error}</Text>
        ) : null}
        <TouchableOpacity
          style={[fieldStyles.textAction, (disabled || connecting) && fieldStyles.chipUnavailable]}
          onPress={() => connected ? onDisconnect(value.provider) : onConnect(value.provider)}
          disabled={disabled || connecting}
          accessibilityRole="button"
          accessibilityLabel={`${connected ? 'Disconnect' : 'Connect'} ${value.provider}`}
          accessibilityState={{ disabled: disabled || connecting, busy: connecting }}
        >
          <Text style={connected
            ? [fieldStyles.textActionLabel, fieldStyles.removeActionLabel]
            : fieldStyles.textActionLabel}
          >
            {connected ? 'DISCONNECT' : value.status === 'ERROR' ? 'TRY AGAIN' : 'CONNECT'}
          </Text>
        </TouchableOpacity>
      </View>
    </FieldFrame>
  );
};
