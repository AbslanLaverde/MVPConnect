import api from '../../services/api';
import {
  createOnboardingBannerAdapter,
  createOnboardingGalleryAdapter,
  onboardingMediaContexts,
  pickOnboardingImage,
  pickOnboardingImages,
  pickOnboardingProfileImage,
  uploadOnboardingProfileImage,
} from '../onboardingMedia';

const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: mockRequestMediaLibraryPermissions,
  launchImageLibraryAsync: mockLaunchImageLibrary,
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('onboarding media adapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
  });

  it('keeps the Hero/Profile picker single-select', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'file:///hero.jpg',
        fileName: 'hero.jpg',
        mimeType: 'image/jpeg',
        fileSize: 100,
        width: 1500,
        height: 500,
        file: new Blob(['hero'], { type: 'image/jpeg' }),
      }],
    });

    const selected = await pickOnboardingImage();

    expect(selected?.name).toBe('hero.jpg');
    expect(mockLaunchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({
      allowsEditing: false,
      allowsMultipleSelection: false,
    }));
    expect(pickOnboardingProfileImage).toBe(pickOnboardingImage);
  });

  it('enables Gallery multi-select, preserves returned order, and clamps every platform result', async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: ['one', 'two', 'ignored'].map((name) => ({
        uri: `file:///${name}.jpg`,
        fileName: `${name}.jpg`,
        mimeType: 'image/jpeg',
        fileSize: 100,
        width: 1200,
        height: 900,
        file: new Blob([name], { type: 'image/jpeg' }),
      })),
    });

    const selected = await pickOnboardingImages(2);

    expect(selected.map((item) => item.name)).toEqual(['one.jpg', 'two.jpg']);
    expect(new Set(selected.map((item) => item.localId)).size).toBe(2);
    expect(mockLaunchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 2,
      orderedSelection: true,
    }));
  });

  it('returns an empty Gallery selection on cancel and never opens a full picker', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });

    await expect(pickOnboardingImages(4)).resolves.toEqual([]);
    expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    await expect(pickOnboardingImages(0)).resolves.toEqual([]);
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });

  it('initializes, uploads directly, completes, and associates without leaking JWT data', async () => {
    mockedApi.post
      .mockResolvedValueOnce({
        data: {
          mediaId: 'media-123',
          status: 'PENDING',
          uploadUrl: 'http://127.0.0.1:9000/upload-signature',
          requiredHeaders: { 'Content-Type': 'image/jpeg' },
        },
      } as any)
      .mockResolvedValueOnce({
        data: {
          id: 'media-123',
          status: 'READY',
          mediaType: 'PROFILE_IMAGE',
          mediaContext: 'PROFILE',
          originalFileName: 'artist.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          url: 'http://127.0.0.1:9000/access-signature',
        },
      } as any)
      .mockResolvedValueOnce({ data: undefined } as any);
    const directUpload = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = directUpload as any;

    const result = await uploadOnboardingProfileImage('basics', {
      uri: 'file:///artist.jpg',
      name: 'artist.jpg',
      type: 'image/jpeg',
      size: 1024,
      width: 800,
      height: 1000,
      blob: {} as Blob,
    });

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/media/uploads', expect.objectContaining({
      mediaType: 'PROFILE_IMAGE',
      mediaContext: 'PROFILE',
      fileName: 'artist.jpg',
    }));
    expect(directUpload).toHaveBeenCalledWith(
      'http://127.0.0.1:9000/upload-signature',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: expect.anything(),
      },
    );
    expect(directUpload.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(mockedApi.post).toHaveBeenNthCalledWith(2, '/media/media-123/complete');
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/onboarding/steps/basics/media/media-123');
    expect(result.id).toBe('media-123');
    expect(JSON.stringify(result)).not.toContain('upload-signature');
  });

  it('uses persona-appropriate banner and gallery contexts', () => {
    expect(onboardingMediaContexts('artist')).toEqual({ banner: 'PROFILE', gallery: 'PERFORMANCE' });
    expect(onboardingMediaContexts('venue')).toEqual({ banner: 'VENUE', gallery: 'VENUE' });
    expect(onboardingMediaContexts('promoter')).toEqual({ banner: 'EVENT', gallery: 'EVENT' });
  });

  it.each([
    ['banner', createOnboardingBannerAdapter('media', 'EVENT'), 'BANNER_IMAGE', 'EVENT', 0],
    ['gallery', createOnboardingGalleryAdapter('media', 'PERFORMANCE', 4), 'GALLERY_IMAGE', 'PERFORMANCE', 4],
  ] as const)('supports the generalized %s adapter', async (
    _label, adapter, mediaType, mediaContext, sortOrder,
  ) => {
    mockedApi.post
      .mockResolvedValueOnce({ data: {
        mediaId: 'media-456', status: 'PENDING', uploadUrl: 'https://storage.example/signed',
        requiredHeaders: { 'Content-Type': 'image/webp' },
      } } as any)
      .mockResolvedValueOnce({ data: {
        id: 'media-456', status: 'READY', mediaType, mediaContext,
        originalFileName: 'media.webp', mimeType: 'image/webp', sizeBytes: 100,
        url: 'https://storage.example/read',
      } } as any)
      .mockResolvedValueOnce({ data: undefined } as any);
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    await adapter.upload({
      uri: 'file:///media.webp', name: 'media.webp', type: 'image/webp', size: 100,
      blob: {} as Blob,
    });

    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/media/uploads', expect.objectContaining({
      mediaType, mediaContext, sortOrder,
    }));
    expect(mockedApi.post).toHaveBeenNthCalledWith(3, '/onboarding/steps/media/media/media-456');
  });

  it('uses the authenticated API only for explicit metadata/object removal', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: undefined } as any);
    const adapter = createOnboardingGalleryAdapter('media');

    await adapter.remove('media-123');

    expect(mockedApi.delete).toHaveBeenCalledWith('/media/media-123');
  });
});

