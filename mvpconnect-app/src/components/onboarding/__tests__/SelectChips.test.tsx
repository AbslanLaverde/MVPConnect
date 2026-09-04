import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SelectChips } from '../SelectChips';

const OPTIONS = [
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'folk', label: 'Folk' },
];

const Harness = ({ maxSelections = 2 }: { maxSelections?: number }) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <SelectChips
      label="Genres"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      maxSelections={maxSelections}
    />
  );
};

describe('SelectChips', () => {
  it('selects and deselects values inline', () => {
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText('Rock'));
    expect(screen.getByLabelText('Rock').props.accessibilityState.checked).toBe(true);

    fireEvent.press(screen.getByLabelText('Rock'));
    expect(screen.getByLabelText('Rock').props.accessibilityState.checked).toBe(false);
  });

  it('makes unselected chips unavailable at the maximum while permitting deselection', () => {
    const screen = render(<Harness maxSelections={2} />);

    fireEvent.press(screen.getByLabelText('Rock'));
    fireEvent.press(screen.getByLabelText('Jazz'));

    expect(screen.getByLabelText('Folk').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText('MAXIMUM 2 SELECTED — DESELECT ONE TO CHANGE.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Rock'));
    expect(screen.getByLabelText('Folk').props.accessibilityState.disabled).toBe(false);
  });
});
