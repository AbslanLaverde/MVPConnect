import React from 'react';
import { Text, View } from 'react-native';
import { MediaUploader } from '../components/onboarding/MediaUploader';
import type {
  MediaFile,
  MediaUploadAdapter,
  MediaUploaderState,
} from '../components/onboarding/MediaUploader';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { OnboardingAccentFill } from './OnboardingAccent';
import { stepOneStyles } from './OnboardingStepOne.styles';

interface OnboardingIdentityImageProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  displayName: string;
  state: MediaUploaderState;
  onStateChange: (state: MediaUploaderState) => void;
  onSelectRequest: () => Promise<MediaFile | undefined>;
  adapter: MediaUploadAdapter;
  error?: string;
}

export const OnboardingIdentityImage: React.FC<OnboardingIdentityImageProps> = ({
  config,
  mobile,
  displayName,
  state,
  onStateChange,
  onSelectRequest,
  adapter,
  error,
}) => {
  const media = (
    <View style={mobile ? stepOneStyles.mediaMobile : stepOneStyles.mediaDesktop}>
      {!mobile ? (
        <Text style={stepOneStyles.identityLabel}>
          PROFILE IMAGE <Text style={stepOneStyles.required}>*</Text>
        </Text>
      ) : null}
      <View style={stepOneStyles.mediaAccentFrame}>
        <OnboardingAccentFill config={config} style={stepOneStyles.accentFill} />
        <View style={stepOneStyles.mediaInner}>
          <MediaUploader
            mode="PROFILE_IMAGE"
            label=""
            required
            state={state}
            onStateChange={onStateChange}
            onSelectRequest={onSelectRequest}
            adapter={adapter}
            compact={mobile}
            aspectRatio={mobile ? 1 : 4 / 5}
            emptyTitle="ADD YOUR IMAGE"
            emptyCopy={'JPG · PNG · WEBP\nMAX 10 MB'}
            accentColor={config.accentEnd ?? config.accentStart}
            borderless
            fieldContainerStyle={stepOneStyles.mediaField}
            error={error}
          />
        </View>
      </View>
    </View>
  );

  const copy = (
    <View style={[stepOneStyles.identityCopy, !mobile && stepOneStyles.identityCopyDesktop]}>
      {mobile ? (
        <Text style={stepOneStyles.identityLabel}>
          PROFILE IMAGE <Text style={stepOneStyles.required}>*</Text>
        </Text>
      ) : null}
      <Text style={stepOneStyles.identityName} numberOfLines={2}>
        {displayName || 'YOUR MVPConnect PROFILE'}
      </Text>
      <Text style={[stepOneStyles.identityPersona, { color: config.accentEnd ?? config.accentStart }]}>
        {config.label}
      </Text>
      {mobile ? (
        <Text style={stepOneStyles.identitySupport}>This image becomes the face of your profile.</Text>
      ) : null}
    </View>
  );

  if (mobile) {
    return <View testID="onboarding-identity-mobile" style={stepOneStyles.identityMobile}>{media}{copy}</View>;
  }
  return <View testID="onboarding-identity-desktop" style={stepOneStyles.identityDesktop}>{media}{copy}</View>;
};
