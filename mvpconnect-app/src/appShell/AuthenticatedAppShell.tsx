import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { getFocusedRouteNameFromRoute, useIsFocused } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { AuthenticatedNavigator } from '../navigation/AuthenticatedNavigator';
import { authenticatedNavItems, homeNavItem, type AuthenticatedNavItem } from '../navigation/authenticatedNavItems';
import { useGetSelfAccountQuery } from '../onboarding/onboardingApi';
import { ONBOARDING_CONFIG, routePersonaForBackend } from '../onboarding/onboardingConfig';
import { sessionController } from '../auth/session';
import { AuthenticatedAppHeader, type HeaderMenu } from './AuthenticatedAppHeader';
import { AuthenticatedMenu } from './AuthenticatedMenu';
import { AccountImage } from './AccountImage';
import { APP_COMPACT_BREAKPOINT } from './appLayout';
import { styles } from './AuthenticatedApp.styles';

type Props = StackScreenProps<RootStackParamList, 'AuthenticatedApp'>;

export const AuthenticatedAppShell = ({ navigation, route }: Props) => {
  const dimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const session = useSyncExternalStore(sessionController.subscribe, sessionController.getSnapshot, sessionController.getSnapshot);
  const selfQuery = useGetSelfAccountQuery(undefined, { skip: session.status !== 'authenticated' });
  // Same undefined argument/cache key as every Home; stop subscribing during session exit.
  const identity = selfQuery.isError ? undefined : selfQuery.data;
  // Authenticated session metadata keeps Home available during a recoverable /me failure.
  const persona = identity?.persona ?? session.userType;
  const personaLabel = persona ? ONBOARDING_CONFIG[routePersonaForBackend(persona)].label : undefined;
  const [openMenu, setOpenMenu] = useState<HeaderMenu | null>(null);
  const menuKeyboardOpening = useRef(false);
  const [viewport, setViewport] = useState({ width: dimensions.width, height: dimensions.height });
  const [headerHeight, setHeaderHeight] = useState(insets.top + (dimensions.width < APP_COMPACT_BREAKPOINT ? 64 : 72) + 1);
  const hostRef = useRef<View>(null);
  const navRef = useRef<View>(null);
  const accountRef = useRef<View>(null);
  const focused = useIsFocused();
  const currentRoute = getFocusedRouteNameFromRoute(route) ?? route.params?.screen;
  const closeMenus = useCallback(() => setOpenMenu(null), []);
  useEffect(() => { closeMenus(); }, [currentRoute, focused, closeMenus]);
  useEffect(() => navigation.addListener('blur', closeMenus), [navigation, closeMenus]);
  const navigateTo = (item: AuthenticatedNavItem) => {
    closeMenus();
    if (!persona) return;
    const destination = item.resolve(persona);
    if (currentRoute !== destination.name) navigation.navigate('AuthenticatedApp', { screen: destination.name });
  };

  // Phase 3 owns the root reset. Remove product subscribers immediately while it exits.
  if (session.status !== 'authenticated') return null;

  return <View ref={hostRef} collapsable={false} testID="authenticated-app-shell" style={styles.shell}
    onLayout={(event) => { const { width, height } = event.nativeEvent.layout; setViewport({ width, height }); }}>
    <AuthenticatedAppHeader width={dimensions.width} topInset={insets.top} identity={identity} persona={persona}
      openMenu={openMenu} navRef={navRef} accountRef={accountRef} onHome={() => navigateTo(homeNavItem)} onClose={closeMenus}
      onToggle={(menu, keyboard) => {
        menuKeyboardOpening.current = keyboard;
        setOpenMenu((current) => current === menu ? null : menu);
      }}
      onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} />
    <View testID="authenticated-page-region" style={styles.content}
      aria-hidden={Boolean(openMenu)}
      accessibilityElementsHidden={Boolean(openMenu)} importantForAccessibility={openMenu ? 'no-hide-descendants' : 'auto'}>
      <AuthenticatedNavigator />
    </View>
    {openMenu && focused && <AuthenticatedMenu key={openMenu} id={`authenticated-${openMenu}-menu`}
      persona={persona} focusOnOpen={menuKeyboardOpening.current}
      label={openMenu === 'nav' ? 'Navigation' : 'Account'} triggerId={`authenticated-${openMenu}-trigger`}
      triggerRef={openMenu === 'nav' ? navRef : accountRef} hostRef={hostRef} viewport={viewport}
      headerBottom={headerHeight} bottomInset={insets.bottom} width={openMenu === 'nav' ? 224 : 288}
      align={openMenu === 'nav' ? 'start' : 'end'} onClose={closeMenus}
      items={openMenu === 'nav' ? authenticatedNavItems.filter((item) => item.available).map((item) => ({
        key: item.key, label: item.label, onSelect: () => navigateTo(item),
        current: Boolean(persona && item.resolve(persona).name === currentRoute),
      })) : [{ key: 'sign-out', label: 'Sign Out', onSelect: () => { void sessionController.signOut(); } }]}>
      {openMenu === 'account' && <>
        <View style={styles.menuIdentity}>
          <AccountImage name={identity?.displayName} url={identity?.profileImage?.url} testID="account-menu" />
          <View style={styles.identityCopy}>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.identityName}>{identity?.displayName?.trim() || 'Account'}</Text>
            {personaLabel && <Text style={styles.persona}>{personaLabel}</Text>}
          </View>
        </View>
        <View style={styles.divider} />
      </>}
    </AuthenticatedMenu>}
  </View>;
};
