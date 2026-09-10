import React from 'react';
import { Text, View } from 'react-native';
import {
  ImageGalleryUploader,
  MediaUploader,
  UrlField,
  type MediaFile,
  type MediaUploadAdapter,
  type MediaUploaderState,
} from '../components/onboarding';
import type {
  ExternalConnectionSummary,
  ExternalProvider,
} from '../services/externalConnectionService';
import type { ExternalArtistResult } from '../services/externalArtistService';
import { OnboardingAccentFill } from './OnboardingAccent';
import {
  ArtistIdentityField,
  ProviderConnectionCard,
  UrlProviderConnectionField,
} from './MediaConnectionFields';
import { mediaStepStyles } from './OnboardingMediaStep.styles';
import type { OnboardingPersonaConfig } from './onboardingConfig';
import { MEDIA_GALLERY_LIMITS, MEDIA_GALLERY_TIPS } from './mediaStepTypes';
import type { MediaStepRequest } from './onboardingMediaStep';

const PRESENTATION = {
  artist: {
    headline: 'MAKE IT YOURS.',
    support: 'Add the images, music, and places online that best represent you.',
    gallery: 'SHOW YOURSELF',
    galleryHelper: 'Add photos that represent you — on stage, off stage, in the studio, or anywhere that feels like you.',
    bannerHelper: 'Add a banner image that captures your style, live show, or Artist identity.',
    reassuranceTitle: 'Your media brings your profile to life.',
    reassuranceBody: 'This step is optional. You can skip it now and update your media later.',
  },
  venue: {
    headline: 'SHOW THE ROOM.',
    support: 'Give artists and promoters a feel for the space before they arrive.',
    gallery: 'SHOW THE ROOM',
    galleryHelper: 'Add photos that give artists and promoters a feel for your space.',
    bannerHelper: 'Add a banner image that showcases your venue, exterior, or signature space.',
    reassuranceTitle: 'Great Venues speak for themselves.',
    reassuranceBody: 'Show your space, your stage, and your atmosphere. You can update everything later.',
  },
  promoter: {
    headline: 'SHOW YOUR WORK.',
    support: 'Give artists and venues a feel for the shows and experiences you create.',
    gallery: 'SHOW YOUR WORK',
    galleryHelper: 'Add images that give artists and venues a feel for the shows and experiences you create.',
    bannerHelper: 'Add a banner image that showcases your brand, events, or team.',
    reassuranceTitle: 'Your story matters.',
    reassuranceBody: 'Photos help artists and venues understand the events you create and the energy you bring.',
  },
} as const;

const URL_PLACEHOLDERS: Record<'INSTAGRAM' | 'TIKTOK' | 'BANDCAMP' | 'FACEBOOK', string> = {
  INSTAGRAM: '@yourname or https://instagram.com/yourname',
  TIKTOK: '@yourname or https://tiktok.com/@yourname',
  BANDCAMP: 'https://yourname.bandcamp.com',
  FACEBOOK: 'https://facebook.com/yourpage',
};

export interface OnboardingMediaFormProps {
  config: OnboardingPersonaConfig;
  mobile: boolean;
  position: number;
  totalSteps: number;
  stepLabel: string;
  data: MediaStepRequest;
  bannerState: MediaUploaderState;
  galleryStates: MediaUploaderState[];
  connections: ExternalConnectionSummary[];
  artistIdentity?: ExternalArtistResult | null;
  interactionBusy: boolean;
  errors: Record<string, string | undefined>;
  bannerAdapter: MediaUploadAdapter;
  galleryAdapter: MediaUploadAdapter;
  onPickImage: (slotIndex?: number) => Promise<MediaFile | undefined>;
  onBannerChange: (state: MediaUploaderState) => void;
  onGalleryChange: React.Dispatch<React.SetStateAction<MediaUploaderState[]>>;
  onWebsiteChange: (website: string | null) => void;
  onUrlConnectionSave: (provider: ExternalProvider, value: string) => Promise<void>;
  onConnectionRemove: (provider: ExternalProvider) => Promise<void>;
  onOAuthConnect: (provider: 'YOUTUBE' | 'SOUNDCLOUD') => Promise<void>;
  onArtistIdentityAttach: (identity: ExternalArtistResult) => Promise<void>;
  onArtistIdentityDisconnect: () => Promise<void>;
  oauthErrors?: Partial<Record<'YOUTUBE' | 'SOUNDCLOUD', string>>;
}

const SectionCopy = ({ title, helper, optional = true }: {
  title: string;
  helper: string;
  optional?: boolean;
}) => (
  <View style={mediaStepStyles.sectionCopy}>
    <View style={mediaStepStyles.sectionTitleRow}>
      <Text style={mediaStepStyles.sectionTitle}>{title}</Text>
      {optional ? <Text style={mediaStepStyles.optional}>OPTIONAL</Text> : null}
    </View>
    <Text style={mediaStepStyles.sectionHelper}>{helper}</Text>
  </View>
);

