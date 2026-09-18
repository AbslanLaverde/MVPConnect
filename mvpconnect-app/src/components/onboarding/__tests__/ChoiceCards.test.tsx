import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG, type OnboardingPersonaConfig } from '../../../onboarding/onboardingConfig';
import { ChoiceCards } from '../ChoiceCards';

interface HarnessProps {
  initialValue?: string;
  accentConfig?: OnboardingPersonaConfig;
}

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

const Harness = ({ initialValue, accentConfig }: HarnessProps) => {
  const [value, setValue] = useState<string | undefined>(initialValue);
  return (
    <ChoiceCards
      label="Travel radius"
      value={value}
      onChange={setValue}
      options={[
        { value: 'local', label: 'Local', description: 'Within the city' },
        { value: 'regional', label: 'Regional', description: 'Within the region' },
      ]}
      accentConfig={accentConfig}
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

  it('renders the selected Artist accent inside a non-interactive full-bounds background host', () => {
    const screen = render(
      <Harness initialValue="local" accentConfig={ONBOARDING_CONFIG.artist} />,
    );
    const tile = screen.getByLabelText('Local');
    const host = screen.getByTestId('Travel radius-local-selected-background');
    const accent = screen.getByTestId('Travel radius-local-selected-accent');
    const selectedLabel = screen.getByText('✓ Local');

    expect(StyleSheet.flatten(host.props.style)).toMatchObject({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(host.props.pointerEvents).toBe('none');
    expect(hasAncestorProp(accent, 'testID', host.props.testID)).toBe(true);
    expect(StyleSheet.flatten(accent.props.style)).toMatchObject({
      width: '100%',
      height: '100%',
    });
    expect(hasAncestorProp(host, 'accessibilityLabel', tile.props.accessibilityLabel)).toBe(true);
    expect(hasAncestorProp(selectedLabel, 'accessibilityLabel', tile.props.accessibilityLabel)).toBe(true);
    expect(StyleSheet.flatten(selectedLabel.props.style).zIndex).toBe(1);
  });

  it('does not render selected background content for unselected choices', () => {
    const screen = render(<Harness accentConfig={ONBOARDING_CONFIG.artist} />);

    expect(screen.queryByTestId('Travel radius-local-selected-background')).toBeNull();
    expect(screen.queryByTestId('Travel radius-local-selected-accent')).toBeNull();
  });

  it.each([
    ['Venue', ONBOARDING_CONFIG.venue],
    ['Promoter', ONBOARDING_CONFIG.promoter],
  ] as const)('keeps the %s solid selected accent inside the background host', (_label, accentConfig) => {
    const screen = render(<Harness initialValue="local" accentConfig={accentConfig} />);
    const host = screen.getByTestId('Travel radius-local-selected-background');
    const accent = screen.getByTestId('Travel radius-local-selected-accent');

    expect(hasAncestorProp(accent, 'testID', host.props.testID)).toBe(true);
    expect(StyleSheet.flatten(accent.props.style)).toMatchObject({
      backgroundColor: accentConfig.accentStart,
      width: '100%',
      height: '100%',
    });
  });
});
