import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ImageGalleryUploader } from '../ImageGalleryUploader';
import { MediaUploaderState } from '../MediaUploader';

const FIRST: MediaUploaderState = {
  status: 'SELECTED_LOCAL',
  file: { uri: 'file:///first.jpg', name: 'first.jpg', type: 'image/jpeg', size: 100 },
};
const SECOND: MediaUploaderState = {
  status: 'SELECTED_LOCAL',
  file: { uri: 'file:///second.jpg', name: 'second.jpg', type: 'image/jpeg', size: 100 },
};

describe('ImageGalleryUploader', () => {
  it('uses a configurable maximum and exposes reorder behavior', () => {
    const onChange = jest.fn();
    const screen = render(
      <ImageGalleryUploader items={[FIRST, SECOND]} onChange={onChange} maxCount={2} />,
    );

    expect(screen.getByText('GALLERY LIMIT REACHED (2).')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Move image 2 earlier'));
    expect(onChange).toHaveBeenCalledWith([SECOND, FIRST]);
  });
});
