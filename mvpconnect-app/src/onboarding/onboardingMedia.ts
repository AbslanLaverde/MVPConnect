import { Platform } from 'react-native';
import api from '../services/api';
import type {
  MediaFile,
  MediaUploadAdapter,
  UploadedMedia,
} from '../components/onboarding/MediaUploader';
import type { OnboardingPersona } from './onboardingTypes';

export interface MediaUploadInitialization {
  mediaId: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
}

export interface OwnedMediaResponse {
  id: string;
  mediaType: 'PROFILE_IMAGE' | 'BANNER_IMAGE' | 'GALLERY_IMAGE';
  mediaContext: 'PROFILE' | 'PERFORMANCE' | 'VENUE' | 'EVENT';
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sortOrder?: number;
  status: 'PENDING' | 'READY' | 'FAILED';
  url?: string;
}

export type MediaType = OwnedMediaResponse['mediaType'];
export type MediaContext = OwnedMediaResponse['mediaContext'];

export const onboardingMediaContexts = (persona: OnboardingPersona): {
  banner: MediaContext;
  gallery: MediaContext;
} => {
  if (persona === 'venue') return { banner: 'VENUE', gallery: 'VENUE' };
  if (persona === 'promoter') return { banner: 'EVENT', gallery: 'EVENT' };
  return { banner: 'PROFILE', gallery: 'PERFORMANCE' };
};

export interface OnboardingMediaUploadOptions {
  stepKey: string;
  mediaType: MediaType;
  mediaContext: MediaContext;
  sortOrder?: number;
}

const blobFor = async (file: MediaFile): Promise<Blob> => {
  if (file.blob) return file.blob;
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('The selected image could not be read.');
  return response.blob();
};

export const pickOnboardingImage = async (): Promise<MediaFile | undefined> => {
  const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo library access is required to choose an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return undefined;

  const asset = result.assets[0];
  const browserFile = (asset as import('expo-image-picker').ImagePickerAsset & { file?: Blob }).file;
  let blob = browserFile as Blob | undefined;
  if (!blob) {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('The selected image could not be read.');
    blob = await response.blob();
  }

  const mimeType = asset.mimeType ?? blob.type ?? 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `onboarding-image-${Date.now()}.${extension}`,
    type: mimeType,
    size: asset.fileSize ?? blob.size,
    width: asset.width,
    height: asset.height,
    blob,
  };
};

export const uploadOnboardingMedia = async (
  options: OnboardingMediaUploadOptions,
  file: MediaFile,
  onProgress?: (progress: number) => void,
): Promise<UploadedMedia> => {
  onProgress?.(0.08);
  const initialized = await api.post<MediaUploadInitialization>('/media/uploads', {
    mediaType: options.mediaType,
    mediaContext: options.mediaContext,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    width: file.width ?? null,
    height: file.height ?? null,
    sortOrder: options.sortOrder ?? null,
  });

  const { mediaId, uploadUrl, requiredHeaders } = initialized.data;
  const blob = await blobFor(file);
  onProgress?.(0.25);

  // Deliberately use the global fetch client here. The authenticated Axios client
  // must never attach the MVPConnect bearer token to a presigned storage URL.
  const storageResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: requiredHeaders,
    body: blob,
  });
  if (!storageResponse.ok) throw new Error('The image could not be sent to storage.');
  onProgress?.(0.72);

  const completed = await api.post<OwnedMediaResponse>(`/media/${mediaId}/complete`);
  if (completed.data.status !== 'READY') throw new Error('The image did not become ready.');
  onProgress?.(0.9);

  await api.post(`/onboarding/steps/${options.stepKey}/media/${mediaId}`);
  onProgress?.(1);

  return {
    id: mediaId,
    url: completed.data.url ?? file.uri,
    fileName: completed.data.originalFileName,
    mimeType: completed.data.mimeType,
    width: completed.data.width,
    height: completed.data.height,
  };
};

// Kept for Step 1 compatibility. Media screens use the generic name because the
// same picker now feeds profile, banner, and gallery uploads.
export const pickOnboardingProfileImage = pickOnboardingImage;

export const fetchOwnedMedia = async (mediaId: string): Promise<OwnedMediaResponse> => {
  const response = await api.get<OwnedMediaResponse>(`/media/${mediaId}`);
  return response.data;
};

export const uploadOnboardingProfileImage = async (
  stepKey: string,
  file: MediaFile,
  onProgress?: (progress: number) => void,
): Promise<UploadedMedia> => uploadOnboardingMedia({
  stepKey,
  mediaType: 'PROFILE_IMAGE',
  mediaContext: 'PROFILE',
  sortOrder: 0,
}, file, onProgress);

export const createOnboardingMediaAdapter = (
  stepKey: string,
  configuration: Omit<OnboardingMediaUploadOptions, 'stepKey'> = {
    mediaType: 'PROFILE_IMAGE',
    mediaContext: 'PROFILE',
    sortOrder: 0,
  },
): MediaUploadAdapter => ({
  upload: (file, onProgress) => uploadOnboardingMedia(
    { stepKey, ...configuration },
    file,
    onProgress,
  ),
  remove: async (mediaId) => {
    await api.delete(`/media/${mediaId}`);
  },
});

export const createOnboardingBannerAdapter = (
  stepKey: string,
  mediaContext: MediaContext = 'PROFILE',
): MediaUploadAdapter => createOnboardingMediaAdapter(stepKey, {
  mediaType: 'BANNER_IMAGE',
  mediaContext,
  sortOrder: 0,
});

export const createOnboardingGalleryAdapter = (
  stepKey: string,
  mediaContext: MediaContext = 'PROFILE',
  sortOrder?: number,
): MediaUploadAdapter => createOnboardingMediaAdapter(stepKey, {
  mediaType: 'GALLERY_IMAGE',
  mediaContext,
  sortOrder,
});
