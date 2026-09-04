import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  DEFAULT_MAX_IMAGE_BYTES,
  MediaFile,
  MediaUploadAdapter,
  MediaUploader,
} from '../MediaUploader';

const IMAGE: MediaFile = {
  uri: 'file:///performance.jpg',
  name: 'performance.jpg',
  type: 'image/jpeg',
  size: 1024,
};

describe('MediaUploader', () => {
  it('rejects unsupported file types', async () => {
    const screen = render(
      <MediaUploader
        mode="PROFILE_IMAGE"
        onSelectRequest={async () => ({ ...IMAGE, type: 'video/mp4' })}
      />,
    );

    fireEvent.press(screen.getByLabelText('Select image'));
    expect(await screen.findByText('Choose a supported image file.')).toBeTruthy();
  });

  it('rejects oversized files', async () => {
    const screen = render(
      <MediaUploader
        mode="BANNER_IMAGE"
        onSelectRequest={async () => ({ ...IMAGE, size: DEFAULT_MAX_IMAGE_BYTES + 1 })}
      />,
    );

    fireEvent.press(screen.getByLabelText('Select image'));
    expect(await screen.findByText('Choose an image smaller than 10 MB.')).toBeTruthy();
  });

  it('shows a truthful local preview and supports replace and remove without an adapter', async () => {
    const replacement = { ...IMAGE, uri: 'file:///replacement.png', name: 'replacement.png', type: 'image/png' };
    const picker = jest.fn()
      .mockResolvedValueOnce(IMAGE)
      .mockResolvedValueOnce(replacement);
    const onStateChange = jest.fn();
    const screen = render(
      <MediaUploader
        mode="GALLERY_IMAGE"
        onSelectRequest={picker}
        onStateChange={onStateChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('Select image'));
    await screen.findByText('LOCAL PREVIEW — NOT UPLOADED');
    expect(onStateChange).toHaveBeenLastCalledWith({ status: 'SELECTED_LOCAL', file: IMAGE });

    fireEvent.press(screen.getByLabelText('Replace image'));
    await waitFor(() => expect(onStateChange).toHaveBeenLastCalledWith({
      status: 'SELECTED_LOCAL',
      file: replacement,
    }));

    fireEvent.press(screen.getByLabelText('Remove image'));
    expect(onStateChange).toHaveBeenLastCalledWith({ status: 'EMPTY' });
  });

  it('shows adapter upload errors without claiming persistence', async () => {
    const adapter: MediaUploadAdapter = {
      upload: jest.fn().mockRejectedValue(new Error('offline')),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const screen = render(
      <MediaUploader mode="PROFILE_IMAGE" adapter={adapter} onSelectRequest={async () => IMAGE} />,
    );

    fireEvent.press(screen.getByLabelText('Select image'));

    expect(await screen.findByText("We couldn't save this image."))
      .toBeTruthy();
    expect(adapter.upload).toHaveBeenCalledWith(IMAGE, expect.any(Function));
  });

  it('removes an uploaded preview immediately while deletion is in progress', async () => {
    let finishRemoval: (() => void) | undefined;
    const removal = new Promise<void>((resolve) => {
      finishRemoval = resolve;
    });
    const adapter: MediaUploadAdapter = {
      upload: jest.fn(),
      remove: jest.fn(() => removal),
    };
    const screen = render(
      <MediaUploader
        mode="PROFILE_IMAGE"
        defaultState={{
          status: 'UPLOADED',
          media: { id: 'media-1', url: 'https://example.com/profile.jpg' },
        }}
        adapter={adapter}
        onSelectRequest={async () => IMAGE}
      />,
    );

    expect(screen.getByLabelText('Selected profile image preview')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Remove image'));

    expect(screen.queryByLabelText('Selected profile image preview')).toBeNull();
    expect(screen.getByText('REMOVING IMAGE…')).toBeTruthy();
    expect(screen.getByLabelText('Select image').props.accessibilityState.busy).toBe(true);

    await act(async () => finishRemoval?.());
    await screen.findByText('SELECT AN IMAGE');
    expect(adapter.remove).toHaveBeenCalledWith('media-1');
  });
});
