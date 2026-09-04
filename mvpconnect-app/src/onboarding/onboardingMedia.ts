import { Platform } from 'react-native';
import api from '../services/api';
import type {
  MediaFile,
  MediaUploadAdapter,
  UploadedMedia,
} from '../components/onboarding/MediaUploader';

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

const blobFor = async (file: MediaFile): Promise<Blob> => {
  if (file.blob) return file.blob;
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('The selected image could not be read.');
  return response.blob();
};

export const pickOnboardingProfileImage = async (): Promise<MediaFile | undefined> => {
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
    name: asset.fileName ?? `profile-image-${Date.now()}.${extension}`,
    type: mimeType,
    size: asset.fileSize ?? blob.size,
    width: asset.width,
    height: asset.height,
    blob,
  };
};

export const uploadOnboardingProfileImage = async (
  stepKey: string,
  file: MediaFile,
  onProgress?: (progress: number) => void,
): Promise<UploadedMedia> => {
  onProgress?.(0.08);
  const initialized = await api.post<MediaUploadInitialization>('/media/uploads', {
    mediaType: 'PROFILE_IMAGE',
    mediaContext: 'PROFILE',
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    width: file.width ?? null,
    height: file.height ?? null,
    sortOrder: 0,
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

  await api.post(`/onboarding/steps/${stepKey}/media/${mediaId}`);
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

export const createOnboardingMediaAdapter = (stepKey: string): MediaUploadAdapter => ({
  upload: (file, onProgress) => uploadOnboardingProfileImage(stepKey, file, onProgress),
  remove: async (mediaId) => {
    await api.delete(`/media/${mediaId}`);
  },
});
