import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG, type OnboardingPersonaConfig } from '../../../onboarding/onboardingConfig';
import { SelectChips } from '../SelectChips';

const OPTIONS = [
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'folk', label: 'Folk' },
];

interface TestNode {
  parent: TestNode | null;
  props: Record<string, unknown>;
}

const hasAncestorProp = (
  node: TestNode,
  prop: string,
  value: unknown,
): boolean => {
  let ancestor = node.parent;
  while (ancestor) {
    if (ancestor.props[prop] === value) return true;
    ancestor = ancestor.parent;
  }
  return false;
};

interface HarnessProps {
  maxSelections?: number;
  initialValue?: string[];
  accentConfig?: OnboardingPersonaConfig;
  variant?: 'compact' | 'expressive';
}

const Harness = ({
  maxSelections = 2,
  initialValue = [],
  accentConfig,
  variant = 'compact',
}: HarnessProps) => {
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <SelectChips
      label="Genres"
      options={OPTIONS}
      value={value}
      onChange={setValue}
      maxSelections={maxSelections}
      accentConfig={accentConfig}
      variant={variant}
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

  it.each([
    ['compact', 'compact'],
    ['expressive', 'expressive'],
  ] as const)('renders the selected Artist %s accent inside a full-bounds background host', (_label, variant) => {
    const screen = render(
      <Harness
        initialValue={['rock']}
        accentConfig={ONBOARDING_CONFIG.artist}
        variant={variant}
      />,
    );

    const tile = screen.getByLabelText('Rock');
    const host = screen.getByTestId('Genres-rock-selected-background');
    const accent = screen.getByTestId('Genres-rock-selected-accent');
    const selectedLabel = screen.getByText('Rock ×');

    expect(StyleSheet.flatten(host.props.style)).toMatchObject({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(host.props.pointerEvents).toBe('none');
    expect(hasAncestorProp(accent, 'testID', 'Genres-rock-selected-background')).toBe(true);
    expect(StyleSheet.flatten(accent.props.style)).toMatchObject({
      width: '100%',
      height: '100%',
    });
    expect(hasAncestorProp(host, 'accessibilityLabel', tile.props.accessibilityLabel)).toBe(true);
    expect(hasAncestorProp(selectedLabel, 'accessibilityLabel', tile.props.accessibilityLabel)).toBe(true);
    expect(StyleSheet.flatten(selectedLabel.props.style).zIndex).toBe(1);
  });

  it('does not render a selected background for an unselected option', () => {
    const screen = render(<Harness accentConfig={ONBOARDING_CONFIG.artist} />);

    expect(screen.queryByTestId('Genres-rock-selected-background')).toBeNull();
    expect(screen.queryByTestId('Genres-rock-selected-accent')).toBeNull();
  });

  it.each([
    ['Venue', ONBOARDING_CONFIG.venue],
    ['Promoter', ONBOARDING_CONFIG.promoter],
  ] as const)('keeps the %s solid selected accent inside the shared background host', (_label, accentConfig) => {
    const screen = render(<Harness initialValue={['rock']} accentConfig={accentConfig} />);
    const host = screen.getByTestId('Genres-rock-selected-background');
    const accent = screen.getByTestId('Genres-rock-selected-accent');

    expect(hasAncestorProp(accent, 'testID', host.props.testID)).toBe(true);
    expect(StyleSheet.flatten(accent.props.style)).toMatchObject({
      backgroundColor: accentConfig.accentStart,
      width: '100%',
      height: '100%',
    });
  });

  it('keeps checked and disabled states independent at the maximum', () => {
    const screen = render(
      <Harness
        maxSelections={2}
        initialValue={['rock', 'jazz']}
        accentConfig={ONBOARDING_CONFIG.artist}
      />,
    );

    expect(screen.getByLabelText('Rock').props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });
    expect(screen.getByLabelText('Folk').props.accessibilityState).toEqual({
      checked: false,
      disabled: true,
    });

    fireEvent.press(screen.getByLabelText('Rock'));
    expect(screen.getByLabelText('Folk').props.accessibilityState.disabled).toBe(false);
  });
});
