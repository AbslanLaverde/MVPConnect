import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

interface HomeSectionProps {
  title: string;
  supportingCopy?: string;
  trailingAction?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  title,
  supportingCopy,
  trailingAction,
  children,
  testID,
}) => (
  <View testID={testID} style={styles.section}>
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {supportingCopy ? <Text style={styles.supportingCopy}>{supportingCopy}</Text> : null}
      </View>
      {trailingAction ? <View style={styles.trailingAction}>{trailingAction}</View> : null}
    </View>
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    width: '100%',
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
  },
  headingCopy: {
    flex: 1,
  },
  title: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 1,
  },
  supportingCopy: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  trailingAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    marginTop: 18,
  },
});
