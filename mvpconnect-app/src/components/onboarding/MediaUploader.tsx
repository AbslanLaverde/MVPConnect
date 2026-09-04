import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { FieldFrame } from './FieldFrame';
import { fieldStyles } from './OnboardingFields.styles';

export type MediaUploadMode = 'PROFILE_IMAGE' | 'BANNER_IMAGE' | 'GALLERY_IMAGE';

export interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
}

export interface UploadedMedia {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
}

export interface MediaUploadAdapter {
  upload(file: MediaFile, onProgress?: (progress: number) => void): Promise<UploadedMedia>;
  remove(mediaId: string): Promise<void>;
}

export type MediaUploaderState =
  | { status: 'EMPTY' }
  | { status: 'SELECTED_LOCAL'; file: MediaFile }
  | { status: 'UPLOADING'; file: MediaFile; progress?: number }
  | { status: 'UPLOADED'; file?: MediaFile; media: UploadedMedia }
  | { status: 'ERROR'; error: string; file?: MediaFile; media?: UploadedMedia };

export interface MediaUploaderProps {
  mode: MediaUploadMode;
  state?: MediaUploaderState;
  defaultState?: MediaUploaderState;
  onStateChange?: (state: MediaUploaderState) => void;
  onSelectRequest?: () => Promise<MediaFile | undefined>;
  adapter?: MediaUploadAdapter;
  label?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  helperText?: string;
  acceptedMimeTypes?: readonly string[];
  maxFileSizeBytes?: number;
  aspectRatio?: number;
  cropHint?: string;
}

export const EMPTY_MEDIA_STATE: MediaUploaderState = { status: 'EMPTY' };
export const DEFAULT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const validateMediaFile = (
  file: MediaFile,
  acceptedMimeTypes: readonly string[],
  maxFileSizeBytes: number,
): string | undefined => {
  if (!acceptedMimeTypes.includes(file.type.toLowerCase())) {
    return 'Choose a supported image file.';
  }
  if (file.size > maxFileSizeBytes) {
    const limitMb = Math.round((maxFileSizeBytes / (1024 * 1024)) * 10) / 10;
    return `Choose an image smaller than ${limitMb} MB.`;
  }
  return undefined;
};

const MODE_LABELS: Record<MediaUploadMode, string> = {
  PROFILE_IMAGE: 'PROFILE IMAGE',
  BANNER_IMAGE: 'BANNER IMAGE',
  GALLERY_IMAGE: 'GALLERY IMAGE',
};

