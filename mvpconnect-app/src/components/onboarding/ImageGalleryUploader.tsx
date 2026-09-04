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

export interface ImageGalleryUploaderProps {
  items: readonly MediaUploaderState[];
  onChange: (items: MediaUploaderState[]) => void;
  maxCount: number;
  onSelectRequest?: (slotIndex: number) => Promise<MediaFile | undefined>;
  adapter?: MediaUploadAdapter;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  aspectRatio?: number;
  cropHint?: string;
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
}) => {
  const hasRoom = items.length < maxCount;

  return (
    <FieldFrame
      label={label}
      helperText={helperText ?? `${items.length} of ${maxCount} images selected.`}
    >
      <View style={fieldStyles.galleryList}>
        {items.map((item, index) => (
          <View key={`${index}:${item.status}`}>
            <MediaUploader
              mode="GALLERY_IMAGE"
              label={`IMAGE ${index + 1}`}
              state={item}
              onStateChange={(nextState) => {
                if (nextState.status === 'EMPTY') {
                  onChange(items.filter((_, candidateIndex) => candidateIndex !== index));
                  return;
                }
                onChange(items.map((candidate, candidateIndex) => (
                  candidateIndex === index ? nextState : candidate
                )));
              }}
              onSelectRequest={onSelectRequest ? () => onSelectRequest(index) : undefined}
              adapter={adapter}
              disabled={disabled}
              aspectRatio={aspectRatio}
              cropHint={cropHint}
            />
            <View style={fieldStyles.galleryOrderActions}>
              <TouchableOpacity
                style={[fieldStyles.textAction, (disabled || index === 0) && fieldStyles.chipUnavailable]}
                onPress={() => onChange(moveItem(items, index, index - 1))}
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
                onPress={() => onChange(moveItem(items, index, index + 1))}
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
              if (nextState.status !== 'EMPTY') onChange([...items, nextState]);
            }}
            onSelectRequest={onSelectRequest ? () => onSelectRequest(items.length) : undefined}
            adapter={adapter}
            disabled={disabled}
            aspectRatio={aspectRatio}
            cropHint={cropHint}
          />
        ) : (
          <Text style={fieldStyles.limitText}>{`GALLERY LIMIT REACHED (${maxCount}).`}</Text>
        )}
      </View>
    </FieldFrame>
  );
};