const TipsCard = ({ persona }: { persona: OnboardingPersonaConfig['persona'] }) => {
  const tips = MEDIA_GALLERY_TIPS[persona];
  return (
    <View style={mediaStepStyles.tipsCard} accessibilityLabel={tips.title}>
      <Text style={mediaStepStyles.tipsTitle}>{tips.title}</Text>
      {tips.items.map((tip) => <Text key={tip} style={mediaStepStyles.tip}>{`• ${tip}`}</Text>)}
    </View>
  );
};

export const OnboardingMediaForm: React.FC<OnboardingMediaFormProps> = ({
  config,
  mobile,
  position,
  totalSteps,
  stepLabel,
  data,
  bannerState,
  galleryStates,
  connections,
  artistIdentity,
  interactionBusy,
  errors,
  bannerAdapter,
  galleryAdapter,
  onPickImage,
  onBannerChange,
  onGalleryChange,
  onWebsiteChange,
  onUrlConnectionSave,
  onConnectionRemove,
  onOAuthConnect,
  onArtistIdentityAttach,
  onArtistIdentityDisconnect,
  oauthErrors,
}) => {
  const presentation = PRESENTATION[config.persona];
  const accent = config.accentEnd ?? config.accentStart;
  const connection = (provider: ExternalProvider) => connections.find((item) => item.provider === provider);
  const sectionStyle = [mediaStepStyles.section, mobile && mediaStepStyles.sectionMobile];
  const columnStyle = [mediaStepStyles.sectionColumns, mobile && mediaStepStyles.sectionColumnsMobile];
  const copyStyle = mobile ? mediaStepStyles.sectionCopyMobile : undefined;
  const socialProviders: Array<'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK'> = config.persona === 'artist'
    ? ['INSTAGRAM', 'TIKTOK']
    : ['INSTAGRAM', 'FACEBOOK', 'TIKTOK'];

  return (
    <View testID={`onboarding-media-${config.persona}`} style={mediaStepStyles.layout}>
      <View style={[mediaStepStyles.introRow, mobile && mediaStepStyles.introRowMobile]}>
        <View style={mediaStepStyles.introCopy}>
          <Text
            style={[mediaStepStyles.stepMeta, { color: config.accentStart }]}
            accessibilityLabel={`Step ${String(position).padStart(2, '0')} of ${String(totalSteps).padStart(2, '0')}, ${stepLabel}`}
          >
            {`${String(position).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}  `}
            <Text style={mediaStepStyles.stepLabel}>{stepLabel}</Text>
          </Text>
          <Text
            accessibilityRole="header"
            style={[mediaStepStyles.headline, mobile && mediaStepStyles.headlineMobile]}
          >
            {presentation.headline}
          </Text>
          <View style={mediaStepStyles.headingRule}>
            <OnboardingAccentFill config={config} style={mediaStepStyles.accentFill} />
          </View>
          <Text style={mediaStepStyles.support}>{presentation.support}</Text>
        </View>
        <View style={[mediaStepStyles.reassurance, mobile && mediaStepStyles.reassuranceMobile]}>
          <Text style={[mediaStepStyles.reassuranceIcon, { color: accent }]}>◎</Text>
          <View style={mediaStepStyles.reassuranceCopy}>
            <Text style={mediaStepStyles.reassuranceTitle}>{presentation.reassuranceTitle}</Text>
            <Text style={mediaStepStyles.reassuranceBody}>{presentation.reassuranceBody}</Text>
          </View>
        </View>
      </View>

      <View testID="media-banner-section" style={sectionStyle}>
        <View style={columnStyle}>
          <View style={copyStyle}><SectionCopy title="HERO IMAGE" helper={presentation.bannerHelper} /></View>
          <View style={mediaStepStyles.sectionContent}>
            <MediaUploader
              mode="BANNER_IMAGE"
              label=""
              state={bannerState}
              onStateChange={onBannerChange}
              onSelectRequest={() => onPickImage()}
              adapter={bannerAdapter}
              disabled={interactionBusy}
              accentColor={accent}
              aspectRatio={16 / 5}
              cropHint="JPG, PNG OR WEBP · MAX 10 MB"
              emptyTitle="UPLOAD BANNER IMAGE"
              fieldContainerStyle={mediaStepStyles.bannerField}
              removeAccessibilityLabel="Remove banner image"
              replaceAccessibilityLabel="Replace banner image"
            />
          </View>
        </View>
      </View>

      <View testID="media-gallery-section" style={sectionStyle}>
        <View style={columnStyle}>
          <View style={copyStyle}><SectionCopy title={presentation.gallery} helper={presentation.galleryHelper} /></View>
          <View style={mediaStepStyles.sectionContent}>
            <ImageGalleryUploader
              items={galleryStates}
              onChange={onGalleryChange}
              maxCount={MEDIA_GALLERY_LIMITS[config.persona]}
              onSelectRequest={(slot) => onPickImage(slot)}
              adapter={galleryAdapter}
              label=""
              disabled={interactionBusy}
              accentColor={accent}
              aspectRatio={4 / 3}
              cropHint="JPG, PNG OR WEBP · MAX 10 MB"
              error={errors.gallery}
            />
          </View>
        </View>
        <TipsCard persona={config.persona} />
      </View>

      {config.persona === 'artist' ? (
        <>
          <View testID="media-music-connections" style={sectionStyle}>
            <View style={columnStyle}>
              <View style={copyStyle}>
                <SectionCopy
                  title="CONNECT YOUR MUSIC"
                  helper="Identify your Spotify Artist page and connect the places where people can listen."
                  optional={false}
                />
              </View>
              <View style={mediaStepStyles.sectionContent}>
                <ArtistIdentityField
                  identity={artistIdentity}
                  config={config}
                  disabled={interactionBusy}
                  onAttach={onArtistIdentityAttach}
                  onDisconnect={onArtistIdentityDisconnect}
                />
                <View style={mediaStepStyles.connectionsGrid}>
                  <ProviderConnectionCard
                    provider="SOUNDCLOUD"
                    connection={connection('SOUNDCLOUD')}
                    busy={interactionBusy}
                    error={oauthErrors?.SOUNDCLOUD}
                    accentColor={accent}
                    onConnect={() => onOAuthConnect('SOUNDCLOUD')}
                    onDisconnect={() => onConnectionRemove('SOUNDCLOUD')}
                  />
                  <UrlProviderConnectionField
                    provider="BANDCAMP"
                    connection={connection('BANDCAMP')}
                    accentColor={accent}
                    placeholder={URL_PLACEHOLDERS.BANDCAMP}
                    disabled={interactionBusy}
                    onSave={(value) => onUrlConnectionSave('BANDCAMP', value)}
                    onDisconnect={() => onConnectionRemove('BANDCAMP')}
                  />
                </View>
              </View>
            </View>
          </View>
          <View testID="media-video-social" style={sectionStyle}>
            <View style={columnStyle}>
              <View style={copyStyle}>
                <SectionCopy
                  title="VIDEO & SOCIAL"
                  helper="Connect your channel and add the social profiles where people can find you."
                  optional={false}
                />
              </View>
              <View style={mediaStepStyles.sectionContent}>
                <View style={mediaStepStyles.connectionsGrid}>
                  <ProviderConnectionCard
                    provider="YOUTUBE"
                    connection={connection('YOUTUBE')}
                    busy={interactionBusy}
                    error={oauthErrors?.YOUTUBE}
                    accentColor={accent}
                    onConnect={() => onOAuthConnect('YOUTUBE')}
                    onDisconnect={() => onConnectionRemove('YOUTUBE')}
                  />
                  {socialProviders.map((provider) => (
                    <UrlProviderConnectionField
                      key={provider}
                      provider={provider}
                      connection={connection(provider)}
                      accentColor={accent}
                      placeholder={URL_PLACEHOLDERS[provider]}
                      disabled={interactionBusy}
                      onSave={(value) => onUrlConnectionSave(provider, value)}
                      onDisconnect={() => onConnectionRemove(provider)}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </>
      ) : (
        <View testID="media-social-connections" style={sectionStyle}>
          <View style={columnStyle}>
            <View style={copyStyle}>
              <SectionCopy
                title="FIND YOU ONLINE"
                helper="Add the public social profiles where people can follow your work."
              />
            </View>
            <View style={[mediaStepStyles.sectionContent, mediaStepStyles.connectionsGrid]}>
              {socialProviders.map((provider) => (
                <UrlProviderConnectionField
                  key={provider}
                  provider={provider}
                  connection={connection(provider)}
                  accentColor={accent}
                  placeholder={URL_PLACEHOLDERS[provider]}
                  disabled={interactionBusy}
                  onSave={(value) => onUrlConnectionSave(provider, value)}
                  onDisconnect={() => onConnectionRemove(provider)}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {'websiteUrl' in data ? (
        <View testID="media-website-section" style={sectionStyle}>
          <View style={columnStyle}>
            <View style={copyStyle}>
              <SectionCopy
                title="YOUR WEBSITE"
                helper="Add your official website so people can learn more about you."
              />
            </View>
            <View style={mediaStepStyles.sectionContent}>
              <UrlField
                label=""
                value={data.websiteUrl ?? ''}
                onChange={(value) => onWebsiteChange(value || null)}
                normalizeOnBlur
                placeholder="https://yourwebsite.com"
                focusColor={config.accentStart}
                focusGradientColors={config.accentEnd ? [config.accentStart, config.accentEnd] : undefined}
                error={errors.websiteUrl}
                containerStyle={mediaStepStyles.websiteField}
                accessibilityLabel="Website URL, optional"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};
