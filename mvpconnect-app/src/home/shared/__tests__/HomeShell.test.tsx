import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { act, cleanup, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  HomeShell,
  homeBottomPadding,
  homeHorizontalPadding,
  homeTopPadding,
} from '../HomeShell';

const metrics = (top: number, bottom: number) => ({
  frame: { x: 0, y: 0, width: 1200, height: 800 },
  insets: { top, right: 0, bottom, left: 0 },
});

const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');

const renderShell = (width: number, top = 0, bottom = 0) => {
  Dimensions.set({
    window: { ...initialWindow, width, height: 800 },
    screen: { ...initialScreen, width, height: 800 },
  });

  return render(
    <SafeAreaProvider initialMetrics={metrics(top, bottom)}>
      <HomeShell>
        <Text accessibilityRole="header">ARTIST HOME</Text>
      </HomeShell>
    </SafeAreaProvider>,
  );
};

describe('HomeShell', () => {
  afterEach(() => {
    cleanup();
    act(() => {
      Dimensions.set({ window: initialWindow, screen: initialScreen });
    });
  });

  it('uses the desktop layout path and remains scrollable', () => {
    const screen = renderShell(1440);
    expect(screen.getByTestId('home-layout-desktop')).toBeTruthy();
    expect(screen.getByTestId('home-scroll-view').props.scrollEnabled).toBe(true);
    expect(screen.getByTestId('home-scroll-view').props.showsVerticalScrollIndicator).toBe(true);
    expect(screen.getByRole('header').props.children).toBe('ARTIST HOME');
  });

  it('keeps page rhythm without duplicating the shell top inset and preserves the bottom inset', () => {
    const screen = renderShell(390, 44, 34);
    const contentStyle = StyleSheet.flatten(
      screen.getByTestId('home-scroll-view').props.contentContainerStyle,
    );

    expect(screen.getByTestId('home-layout-mobile')).toBeTruthy();
    expect(contentStyle.paddingHorizontal).toBe(20);
    expect(contentStyle.paddingTop).toBe(20);
    expect(contentStyle.paddingBottom).toBe(50);
  });

  it('keeps layout calculations responsive and bounded', () => {
    expect(homeHorizontalPadding(390)).toBe(20);
    expect(homeHorizontalPadding(900)).toBe(32);
    expect(homeHorizontalPadding(1440)).toBe(48);
    expect(homeTopPadding(true)).toBe(20);
    expect(homeTopPadding(false)).toBe(32);
    expect(homeBottomPadding(0)).toBe(32);
    expect(homeBottomPadding(34)).toBe(50);
  });

  it('does not render onboarding chrome', () => {
    const screen = renderShell(390);
    expect(screen.queryByText('THE BASICS')).toBeNull();
    expect(screen.queryByText(/STEP \d+ OF/)).toBeNull();
  });
});
