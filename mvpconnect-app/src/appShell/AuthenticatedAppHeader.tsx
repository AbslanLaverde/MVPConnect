import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import type { SelfAccountResponse } from '../onboarding/onboardingApi';
import { AccountIcon } from './AccountIcon';
import { APP_COMPACT_BREAKPOINT, appHorizontalPadding } from './appLayout';
import { ShellControl } from './ShellControl';
import { styles } from './AuthenticatedApp.styles';

export type HeaderMenu = 'nav' | 'account';
interface Props {
  width: number;
  topInset: number;
  identity?: SelfAccountResponse;
  persona?: SelfAccountResponse['persona'];
  openMenu: HeaderMenu | null;
  navRef: React.RefObject<View>;
  accountRef: React.RefObject<View>;
  onToggle: (menu: HeaderMenu, keyboard: boolean) => void;
  onClose: () => void;
  onHome: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}

export const AuthenticatedAppHeader = ({ width, topInset, identity, persona, openMenu, navRef, accountRef,
  onToggle, onClose, onHome, onLayout }: Props) => {
  const compact = width < APP_COMPACT_BREAKPOINT;
  const name = identity?.displayName?.trim();
  return <View testID="authenticated-header" onLayout={onLayout}
    style={[styles.header, { paddingTop: topInset, paddingHorizontal: appHorizontalPadding(width) }]}>
    <Pressable style={StyleSheet.absoluteFill} accessible={false} focusable={false} tabIndex={-1} onPress={onClose} />
    <View testID="authenticated-header-rail" style={styles.rail}>
      <View testID="authenticated-header-row" style={[styles.headerRow, { height: compact ? 64 : 72 }]}>
        <View style={[styles.left, compact && styles.leftCompact]}>
          <ShellControl label="MVPConnect Home" onActivate={onHome} style={styles.logo}>
            <View style={{ pointerEvents: 'none' }} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <BrandLogo width={compact ? 152 : 184} height={compact ? 32 : 39} />
            </View>
          </ShellControl>
          <ShellControl ref={navRef} id="authenticated-nav-trigger" label="Nav" menuId="authenticated-nav-menu"
            expanded={openMenu === 'nav'} onActivate={(source) => onToggle('nav', source === 'keyboard')}
            onKey={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); onToggle('nav', true); } }}
            style={[styles.nav, compact && styles.navCompact]}>
            <Text style={styles.label}>NAV</Text><Text style={styles.chevron}>▾</Text>
          </ShellControl>
        </View>
        <ShellControl ref={accountRef} id="authenticated-account-trigger" label="Account" menuId="authenticated-account-menu"
          expanded={openMenu === 'account'} onActivate={(source) => onToggle('account', source === 'keyboard')}
          onKey={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); onToggle('account', true); } }}
          style={[styles.account, compact && styles.accountCompact]}>
          <AccountIcon persona={persona} />
          {!compact && <><Text testID="account-trigger-name" numberOfLines={1} ellipsizeMode="tail"
            style={[styles.label, styles.accountName]}>{name || 'Account'}</Text><Text style={styles.chevron}>▾</Text></>}
        </ShellControl>
      </View>
      <View testID="authenticated-header-divider" style={styles.headerDivider} />
    </View>
  </View>;
};
