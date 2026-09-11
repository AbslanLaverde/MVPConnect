import type { MediaUploaderState, UploadedMedia } from '../components/onboarding/MediaUploader';
import type { SelfProfileMedia } from './onboardingApi';

export interface MediaReference {
  mediaId: string;
}

export interface GalleryMediaReference extends MediaReference {
  key: string;
  sortOrder: number;
  media: UploadedMedia;
}

export const mediaUploaderStateKey = (
  item: MediaUploaderState,
  fallbackIndex: number,
): string => {
  if ('media' in item && item.media?.id) return `media:${item.media.id}`;
  if ('file' in item && item.file) return `file:${item.file.uri}:${item.file.name}`;
  return `slot:${fallbackIndex}`;
};

const mediaUploaderStateIdentities = (item: MediaUploaderState): string[] => {
  const identities: string[] = [];
  if ('media' in item && item.media?.id) identities.push(`media:${item.media.id}`);
  if ('file' in item && item.file) identities.push(`file:${item.file.uri}:${item.file.name}`);
  return identities;
};

export const updateGalleryUploaderState = (
  items: readonly MediaUploaderState[],
  targetKey: string,
  nextState: MediaUploaderState,
): MediaUploaderState[] => {
  if (nextState.status === 'EMPTY') {
    return items.filter((item, index) => mediaUploaderStateKey(item, index) !== targetKey);
  }
  return items.map((item, index) => (
    mediaUploaderStateKey(item, index) === targetKey ? nextState : item
  ));
};

export const upsertGalleryUploaderState = (
  items: readonly MediaUploaderState[],
  nextState: MediaUploaderState,
  maximum: number,
): MediaUploaderState[] => {
  if (nextState.status === 'EMPTY') return [...items];
  const nextIdentities = new Set(mediaUploaderStateIdentities(nextState));
  const existing = items.findIndex((item) => (
    mediaUploaderStateIdentities(item).some((identity) => nextIdentities.has(identity))
  ));
  if (existing >= 0) {
    return items.map((item, index) => index === existing ? nextState : item);
  }
  if (items.length >= maximum) return [...items];
  return [...items, nextState];
};

export const hydrateGallery = (
  media: readonly SelfProfileMedia[] | null | undefined,
): GalleryMediaReference[] => (media ?? []).map((item, sortOrder) => ({
  key: `media:${item.mediaId}`,
  mediaId: item.mediaId,
  sortOrder,
  media: {
    id: item.mediaId,
    url: item.url,
    mimeType: item.mimeType,
    width: item.width,
    height: item.height,
  },
}));

export const galleryStates = (
  media: readonly GalleryMediaReference[],
): MediaUploaderState[] => media.map((item) => ({ status: 'UPLOADED', media: item.media }));

export const galleryReferences = (
  items: readonly MediaUploaderState[],
  maximum: number,
): MediaReference[] => {
  const references = items.flatMap((item) => (
    'media' in item && item.media ? [{ mediaId: item.media.id }] : []
  ));
  if (references.length > maximum) throw new Error(`Gallery supports at most ${maximum} images.`);
  return references;
};

export const reorderGallery = <Item,>(
  items: readonly Item[],
  from: number,
  to: number,
): Item[] => {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export const removeGalleryEntry = <Item extends { mediaId: string }>(
  items: readonly Item[],
  mediaId: string,
): Item[] => items.filter((item) => item.mediaId !== mediaId);

export const upsertSuccessfulGalleryEntry = (
  items: readonly GalleryMediaReference[],
  media: UploadedMedia,
): GalleryMediaReference[] => {
  const existing = items.findIndex((item) => item.mediaId === media.id);
  const next = existing < 0
    ? [...items, { key: `media:${media.id}`, mediaId: media.id, sortOrder: items.length, media }]
    : items.map((item, index) => index === existing ? { ...item, media } : item);
  return next.map((item, sortOrder) => ({ ...item, sortOrder }));
};
