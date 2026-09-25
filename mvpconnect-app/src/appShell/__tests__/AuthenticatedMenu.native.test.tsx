import React, { createRef } from 'react';
import { Platform, View } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { AuthenticatedMenu } from '../AuthenticatedMenu';
import { MenuInteractionHighlight } from '../MenuInteractionHighlight';

beforeEach(() => { jest.useFakeTimers(); jest.replaceProperty(Platform, 'OS', 'android'); });
afterEach(() => { cleanup(); jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

describe.each(['MUSICIAN', 'VENUE', 'PROMOTER'] as const)('%s Android menu rows', (persona) => {
  it.each(['Home', 'Sign Out'])('%s is neutral until pressed and clears the accent after release', (label) => {
    const selected = jest.fn(); const close = jest.fn();
    const view = render(<AuthenticatedMenu id="test-menu" label="Menu" triggerId="trigger"
      triggerRef={createRef<View>()} hostRef={createRef<View>()} viewport={{ width: 390, height: 844 }}
      headerBottom={64} bottomInset={0} width={224} align="start" persona={persona} onClose={close}
      items={[{ key: 'action', label, current: label === 'Home', onSelect: selected }]} />);
    const row = view.getByRole('button', { name: label });
    expect(view.queryByTestId('menu-interaction-highlight', { includeHiddenElements: true })).toBeNull();
    const event = { nativeEvent: { pageX: 100, pageY: 100, identifier: 1, timestamp: Date.now() },
      currentTarget: { measure: jest.fn() }, persist: jest.fn() };
    fireEvent(row, 'responderGrant', event);
    expect(view.getByTestId('menu-interaction-highlight', { includeHiddenElements: true })).toBeTruthy();
    expect(view.UNSAFE_getByType(MenuInteractionHighlight).props).toMatchObject({ pressed: true, accent: persona === 'MUSICIAN'
      ? { start: '#0ea5e9', end: '#8b5cf6' } : { start: persona === 'VENUE' ? '#8b5cf6' : '#0ea5e9' } });
    act(() => jest.advanceTimersByTime(150));
    fireEvent(row, 'responderRelease', event);
    expect(selected).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1);
    expect(view.queryByTestId('menu-interaction-highlight', { includeHiddenElements: true })).toBeNull();
  });
});