const previewUriFor = (state: MediaUploaderState): string | undefined => {
  if (state.status === 'UPLOADED') return state.media.url;
  if ('file' in state) return state.file?.uri;
  if (state.status === 'ERROR') return state.media?.url;
  return undefined;
};

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  mode,
  state,
  defaultState = EMPTY_MEDIA_STATE,
  onStateChange,
  onSelectRequest,
  adapter,
  label,
  required = false,
  optional = false,
  disabled = false,
  helperText,
  acceptedMimeTypes = DEFAULT_IMAGE_MIME_TYPES,
  maxFileSizeBytes = DEFAULT_MAX_IMAGE_BYTES,
  aspectRatio,
  cropHint,
}) => {
  const [internalState, setInternalState] = useState<MediaUploaderState>(defaultState);
  const currentState = state ?? internalState;
  const previewUri = previewUriFor(currentState);
  const pickerAvailable = Boolean(onSelectRequest);

  const commit = (nextState: MediaUploaderState) => {
    if (state === undefined) setInternalState(nextState);
    onStateChange?.(nextState);
  };

  const upload = async (file: MediaFile) => {
    if (!adapter) return;
    commit({ status: 'UPLOADING', file, progress: 0 });
    try {
      const media = await adapter.upload(file, (progress) => {
        commit({ status: 'UPLOADING', file, progress: Math.max(0, Math.min(progress, 1)) });
      });
      commit({ status: 'UPLOADED', file, media });
    } catch {
      commit({
        status: 'ERROR',
        file,
        error: 'Image upload failed. Your local selection is still available.',
      });
    }
  };

  const selectImage = async () => {
    if (disabled || !onSelectRequest) return;
    try {
      const file = await onSelectRequest();
      if (!file) return;
      const validationError = validateMediaFile(file, acceptedMimeTypes, maxFileSizeBytes);
      if (validationError) {
        commit({ status: 'ERROR', error: validationError });
        return;
      }
      commit({ status: 'SELECTED_LOCAL', file });
      await upload(file);
    } catch {
      commit({ status: 'ERROR', error: 'Image selection failed. Please try again.' });
    }
  };

  const removeImage = async () => {
    if (disabled) return;
    const uploaded = currentState.status === 'UPLOADED'
      ? currentState.media
      : currentState.status === 'ERROR'
        ? currentState.media
        : undefined;
    if (uploaded && adapter) {
      try {
        await adapter.remove(uploaded.id);
      } catch {
        commit({
          status: 'ERROR',
          media: uploaded,
          error: 'The uploaded image could not be removed. Please try again.',
        });
        return;
      }
    }
    commit(EMPTY_MEDIA_STATE);
  };

  const statusCopy = (() => {
    switch (currentState.status) {
      case 'SELECTED_LOCAL':
        return adapter ? 'READY TO UPLOAD' : 'LOCAL PREVIEW — NOT UPLOADED';
      case 'UPLOADING':
        return `UPLOADING ${Math.round((currentState.progress ?? 0) * 100)}%`;
      case 'UPLOADED':
        return 'UPLOADED';
      case 'ERROR':
        return currentState.error;
      default:
        return pickerAvailable ? 'SELECT AN IMAGE' : 'IMAGE PICKER NOT CONNECTED';
    }
  })();

  const uploading = currentState.status === 'UPLOADING';
  const progress = currentState.status === 'UPLOADING' ? currentState.progress ?? 0 : 0;

  return (
    <FieldFrame
      label={label ?? MODE_LABELS[mode]}
      required={required}
      optional={optional}
      helperText={helperText}
      error={currentState.status === 'ERROR' ? currentState.error : undefined}
    >
      <View
        style={[fieldStyles.uploader, currentState.status === 'ERROR' && fieldStyles.uploaderError]}
        accessibilityLabel={`${MODE_LABELS[mode]} uploader, ${statusCopy}`}
      >
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={[fieldStyles.preview, aspectRatio ? { aspectRatio } : undefined]}
            resizeMode="cover"
            accessibilityLabel={`Selected ${MODE_LABELS[mode].toLowerCase()} preview`}
          />
        ) : (
          <View style={fieldStyles.uploaderEmpty}>
            <Text style={fieldStyles.uploaderTitle}>{MODE_LABELS[mode]}</Text>
            <Text style={fieldStyles.uploaderCopy}>
              {cropHint ?? 'Image crop guidance will appear here when configured.'}
            </Text>
          </View>
        )}
        {uploading ? (
          <View style={fieldStyles.progressTrack}>
            <View style={[fieldStyles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}
        <Text
          style={[
            currentState.status === 'ERROR' ? fieldStyles.error : fieldStyles.statusText,
            fieldStyles.uploaderStatus,
          ]}
          accessibilityLiveRegion="polite"
        >
          {currentState.status === 'ERROR' ? 'IMAGE NEEDS ATTENTION' : statusCopy}
        </Text>
        <View style={fieldStyles.uploaderActions}>
          <TouchableOpacity
            style={[fieldStyles.textAction, (!pickerAvailable || disabled || uploading) && fieldStyles.chipUnavailable]}
            onPress={() => void selectImage()}
            disabled={!pickerAvailable || disabled || uploading}
            accessibilityRole="button"
            accessibilityLabel={previewUri ? 'Replace image' : 'Select image'}
            accessibilityHint={!pickerAvailable
              ? 'A native image picker has not been connected.'
              : undefined}
            accessibilityState={{ disabled: !pickerAvailable || disabled || uploading, busy: uploading }}
          >
            <Text style={fieldStyles.textActionLabel}>{previewUri ? 'REPLACE' : 'SELECT IMAGE'}</Text>
          </TouchableOpacity>
          {currentState.status !== 'EMPTY' ? (
            <TouchableOpacity
              style={[fieldStyles.textAction, (disabled || uploading) && fieldStyles.chipUnavailable]}
              onPress={() => void removeImage()}
              disabled={disabled || uploading}
              accessibilityRole="button"
              accessibilityLabel="Remove image"
              accessibilityState={{ disabled: disabled || uploading }}
            >
              <Text style={[fieldStyles.textActionLabel, fieldStyles.removeActionLabel]}>REMOVE</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </FieldFrame>
  );
};
