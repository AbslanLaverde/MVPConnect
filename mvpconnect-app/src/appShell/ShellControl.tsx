import React, { forwardRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { styles } from './AuthenticatedApp.styles';
import { MenuInteractionHighlight, type MenuAccent } from './MenuInteractionHighlight';
import { theme } from '../theme/theme';

export interface MenuKeyEvent {
  key: string;
  repeat?: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

interface Props {
  children: React.ReactNode;
  label: string;
  onActivate: (source: 'keyboard' | 'pointer') => void;
  style?: StyleProp<ViewStyle>;
  expanded?: boolean;
  menuId?: string;
  id?: string;
  menuItem?: boolean;
  menuAccent?: MenuAccent;
  current?: boolean;
  onKey?: (event: MenuKeyEvent) => void;
  onFocused?: () => void;
  testID?: string;
}

/** Small shared interaction treatment, including a visible replacement for the Web outline. */
export const ShellControl = forwardRef<View, Props>(({
  children, label, onActivate, style, expanded, menuId, id, menuItem, menuAccent, current, onKey, onFocused, testID,
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pointerFocused, setPointerFocused] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    'aria-haspopup': menuId ? 'menu' as const : undefined,
    'aria-expanded': expanded,
    'aria-controls': expanded ? menuId : undefined,
    'aria-current': current ? 'page' as const : undefined,
    tabIndex: menuItem ? -1 as const : 0 as const,
    // A pointer can focus a row without making it keyboard-focused (for example,
    // a press dragged off the row). Keep that focus from leaving a stuck accent.
    onPointerDown: menuItem ? () => setPointerFocused(true) : undefined,
    onKeyDownCapture: (event: MenuKeyEvent) => {
      if (menuItem) setPointerFocused(false);
      // Capture avoids duplicate activation by RN Web's PressResponder and handles
      // Space on menuitem roles, which it doesn't treat like a button.
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) onActivate('keyboard');
      } else onKey?.(event);
    },
  } : {};

  return <Pressable ref={ref} nativeID={id} testID={testID} accessibilityLabel={label}
    accessibilityRole={menuItem && Platform.OS === 'web' ? 'menuitem' : 'button'}
    accessibilityState={expanded === undefined ? undefined : { expanded }}
    {...webProps} onPress={() => onActivate('pointer')}
    onFocus={() => { setFocused(true); onFocused?.(); }}
    onBlur={() => { setFocused(false); setPointerFocused(false); }}
    onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
    onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
    style={({ pressed }) => [styles.control, style, !menuItem && hovered && styles.hovered,
      !menuItem && focused && styles.focused, pressed && styles.pressed,
      Platform.OS === 'web' && ({ outlineStyle: 'none' } as ViewStyle)]}>
    {({ pressed }) => <>
      {menuItem && (hovered || (focused && !pointerFocused) || pressed) && <MenuInteractionHighlight
        accent={menuAccent ?? { start: theme.colors.secondaryText }} pressed={pressed} />}
      {children}
    </>}
  </Pressable>;
});
ShellControl.displayName = 'ShellControl';
