import type { MediaUploaderState } from '../../components/onboarding/MediaUploader';
import {
  galleryReferences,
  hydrateGallery,
  mediaUploaderStateKey,
  removeGalleryEntry,
  reorderGallery,
  updateGalleryUploaderState,
  upsertGalleryUploaderState,
  upsertSuccessfulGalleryEntry,
} from '../mediaFoundation';

const uploaded = (id: string): MediaUploaderState => ({
  status: 'UPLOADED',
  media: { id, url: `https://media.example/${id}` },
});

describe('media gallery foundation', () => {
  it('hydrates ordered self media with stable IDs and preview URLs', () => {
    const result = hydrateGallery([
      { mediaId: 'two', url: 'https://media.example/two', mimeType: 'image/jpeg' },
      { mediaId: 'one', url: 'https://media.example/one', mimeType: 'image/webp' },
    ]);

    expect(result.map(({ key, mediaId, sortOrder }) => ({ key, mediaId, sortOrder }))).toEqual([
      { key: 'media:two', mediaId: 'two', sortOrder: 0 },
      { key: 'media:one', mediaId: 'one', sortOrder: 1 },
    ]);
  });

  it('preserves order through reorder, removal, and request serialization', () => {
    const items = [uploaded('one'), uploaded('two'), uploaded('three')];
    const reordered = reorderGallery(items, 2, 0);

    expect(galleryReferences(reordered, 3)).toEqual([
      { mediaId: 'three' }, { mediaId: 'one' }, { mediaId: 'two' },
    ]);
    expect(removeGalleryEntry([
      { mediaId: 'one' }, { mediaId: 'two' },
    ], 'one')).toEqual([{ mediaId: 'two' }]);
  });

  it('enforces the persona-provided maximum', () => {
    expect(() => galleryReferences([uploaded('one'), uploaded('two')], 1))
      .toThrow('Gallery supports at most 1 images.');
  });

  it('updates a failed item without erasing another successful upload', () => {
    const successful = uploaded('ready');
    const pending: MediaUploaderState = {
      status: 'UPLOADING',
      file: { uri: 'file:///pending.jpg', name: 'pending.jpg', type: 'image/jpeg', size: 20 },
    };
    const failed: MediaUploaderState = {
      status: 'ERROR',
      file: pending.file,
      error: 'Upload failed.',
    };
    const targetKey = mediaUploaderStateKey(pending, 1);

    expect(updateGalleryUploaderState([successful, pending], targetKey, failed)).toEqual([
      successful, failed,
    ]);
  });

  it('coalesces progress and completion for one local file instead of duplicating it', () => {
    const file = { uri: 'file:///new.jpg', name: 'new.jpg', type: 'image/jpeg', size: 20 };
    const selected: MediaUploaderState = { status: 'SELECTED_LOCAL', file };
    const uploading: MediaUploaderState = { status: 'UPLOADING', file, progress: 0.5 };
    const complete: MediaUploaderState = {
      status: 'UPLOADED',
      file,
      media: { id: 'new', url: 'https://media.example/new' },
    };

    const afterSelection = upsertGalleryUploaderState([], selected, 8);
    const afterProgress = upsertGalleryUploaderState(afterSelection, uploading, 8);
    const afterComplete = upsertGalleryUploaderState(afterProgress, complete, 8);

    expect(afterComplete).toEqual([complete]);
    expect(mediaUploaderStateKey(afterComplete[0], 0)).toBe('media:new');
  });

  it('upserts a completed entry without changing other stable entries', () => {
    const first = hydrateGallery([
      { mediaId: 'one', url: 'https://old.example/one', mimeType: 'image/jpeg' },
    ]);
    const result = upsertSuccessfulGalleryEntry(first, {
      id: 'two', url: 'https://media.example/two', mimeType: 'image/jpeg',
    });

    expect(result.map((item) => item.mediaId)).toEqual(['one', 'two']);
    expect(result.map((item) => item.sortOrder)).toEqual([0, 1]);
  });
});
