import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NumberField, validateNumberFieldValue } from '../NumberField';
import { TextArea } from '../TextArea';
import { UrlField, validateUrlValue } from '../UrlField';

describe('onboarding field primitives', () => {
  it('communicates optional fields and configured character counts', () => {
    const screen = render(
      <TextArea
        label="Biography"
        optional
        value="Live music"
        onChangeText={jest.fn()}
        maxLength={100}
        showCharacterCount
      />,
    );

    expect(screen.getByText('OPTIONAL')).toBeTruthy();
    expect(screen.getByText('10 / 100')).toBeTruthy();
  });

  it('validates numeric ranges inline', () => {
    expect(validateNumberFieldValue('', { required: false })).toBeUndefined();
    expect(validateNumberFieldValue('10.5', { integerOnly: true })).toBe('Enter a whole number.');
    expect(validateNumberFieldValue('12', { min: 20 })).toBe('Enter a value of 20 or more.');

    const screen = render(
      <NumberField label="Capacity" value={10} onChange={jest.fn()} min={20} />,
    );
    fireEvent(screen.getByLabelText('Capacity'), 'blur');
    expect(screen.getByText('Enter a value of 20 or more.')).toBeTruthy();
  });

  it('accepts empty optional and valid URLs while rejecting malformed populated URLs', () => {
    expect(validateUrlValue('', false)).toBeUndefined();
    expect(validateUrlValue('not a url', false)).toMatch('Enter a valid URL');
    expect(validateUrlValue('https://mvpconnect.example', false)).toBeUndefined();

    const screen = render(
      <UrlField label="Website" value="not a url" onChange={jest.fn()} optional />,
    );
    fireEvent(screen.getByLabelText('Website, optional'), 'blur');
    expect(screen.getByText('Enter a valid URL beginning with http:// or https://.')).toBeTruthy();
  });
});
