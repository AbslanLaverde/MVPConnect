import api from '../../services/api';
import { uploadOnboardingProfileImage } from '../onboardingMedia';

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
});

