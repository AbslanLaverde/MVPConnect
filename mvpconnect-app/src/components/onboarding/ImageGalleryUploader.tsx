import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import {
  DEFAULT_IMAGE_MIME_TYPES,
  DEFAULT_MAX_IMAGE_BYTES,
  MediaFile,
  MediaUploadAdapter,
  mediaPreviewUriFor,
  MediaUploaderState,
  validateMediaFile,
} from './MediaUploader';
import { fieldStyles } from './OnboardingFields.styles';
import {
  mediaUploaderStateKey,
  updateGalleryUploaderState,
} from '../../onboarding/mediaFoundation';

export interface ImageGalleryUploaderProps {
  items: readonly MediaUploaderState[];
  onChange: React.Dispatch<React.SetStateAction<MediaUploaderState[]>>;
  maxCount: number;
  onSelectRequest?: (remainingCapacity: number) => Promise<readonly MediaFile[]>;
  adapter?: MediaUploadAdapter;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  accentColor?: string;
  optional?: boolean;
  error?: string;
  mobile?: boolean;
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

const uploadedMedia = (item: MediaUploaderState) => (
  'media' in item ? item.media : undefined
);

const itemFile = (item: MediaUploaderState) => (
  'file' in item ? item.file : undefined
);

export const ImageGalleryUploader: React.FC<ImageGalleryUploaderProps> = ({
  items,
  onChange,
  maxCount,
  onSelectRequest,
  adapter,
  label = 'IMAGE GALLERY',
  helperText,
  disabled = false,
  accentColor,
  optional = false,
  error,
  mobile = false,
}) => {
  const [operationBusy, setOperationBusy] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const remainingCapacity = Math.max(0, maxCount - items.length);
  const hasRoom = remainingCapacity > 0;
  const controlsDisabled = disabled || operationBusy;

  const replaceByKey = (targetKey: string, nextState: MediaUploaderState) => {
    onChange((current) => updateGalleryUploaderState(current, targetKey, nextState));
  };

  const uploadInPlace = async (file: MediaFile, targetKey: string) => {
    const validationError = validateMediaFile(file, DEFAULT_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_BYTES);
    if (validationError) {
      replaceByKey(targetKey, { status: 'ERROR', file, error: validationError });
      return;
    }
    if (!adapter) {
      replaceByKey(targetKey, { status: 'ERROR', file, error: 'Image upload is unavailable.' });
      return;
    }

    replaceByKey(targetKey, { status: 'UPLOADING', file, progress: 0 });
    try {
      const media = await adapter.upload(file, (progress) => {
        replaceByKey(targetKey, {
          status: 'UPLOADING',
          file,
          progress: Math.max(0, Math.min(progress, 1)),
        });
      });
      replaceByKey(targetKey, { status: 'UPLOADED', file, media });
    } catch {
      replaceByKey(targetKey, { status: 'ERROR', file, error: "We couldn't save this image." });
    }
  };

  const addPhotos = async () => {
    if (controlsDisabled || !onSelectRequest || remainingCapacity === 0) return;
    setSelectionError(undefined);
    setOperationBusy(true);
    try {
      const selected = (await onSelectRequest(remainingCapacity)).slice(0, remainingCapacity);
      if (selected.length === 0) return;

      const localStates: MediaUploaderState[] = selected.map((file) => {
        const validationError = validateMediaFile(file, DEFAULT_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_BYTES);
        return validationError
          ? { status: 'ERROR', file, error: validationError }
          : { status: 'SELECTED_LOCAL', file };
      });
      onChange((current) => [...current, ...localStates].slice(0, maxCount));

      for (const [index, file] of selected.entries()) {
        const validationError = validateMediaFile(file, DEFAULT_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_BYTES);
        if (validationError) continue;
        await uploadInPlace(file, mediaUploaderStateKey(localStates[index], items.length + index));
      }
    } catch {
      setSelectionError('Images could not be selected. Please try again.');
    } finally {
      setOperationBusy(false);
    }
  };

  const retryUpload = async (item: MediaUploaderState, index: number) => {
    const file = itemFile(item);
    if (!file || controlsDisabled) return;
    setOperationBusy(true);
    try {
      await uploadInPlace(file, mediaUploaderStateKey(item, index));
    } finally {
      setOperationBusy(false);
    }
  };

  const removeItem = async (item: MediaUploaderState, index: number) => {
    if (controlsDisabled) return;
    const targetKey = mediaUploaderStateKey(item, index);
    const media = uploadedMedia(item);
    const file = itemFile(item);
    setOperationBusy(true);
    try {
      if (media && adapter) {
        replaceByKey(targetKey, { status: 'REMOVING', file, media });
        try {
          await adapter.remove(media.id);
        } catch {
          replaceByKey(targetKey, {
            status: 'ERROR',
            media,
            error: 'The uploaded image could not be removed. Please try again.',
          });
          return;
        }
      }
      replaceByKey(targetKey, { status: 'EMPTY' });
    } finally {
      setOperationBusy(false);
    }
  };

  return (
    <FieldFrame
      label={label}
      optional={optional}
      helperText={helperText}
      helperBefore
      error={selectionError ?? error}
      headerAccessory={(
        <Text
          style={fieldStyles.selectionCounter}
          accessibilityLabel={`${items.length} of ${maxCount} gallery slots occupied`}
        >
          {`${items.length} / ${maxCount}`}
        </Text>
      )}
    >
      <View style={fieldStyles.galleryGrid} testID="compact-gallery-grid">
        {items.map((item, index) => {
          const previewUri = mediaPreviewUriFor(item);
          const retryFile = itemFile(item);
          const retryable = item.status === 'ERROR'
            && retryFile !== undefined
            && adapter !== undefined
            && !validateMediaFile(retryFile, DEFAULT_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_BYTES);
          const movingDisabled = controlsDisabled;
          const earlierDisabled = movingDisabled || index === 0;
          const laterDisabled = movingDisabled || index === items.length - 1;
          const progress = item.status === 'UPLOADING'
            ? `UPLOADING ${Math.round((item.progress ?? 0) * 100)}%`
            : item.status === 'REMOVING'
              ? 'REMOVING…'
              : item.status === 'ERROR'
                ? 'UPLOAD FAILED'
                : undefined;

          return (
            <View
              key={mediaUploaderStateKey(item, index)}
              testID={`gallery-tile-${index + 1}`}
              style={[
                fieldStyles.galleryTile,
                mobile && fieldStyles.galleryTileMobile,
                accentColor ? { borderColor: accentColor } : undefined,
                item.status === 'ERROR' && fieldStyles.galleryTileError,
              ]}
            >
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={fieldStyles.galleryThumbnail}
                  resizeMode="cover"
                  accessibilityLabel={`Selected gallery image ${index + 1} preview`}
                />
              ) : (
                <View style={fieldStyles.galleryThumbnailFallback}>
                  <Text style={fieldStyles.galleryThumbnailFallbackText}>IMAGE</Text>
                </View>
              )}
              {progress ? (
                <Text
                  style={[
                    item.status === 'ERROR' ? fieldStyles.error : fieldStyles.galleryProgressText,
                    fieldStyles.galleryStateText,
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  {progress}
                </Text>
              ) : null}
              {retryable ? (
                <TouchableOpacity
                  style={[fieldStyles.galleryRetryAction, controlsDisabled && fieldStyles.chipUnavailable]}
                  onPress={() => void retryUpload(item, index)}
                  disabled={controlsDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Retry image ${index + 1} upload`}
                  accessibilityState={{ disabled: controlsDisabled }}
                >
                  <Text style={[fieldStyles.galleryActionLabel, accentColor ? { color: accentColor } : undefined]}>
                    RETRY
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View style={fieldStyles.galleryOrderActions}>
                <TouchableOpacity
                  style={[fieldStyles.galleryIconAction, earlierDisabled && fieldStyles.chipUnavailable]}
                  onPress={() => onChange((current) => moveItem(current, index, index - 1))}
                  disabled={earlierDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Move image ${index + 1} earlier`}
                  accessibilityState={{ disabled: earlierDisabled }}
                >
                  <Text style={[fieldStyles.galleryArrow, accentColor ? { color: accentColor } : undefined]}>←</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[fieldStyles.galleryIconAction, laterDisabled && fieldStyles.chipUnavailable]}
                  onPress={() => onChange((current) => moveItem(current, index, index + 1))}
                  disabled={laterDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Move image ${index + 1} later`}
                  accessibilityState={{ disabled: laterDisabled }}
                >
                  <Text style={[fieldStyles.galleryArrow, accentColor ? { color: accentColor } : undefined]}>→</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[fieldStyles.galleryRemoveAction, controlsDisabled && fieldStyles.chipUnavailable]}
                  onPress={() => void removeItem(item, index)}
                  disabled={controlsDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove image ${index + 1}`}
                  accessibilityState={{ disabled: controlsDisabled }}
                >
                  <Text style={fieldStyles.galleryRemoveLabel}>REMOVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
      {hasRoom ? (
        <TouchableOpacity
          style={[
            fieldStyles.galleryAddAction,
            accentColor ? { borderColor: accentColor } : undefined,
            controlsDisabled && fieldStyles.chipUnavailable,
          ]}
          onPress={() => void addPhotos()}
          disabled={controlsDisabled || !onSelectRequest}
          accessibilityRole="button"
          accessibilityLabel="Add gallery photos"
          accessibilityState={{ disabled: controlsDisabled || !onSelectRequest, busy: operationBusy }}
        >
          <Text style={[fieldStyles.galleryAddLabel, accentColor ? { color: accentColor } : undefined]}>
            + ADD PHOTOS
          </Text>
        </TouchableOpacity>
      ) : null}
    </FieldFrame>
  );
};
