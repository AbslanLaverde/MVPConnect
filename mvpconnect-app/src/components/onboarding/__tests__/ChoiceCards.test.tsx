import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChoiceCards } from '../ChoiceCards';

const Harness = () => {
  const [value, setValue] = useState<string>();
  return (
    <ChoiceCards
      label="Travel radius"
      value={value}
      onChange={setValue}
      options={[
        { value: 'local', label: 'Local', description: 'Within the city' },
        { value: 'regional', label: 'Regional', description: 'Within the region' },
      ]}
    />
  );
};

describe('ChoiceCards', () => {
  it('keeps exactly one active selection and exposes selected state accessibly', () => {
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText('Local'));
    expect(screen.getByLabelText('Local').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Regional').props.accessibilityState.checked).toBe(false);

    fireEvent.press(screen.getByLabelText('Regional'));
    expect(screen.getByLabelText('Local').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText('Regional').props.accessibilityState.checked).toBe(true);
  });
});
