import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ONBOARDING_CONFIG } from '../../../onboarding/onboardingConfig';
import type { EquipmentItemDto } from '../../../onboarding/stepThreeTypes';
import { EQUIPMENT_OPTIONS } from '../../../onboarding/taxonomy';
import { EquipmentSelector } from '../EquipmentSelector';

const Harness = ({
  initial = [],
  persona = 'artist',
}: {
  initial?: EquipmentItemDto[];
  persona?: 'artist' | 'venue' | 'promoter';
}) => {
  const [value, setValue] = useState<EquipmentItemDto[]>(initial);
  return (
    <>
      <EquipmentSelector
        value={value}
        onChange={setValue}
        accentConfig={ONBOARDING_CONFIG[persona]}
      />
      <Text testID="equipment-value">{JSON.stringify(value)}</Text>
    </>
  );
};

describe('EquipmentSelector', () => {
  it('renders every canonical equipment option with accessible unselected state', () => {
    const screen = render(<Harness />);

    for (const option of EQUIPMENT_OPTIONS) {
      expect(screen.getByLabelText(option.label).props.accessibilityState.checked).toBe(false);
    }
    expect(screen.queryByLabelText('Microphones quantity, optional')).toBeNull();
  });

  it('selects in order, exposes quantity only after selection, and deselects completely', () => {
    const screen = render(<Harness />);

    fireEvent.press(screen.getByLabelText('Microphones'));
    fireEvent.press(screen.getByLabelText('Guitar Amp'));

    expect(screen.getByLabelText('Microphones').props.accessibilityState.checked).toBe(true);
    expect(screen.getByLabelText('Microphones quantity, optional')).toBeTruthy();
    expect(screen.getByTestId('equipment-value').props.children).toBe(
      '[{"code":"MICROPHONES","quantity":null},{"code":"GUITAR_AMP","quantity":null}]',
    );

    fireEvent.press(screen.getByLabelText('Microphones'));
    expect(screen.queryByLabelText('Microphones quantity, optional')).toBeNull();
    expect(screen.getByTestId('equipment-value').props.children).toBe(
      '[{"code":"GUITAR_AMP","quantity":null}]',
    );

    fireEvent.press(screen.getByLabelText('Microphones'));
    expect(screen.getByTestId('equipment-value').props.children).toBe(
      '[{"code":"GUITAR_AMP","quantity":null},{"code":"MICROPHONES","quantity":null}]',
    );
  });

  it('keeps selected and unselected equipment at the same compact height', () => {
    const screen = render(<Harness />);
    const drumTile = screen.getByTestId('equipment-DRUM_KIT-tile');

    expect(StyleSheet.flatten(drumTile.props.style)).toMatchObject({ height: 48 });

    fireEvent.press(screen.getByLabelText('Drum Kit'));
    const selectedDrumTile = screen.getByTestId('equipment-DRUM_KIT-tile');

    expect(StyleSheet.flatten(selectedDrumTile.props.style)).toMatchObject({ height: 48 });
    const quantity = screen.getByLabelText('Drum Kit quantity, optional');
    expect(quantity.props.placeholder).toBe('—');

    fireEvent.changeText(quantity, '4');
    expect(StyleSheet.flatten(screen.getByTestId('equipment-DRUM_KIT-tile').props.style))
      .toMatchObject({ height: 48 });
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":4');
  });

  it('accepts blank and inclusive quantity bounds without defaulting to one', () => {
    const screen = render(<Harness />);
    fireEvent.press(screen.getByLabelText('Microphones'));
    const quantity = screen.getByLabelText('Microphones quantity, optional');

    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":null');
    fireEvent.changeText(quantity, '1');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":1');
    fireEvent.changeText(quantity, '99');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":99');
    fireEvent.changeText(quantity, '');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":null');
  });

  it('rejects out-of-range and fractional quantities', () => {
    const screen = render(<Harness />);
    fireEvent.press(screen.getByLabelText('Microphones'));
    const quantity = screen.getByLabelText('Microphones quantity, optional');

    fireEvent.changeText(quantity, '0');
    expect(quantity.props.accessibilityHint).toBe('Enter a value of 1 or more.');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":null');

    fireEvent.changeText(quantity, '1.5');
    expect(quantity.props.accessibilityHint).toBe('Enter a whole number.');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":null');

    fireEvent.changeText(quantity, '100');
    expect(quantity.props.accessibilityHint).toBe('Enter a value of 99 or less.');
    expect(screen.getByTestId('equipment-value').props.children).toContain('"quantity":null');
  });

  it('hydrates persisted quantities and persisted unspecified quantities', () => {
    const screen = render(<Harness initial={[
      { code: 'STAGE_MONITORS', quantity: 4 },
      { code: 'DRUM_KIT', quantity: null },
    ]} />);

    expect(screen.getByLabelText('Stage Monitors quantity, optional').props.value).toBe('4');
    expect(screen.getByLabelText('Drum Kit quantity, optional').props.value).toBe('');
  });

  it.each(['artist', 'venue', 'promoter'] as const)(
    'renders the %s persona accent and selected semantics',
    (persona) => {
      const screen = render(<Harness persona={persona} />);
      fireEvent.press(screen.getByLabelText('Drum Kit'));

      expect(screen.getByTestId('equipment-DRUM_KIT-selected-accent')).toBeTruthy();
      expect(screen.getByLabelText('Drum Kit').props.accessibilityState).toEqual({
        checked: true,
        disabled: false,
      });
      expect(screen.getByLabelText('Drum Kit').props.accessibilityHint).toContain(
        'removes its quantity',
      );
    },
  );
});
