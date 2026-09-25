import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShellControl, type MenuKeyEvent } from './ShellControl';
import { menuPosition, type MenuRect } from './menuPosition';
import { styles } from './AuthenticatedApp.styles';
import { ONBOARDING_CONFIG, routePersonaForBackend } from '../onboarding/onboardingConfig';
import type { BackendPersona } from '../onboarding/onboardingTypes';

export interface MenuItem { key: string; label: string; current?: boolean; onSelect: () => void }
interface Props {
  id: string;
  label: string;
  triggerId: string;
  triggerRef: React.RefObject<View>;
  hostRef: React.RefObject<View>;
  viewport: { width: number; height: number };
  headerBottom: number;
  bottomInset: number;
  width: number;
  align: 'start' | 'end';
  items: readonly MenuItem[];
  persona?: BackendPersona;
  focusOnOpen?: boolean;
  children?: React.ReactNode;
  onClose: () => void;
}

// Web DOM access stays here; native uses the same View measurements and BackHandler.
const webNode = (value: View | null): HTMLElement | null => value as unknown as HTMLElement | null;

export const AuthenticatedMenu = ({ id, label, triggerId, triggerRef, hostRef, viewport,
  headerBottom, bottomInset, width, align, items, persona, focusOnOpen = false, children, onClose }: Props) => {
  const panelRef = useRef<View>(null);
  const itemRefs = useRef<(View | null)[]>([]);
  const focusedIndex = useRef(0);
  const [anchor, setAnchor] = useState<MenuRect>();
  const [menuHeight, setMenuHeight] = useState(0);
  const presentation = persona ? ONBOARDING_CONFIG[routePersonaForBackend(persona)] : undefined;
  const dismiss = useCallback((restoreFocus: boolean) => {
    if (restoreFocus && Platform.OS === 'web') webNode(triggerRef.current)?.focus();
    onClose();
  }, [onClose, triggerRef]);

  useEffect(() => {
    let active = true;
    // Convert window coordinates into the shell's overlay coordinates, including native insets.
    hostRef.current?.measureInWindow((hostX, hostY) => {
      triggerRef.current?.measureInWindow((x, y, triggerWidth, height) => {
        if (active) setAnchor({ x: x - hostX, y: y - hostY, width: triggerWidth, height });
      });
    });
    return () => { active = false; };
  }, [triggerRef, hostRef, viewport.width, viewport.height, headerBottom]);

  useEffect(() => {
    // Pointer opening leaves focus on the trigger. Keyboard opening deliberately
    // enters the menu; the row's real focus/blur events own its visual state.
    if (Platform.OS === 'web' && focusOnOpen) webNode(itemRefs.current[0])?.focus();
  }, [focusOnOpen]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const outside = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (target && !webNode(panelRef.current)?.contains(target) && !webNode(triggerRef.current)?.contains(target)) {
          dismiss(false); // Do not steal focus from another clicked control.
        }
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(true); }
        // A pointer-opened menu can subsequently be entered from its trigger.
        if (event.target === webNode(triggerRef.current)) {
          const first = event.key === 'ArrowDown' || event.key === 'Home' || (event.key === 'Tab' && !event.shiftKey);
          const last = event.key === 'ArrowUp' || event.key === 'End';
          if (first || last) {
            event.preventDefault(); event.stopPropagation();
            webNode(itemRefs.current[first ? 0 : itemRefs.current.length - 1])?.focus();
          } else if (event.key === 'Tab') dismiss(true);
        }
      };
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
    const back = BackHandler.addEventListener('hardwareBackPress', () => { dismiss(false); return true; });
    return () => back.remove();
  }, [dismiss, triggerRef]);

  const onKey = (event: MenuKeyEvent) => {
    if (event.key === 'Tab') {
      // Move to the trigger before normal Tab traversal, so the now-removed menu
      // doesn't leave focus on the document body or trap the keyboard.
      dismiss(true);
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); dismiss(true); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault(); event.stopPropagation();
    const count = items.length;
    if (!count) return;
    focusedIndex.current = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
      : (focusedIndex.current + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
    webNode(itemRefs.current[focusedIndex.current])?.focus();
  };
  const position = menuPosition(anchor ?? { x: align === 'end' ? viewport.width - width - 8 : 8,
    y: headerBottom, width, height: 0 }, viewport, width, menuHeight, headerBottom, bottomInset, align);

  return <View style={styles.overlay} testID="authenticated-menu-overlay">
    <Pressable testID="menu-outside-dismiss" style={[StyleSheet.absoluteFill, { top: headerBottom }]}
      accessible={false} focusable={false} tabIndex={-1} onPress={() => dismiss(false)} />
    <View ref={panelRef} nativeID={id} testID={id}
      accessibilityRole={Platform.OS === 'web' ? 'menu' : undefined} accessibilityLabel={label}
      {...(Platform.OS === 'web' ? { 'aria-labelledby': triggerId } : {})}
      style={[styles.menu, position]} onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
        {children}
        {items.map((item, index) => <ShellControl key={item.key} ref={(node) => { itemRefs.current[index] = node; }}
          label={item.label} menuItem current={item.current} onKey={onKey}
          menuAccent={presentation ? { start: presentation.accentStart, end: presentation.accentEnd } : undefined}
          onFocused={() => { focusedIndex.current = index; }}
          onActivate={() => { dismiss(true); item.onSelect(); }}
          style={styles.menuRow}>
          <Text style={styles.menuText}>{item.label}</Text>
        </ShellControl>)}
      </ScrollView>
    </View>
  </View>;
};
