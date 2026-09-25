/** @jest-environment jsdom */
import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { AuthenticatedMenu } from '../AuthenticatedMenu';
import { ShellControl } from '../ShellControl';
import type { BackendPersona } from '../../onboarding/onboardingTypes';

// Exercise real React Native Web DOM behavior, not RN's native host-component mocks.
jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('react-native-svg', () => jest.requireActual('react-native-svg/lib/commonjs/ReactNativeSVG.web'));
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let selected: jest.Mock;

function Harness({ persona = 'MUSICIAN' }: { persona?: BackendPersona }) {
  const [open, setOpen] = useState<'nav' | 'account' | null>(null);
  const keyboardOpening = useRef(false);
  const host = useRef<View>(null); const nav = useRef<View>(null); const account = useRef<View>(null);
  const toggle = (menu: 'nav' | 'account', source: 'keyboard' | 'pointer') => {
    keyboardOpening.current = source === 'keyboard';
    setOpen((value) => value === menu ? null : menu);
  };
  return <View ref={host}>
    <ShellControl ref={nav} id="nav-trigger" label="Nav" menuId="nav-menu" expanded={open === 'nav'}
      onActivate={(source) => toggle('nav', source)}
      onKey={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); toggle('nav', 'keyboard'); } }}><Text>NAV</Text></ShellControl>
    <ShellControl ref={account} id="account-trigger" label="Account" menuId="account-menu" expanded={open === 'account'}
      onActivate={(source) => toggle('account', source)}><Text>Account</Text></ShellControl>
    <button id="outside">Outside</button>
    {open && <AuthenticatedMenu key={open} id={`${open}-menu`} label={open} triggerId={`${open}-trigger`}
      persona={persona} focusOnOpen={keyboardOpening.current}
      triggerRef={open === 'nav' ? nav : account} hostRef={host} viewport={{ width: 320, height: 640 }}
      headerBottom={64} bottomInset={0} width={224} align="end" onClose={() => setOpen(null)}
      items={open === 'nav' ? [
        { key: 'home', label: 'Home', current: true, onSelect: selected },
        { key: 'test', label: 'Second test action', onSelect: selected },
      ] : [{ key: 'signout', label: 'Sign Out', onSelect: selected }]} />}
  </View>;
}

beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  selected = jest.fn(); act(() => root.render(<Harness />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const node = (selector: string) => container.querySelector(selector) as HTMLElement;
const key = (element: HTMLElement, value: string) => act(() => element.dispatchEvent(
  new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
));

it.each(['Enter', ' '])('opens with %s, focuses the first item and restores focus on Escape', (openKey) => {
  const trigger = node('#nav-trigger'); act(() => trigger.focus()); key(trigger, openKey);
  expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(trigger.getAttribute('aria-controls')).toBe('nav-menu');
  expect(node('#nav-menu').getAttribute('role')).toBe('menu');
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Home');
  expect(node('[aria-label="Home"] [data-testid="menu-interaction-highlight"]')).not.toBeNull();
  key(document.activeElement as HTMLElement, 'Escape');
  expect(node('#nav-menu')).toBeNull(); expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(getComputedStyle(trigger).borderTopColor).toBe('rgba(14,165,233,1.00)');
});

it('navigates multiple actions with arrows, wraps, and activates Space exactly once', () => {
  key(node('#nav-trigger'), 'Enter');
  expect(node('[aria-label="Home"]').getAttribute('aria-current')).toBe('page');
  key(document.activeElement as HTMLElement, 'ArrowDown');
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Second test action');
  expect(node('[aria-label="Home"] [data-testid="menu-interaction-highlight"]')).toBeNull();
  key(document.activeElement as HTMLElement, 'ArrowDown');
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Home');
  key(document.activeElement as HTMLElement, 'ArrowUp');
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Second test action');
  key(document.activeElement as HTMLElement, 'Home');
  key(document.activeElement as HTMLElement, 'End');
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Second test action');
  key(document.activeElement as HTMLElement, 'Home');
  key(document.activeElement as HTMLElement, ' ');
  expect(selected).toHaveBeenCalledTimes(1);
  expect(node('#nav-menu')).toBeNull(); expect(document.activeElement).toBe(node('#nav-trigger'));
});

it('Account has the same keyboard behavior and opening it closes Nav', () => {
  key(node('#nav-trigger'), 'Enter'); key(node('#account-trigger'), 'Enter');
  expect(node('#nav-menu')).toBeNull(); expect(node('#account-menu')).not.toBeNull();
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Sign Out');
  key(document.activeElement as HTMLElement, 'Enter');
  expect(selected).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(node('#account-trigger'));
});

it('outside pointer dismissal does not steal the clicked control focus', () => {
  key(node('#nav-trigger'), 'Enter');
  const outside = node('#outside');
  act(() => { outside.focus(); outside.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
  expect(node('#nav-menu')).toBeNull(); expect(document.activeElement).toBe(outside);
});

it('Tab closes and restores the trigger before the browser performs normal traversal', () => {
  key(node('#account-trigger'), ' '); key(document.activeElement as HTMLElement, 'Tab');
  expect(node('#account-menu')).toBeNull(); expect(document.activeElement).toBe(node('#account-trigger'));
  // JSDOM does not simulate native Tab traversal; forward/backward traversal remains browser QA.
});

const pointerOpen = (menu: 'nav' | 'account') => act(() => {
  const trigger = node(`#${menu}-trigger`);
  trigger.focus();
  trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
});
const hover = (row: HTMLElement, entering: boolean) => act(() => {
  const event = new MouseEvent(window.PointerEvent ? (entering ? 'pointerenter' : 'pointerleave') : (entering ? 'mouseenter' : 'mouseleave'));
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  row.dispatchEvent(event);
});
const interaction = (row: HTMLElement) => row.querySelector('[data-testid="menu-interaction-highlight"]');
const assertAccent = (row: HTMLElement, persona: BackendPersona) => {
  const highlight = interaction(row)!;
  expect(highlight).not.toBeNull();
  const border = highlight.querySelector('rect[stroke]')!;
  if (persona === 'MUSICIAN') {
    expect(border.getAttribute('stroke')).toMatch(/^url\(#menu-interaction-/);
    expect(Array.from(highlight.querySelectorAll('stop')).map((stop) => stop.getAttribute('stop-color')))
      .toEqual(['#0ea5e9', '#8b5cf6']);
  } else {
    expect(border.getAttribute('stroke')).toBe(persona === 'VENUE' ? '#8b5cf6' : '#0ea5e9');
    expect(highlight.querySelector('linearGradient')).toBeNull();
  }
  // The old flat-blue focus border must not leak through the shared trigger styling.
  expect(getComputedStyle(row).borderTopColor).toBe('rgba(0,0,0,0.00)');
};

describe.each(['MUSICIAN', 'VENUE', 'PROMOTER'] as const)('%s menu interaction', (persona) => {
  it.each([['nav', 'Home'], ['account', 'Sign Out']] as const)('keeps pointer-opened %s neutral; clears persona hover and DOM focus on leave/blur', (menu, label) => {
    act(() => root.render(<Harness persona={persona} />));
    pointerOpen(menu);
    const row = node(`[role="menuitem"][aria-label="${label}"]`);
    expect(row).not.toBeNull();
    expect(document.activeElement).toBe(node(`#${menu}-trigger`));
    expect(interaction(row)).toBeNull();
    expect(getComputedStyle(row).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    if (menu === 'nav') expect(row.getAttribute('aria-current')).toBe('page');
    hover(row, true); assertAccent(row, persona);
    hover(row, false); expect(interaction(row)).toBeNull();
    // Browser pointer focus must not leave a keyboard highlight after hover ends.
    act(() => { row.dispatchEvent(new Event('pointerdown', { bubbles: true })); row.focus(); });
    expect(document.activeElement).toBe(row); expect(interaction(row)).toBeNull();
    hover(row, true); assertAccent(row, persona);
    hover(row, false); expect(interaction(row)).toBeNull();
    key(row, 'Home'); assertAccent(row, persona);
    act(() => node('#outside').focus()); expect(interaction(row)).toBeNull();
    act(() => row.focus()); assertAccent(row, persona);
    act(() => node('#outside').focus()); expect(interaction(row)).toBeNull();
    // Open state and current-route semantics survive without selected styling.
    expect(node(`#${menu}-trigger`).getAttribute('aria-expanded')).toBe('true');
    expect(row.isConnected).toBe(true);
  });
});

it.each(['Tab', 'ArrowDown', 'ArrowUp', 'Home', 'End'])('enters a pointer-opened menu intentionally with %s', (entryKey) => {
  pointerOpen('nav');
  expect(node('[data-testid="menu-interaction-highlight"]')).toBeNull();
  key(node('#nav-trigger'), entryKey);
  const expected = entryKey === 'ArrowUp' || entryKey === 'End' ? 'Second test action' : 'Home';
  const row = node(`[aria-label="${expected}"]`);
  expect(document.activeElement).toBe(row); assertAccent(row, 'MUSICIAN');
  key(row, 'Escape');
  expect(node('[data-testid="menu-interaction-highlight"]')).toBeNull();
  pointerOpen('nav');
  expect(node('[data-testid="menu-interaction-highlight"]')).toBeNull();
});
