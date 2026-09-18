import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ImageGalleryUploader } from '../ImageGalleryUploader';
import type {
  MediaFile,
  MediaUploadAdapter,
  MediaUploaderState,
} from '../MediaUploader';

const file = (name: string): MediaFile => ({
  localId: name,
  uri: `file:///${name}`,
  name,
  type: 'image/jpeg',
  size: 100,
});

const uploaded = (id: string): MediaUploaderState => ({
  status: 'UPLOADED',
  media: { id, url: `https://media.example/${id}.jpg` },
});

const FIRST = uploaded('first');
const SECOND = uploaded('second');

const Harness = ({
  initialItems = [],
  maxCount = 8,
  onSelectRequest = jest.fn().mockResolvedValue([]),
  adapter,
  mobile = true,
}: {
  initialItems?: MediaUploaderState[];
  maxCount?: number;
  onSelectRequest?: (remainingCapacity: number) => Promise<readonly MediaFile[]>;
  adapter?: MediaUploadAdapter;
  mobile?: boolean;
}) => {
  const [items, setItems] = useState(initialItems);
  return (
    <>
      <Text testID="gallery-state">
        {items.map((item, index) => (
          item.status === 'UPLOADED' ? item.media.id : `${index}:${item.status}`
        )).join('|')}
      </Text>
      <ImageGalleryUploader
        items={items}
        onChange={setItems}
        maxCount={maxCount}
        onSelectRequest={onSelectRequest}
        adapter={adapter}
        mobile={mobile}
      />
    </>
  );
};

