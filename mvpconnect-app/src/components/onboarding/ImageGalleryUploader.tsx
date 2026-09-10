import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import {
  EMPTY_MEDIA_STATE,
  MediaFile,
  MediaUploadAdapter,
  MediaUploader,
  MediaUploaderState,
} from './MediaUploader';
import { fieldStyles } from './OnboardingFields.styles';
import {
  mediaUploaderStateKey,
  updateGalleryUploaderState,
  upsertGalleryUploaderState,
} from '../../onboarding/mediaFoundation';

export interface ImageGalleryUploaderProps {
  items: readonly MediaUploaderState[];
  onChange: React.Dispatch<React.SetStateAction<MediaUploaderState[]>>;
  maxCount: number;
  onSelectRequest?: (slotIndex: number) => Promise<MediaFile | undefined>;
  adapter?: MediaUploadAdapter;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  aspectRatio?: number;
  cropHint?: string;
  accentColor?: string;
  optional?: boolean;
  error?: string;
}

const moveItem = (
  items: readonly MediaUploaderState[],
  from: number,
  to: number,
): MediaUploaderState[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const ImageGalleryUploader: React.FC<ImageGalleryUploaderProps> = ({
  items,
  onChange,
  maxCount,
  onSelectRequest,
  adapter,
  label = 'IMAGE GALLERY',
  helperText,
  disabled = false,
  aspectRatio,
  cropHint,
  accentColor,
  optional = false,
  error,
}) => {
  const hasRoom = items.length < maxCount;

  return (
    <FieldFrame
      label={label}
      optional={optional}
      helperText={helperText}
      helperBefore
      error={error}
      headerAccessory={(
        <Text
          style={fieldStyles.selectionCounter}
          accessibilityLabel={`${items.length} of ${maxCount} gallery images uploaded`}
        >
          {`${items.length} / ${maxCount}`}
        </Text>
      )}
    >
      <View style={fieldStyles.galleryGrid}>
        {items.map((item, index) => (
          <View key={mediaUploaderStateKey(item, index)} style={fieldStyles.galleryTile}>
            <MediaUploader
              mode="GALLERY_IMAGE"
              label={`IMAGE ${index + 1}`}
              state={item}
              onStateChange={(nextState) => {
                const targetKey = mediaUploaderStateKey(item, index);
                onChange((current) => updateGalleryUploaderState(current, targetKey, nextState));
              }}
              onSelectRequest={onSelectRequest ? () => onSelectRequest(index) : undefined}
              adapter={adapter}
              disabled={disabled}
              aspectRatio={aspectRatio}
              cropHint={cropHint}
              accentColor={accentColor}
              compact
              removeAccessibilityLabel={`Remove gallery image ${index + 1}`}
              replaceAccessibilityLabel={`Replace gallery image ${index + 1}`}
            />
            <View style={fieldStyles.galleryOrderActions}>
              <TouchableOpacity
                style={[fieldStyles.textAction, (disabled || index === 0) && fieldStyles.chipUnavailable]}
                onPress={() => onChange((current) => moveItem(current, index, index - 1))}
                disabled={disabled || index === 0}
                accessibilityRole="button"
                accessibilityLabel={`Move image ${index + 1} earlier`}
                accessibilityState={{ disabled: disabled || index === 0 }}
              >
                <Text style={fieldStyles.textActionLabel}>MOVE EARLIER</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  fieldStyles.textAction,
                  (disabled || index === items.length - 1) && fieldStyles.chipUnavailable,
                ]}
                onPress={() => onChange((current) => moveItem(current, index, index + 1))}
                disabled={disabled || index === items.length - 1}
                accessibilityRole="button"
                accessibilityLabel={`Move image ${index + 1} later`}
                accessibilityState={{ disabled: disabled || index === items.length - 1 }}
              >
                <Text style={fieldStyles.textActionLabel}>MOVE LATER</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {hasRoom ? (
          <MediaUploader
            mode="GALLERY_IMAGE"
            label="ADD IMAGE"
            state={EMPTY_MEDIA_STATE}
            onStateChange={(nextState) => {
              onChange((current) => upsertGalleryUploaderState(current, nextState, maxCount));
            }}
            onSelectRequest={onSelectRequest ? () => onSelectRequest(items.length) : undefined}
            adapter={adapter}
            disabled={disabled}
            aspectRatio={aspectRatio}
            cropHint={cropHint}
            accentColor={accentColor}
            compact
            fieldContainerStyle={fieldStyles.galleryTile}
          />
        ) : (
          <Text style={fieldStyles.limitText}>{`GALLERY LIMIT REACHED (${maxCount}).`}</Text>
        )}
      </View>
    </FieldFrame>
  );
};
