import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { homeShellStyles } from './HomeShell.styles';
import { APP_COMPACT_BREAKPOINT, appHorizontalPadding } from '../../appShell/appLayout';

export const HOME_MOBILE_BREAKPOINT = APP_COMPACT_BREAKPOINT;

export const homeHorizontalPadding = appHorizontalPadding;

export const homeTopPadding = (mobile: boolean): number => mobile ? 20 : 32;

export const homeBottomPadding = (bottomInset: number): number =>
  Math.max(32, bottomInset + 16);

interface HomeShellProps {
  children: React.ReactNode;
}

export const HomeShell: React.FC<HomeShellProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < HOME_MOBILE_BREAKPOINT;

  return (
    <View testID="home-shell" style={homeShellStyles.page}>
      <ScrollView
        testID="home-scroll-view"
        style={homeShellStyles.scroll}
        contentContainerStyle={[
          homeShellStyles.scrollContent,
          {
            paddingHorizontal: homeHorizontalPadding(width),
            paddingTop: homeTopPadding(mobile),
            paddingBottom: homeBottomPadding(insets.bottom),
          },
        ]}
        scrollEnabled
        showsVerticalScrollIndicator
      >
        <View
          testID={mobile ? 'home-layout-mobile' : 'home-layout-desktop'}
          style={homeShellStyles.frame}
        >
          <View style={[homeShellStyles.sections, mobile && homeShellStyles.sectionsMobile]}>
            {children}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