describe('ImageGalleryUploader', () => {
  it('renders compact successful tiles without generic uploader chrome', () => {
    const screen = render(<Harness initialItems={[FIRST, SECOND]} />);

    expect(screen.getAllByLabelText(/Selected gallery image \d preview/)).toHaveLength(2);
    expect(screen.queryByText('UPLOADED')).toBeNull();
    expect(screen.queryByText('CHANGE IMAGE →')).toBeNull();
    expect(screen.getAllByLabelText('Add gallery photos')).toHaveLength(1);
    expect(screen.getByLabelText('2 of 8 gallery slots occupied')).toBeTruthy();
    expect(screen.getByLabelText('Move image 1 earlier').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Move image 2 later').props.accessibilityState.disabled).toBe(true);
    expect(StyleSheet.flatten(screen.getByTestId('gallery-tile-1').props.style))
      .toEqual(expect.objectContaining({ width: '46%', maxWidth: '46%', minWidth: 0 }));
  });

  it('uses a configurable maximum, hides Add Photos at the limit, and reorders by array position', () => {
    const screen = render(<Harness initialItems={[FIRST, SECOND]} maxCount={2} />);

    expect(screen.queryByLabelText('Add gallery photos')).toBeNull();
    fireEvent.press(screen.getByLabelText('Move image 2 earlier'));
    expect(screen.getByTestId('gallery-state').props.children).toBe('second|first');
  });

  it('treats picker cancellation as a no-op', async () => {
    const adapter: MediaUploadAdapter = { upload: jest.fn(), remove: jest.fn() };
    const picker = jest.fn().mockResolvedValue([]);
    const screen = render(<Harness onSelectRequest={picker} adapter={adapter} />);

    fireEvent.press(screen.getByLabelText('Add gallery photos'));

    await waitFor(() => expect(picker).toHaveBeenCalledWith(8));
    expect(screen.getByLabelText('0 of 8 gallery slots occupied')).toBeTruthy();
    expect(adapter.upload).not.toHaveBeenCalled();
    expect(screen.queryByText('Images could not be selected. Please try again.')).toBeNull();
  });

  it('uploads selected files sequentially and clamps them to remaining capacity', async () => {
    let finishFirst: ((value: { id: string; url: string }) => void) | undefined;
    const firstUpload = new Promise<{ id: string; url: string }>((resolve) => {
      finishFirst = resolve;
    });
    const adapter: MediaUploadAdapter = {
      upload: jest.fn()
        .mockReturnValueOnce(firstUpload)
        .mockResolvedValueOnce({ id: 'second-new', url: 'https://media.example/second-new.jpg' }),
      remove: jest.fn(),
    };
    const picker = jest.fn().mockResolvedValue([file('one.jpg'), file('two.jpg'), file('ignored.jpg')]);
    const screen = render(
      <Harness initialItems={[FIRST, SECOND]} maxCount={4} onSelectRequest={picker} adapter={adapter} />,
    );

    fireEvent.press(screen.getByLabelText('Add gallery photos'));
    await waitFor(() => expect(adapter.upload).toHaveBeenCalledTimes(1));
    expect(adapter.upload).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: 'one.jpg' }), expect.any(Function));
    expect(screen.getByLabelText('4 of 4 gallery slots occupied')).toBeTruthy();
    expect(screen.queryByLabelText('Add gallery photos')).toBeNull();
    expect(screen.getByLabelText('Move image 3 earlier').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Move image 3 later').props.accessibilityState.disabled).toBe(true);

    await act(async () => finishFirst?.({ id: 'first-new', url: 'https://media.example/first-new.jpg' }));
    await waitFor(() => expect(adapter.upload).toHaveBeenCalledTimes(2));
    expect(adapter.upload).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: 'two.jpg' }), expect.any(Function));
    expect(adapter.upload).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'ignored.jpg' }), expect.anything());
  });

  it('preserves partial successes, continues after failure, and retries the failed tile in place', async () => {
    const attempts: Record<string, number> = {};
    const upload = jest.fn().mockImplementation(async (selected: MediaFile) => {
      attempts[selected.name] = (attempts[selected.name] ?? 0) + 1;
      if (selected.name === 'two.jpg' && attempts[selected.name] === 1) throw new Error('offline');
      return { id: selected.name, url: `https://media.example/${selected.name}` };
    });
    const adapter: MediaUploadAdapter = {
      upload,
      remove: jest.fn(),
    };
    const screen = render(
      <Harness
        onSelectRequest={jest.fn().mockResolvedValue([
          file('one.jpg'), file('two.jpg'), file('three.jpg'),
        ])}
        adapter={adapter}
      />,
    );

    fireEvent.press(screen.getByLabelText('Add gallery photos'));

    await waitFor(() => expect(adapter.upload).toHaveBeenCalledTimes(3));
    expect(upload.mock.calls.map(([selected]: [MediaFile]) => selected.name))
      .toEqual(['one.jpg', 'two.jpg', 'three.jpg']);
    expect(screen.getByLabelText('Retry image 2 upload')).toBeTruthy();
    expect(screen.getByTestId('gallery-state').props.children)
      .toBe('one.jpg|1:ERROR|three.jpg');

    fireEvent.press(screen.getByLabelText('Retry image 2 upload'));
    await waitFor(() => expect(screen.queryByLabelText('Retry image 2 upload')).toBeNull());
    expect(screen.getByTestId('gallery-state').props.children)
      .toBe('one.jpg|two.jpg|three.jpg');
  });

  it('removes a failed local item without a backend delete and frees its slot', async () => {
    const adapter: MediaUploadAdapter = {
      upload: jest.fn().mockRejectedValue(new Error('offline')),
      remove: jest.fn(),
    };
    const screen = render(
      <Harness maxCount={1} onSelectRequest={jest.fn().mockResolvedValue([file('failed.jpg')])} adapter={adapter} />,
    );

    fireEvent.press(screen.getByLabelText('Add gallery photos'));
    await screen.findByLabelText('Retry image 1 upload');
    expect(screen.queryByLabelText('Add gallery photos')).toBeNull();

    fireEvent.press(screen.getByLabelText('Remove image 1'));
    await waitFor(() => expect(screen.getByLabelText('0 of 1 gallery slots occupied')).toBeTruthy());
    expect(screen.getByLabelText('Add gallery photos')).toBeTruthy();
    expect(adapter.remove).not.toHaveBeenCalled();
  });

  it('uses the destructive adapter removal for uploaded media', async () => {
    const adapter: MediaUploadAdapter = {
      upload: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const screen = render(<Harness initialItems={[FIRST]} adapter={adapter} />);

    expect(screen.getByLabelText('Move image 1 earlier').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Move image 1 later').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByLabelText('Remove image 1'));

    await waitFor(() => expect(adapter.remove).toHaveBeenCalledWith('first'));
    expect(screen.getByLabelText('0 of 8 gallery slots occupied')).toBeTruthy();
  });
});
