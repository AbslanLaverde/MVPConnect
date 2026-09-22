import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

interface HomeEmptyStateProps {
  title: string;
  body: string;
}

export const HomeEmptyState: React.FC<HomeEmptyStateProps> = ({ title, body }) => (
  <View style={styles.emptyState}>
    <View style={styles.marker} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.markerCenter} />
    </View>
    <View style={styles.copy}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  emptyState: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: theme.colors.subtleBorder,
    backgroundColor: theme.colors.elevatedSurface,
  },
  marker: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.artistBorder,
  },
  markerCenter: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.brandBlue,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  body: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
});
