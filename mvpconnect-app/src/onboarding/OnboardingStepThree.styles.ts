import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const stepThreeStyles = StyleSheet.create({
  layout: {
    width: '100%',
  },
  stepMeta: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  stepLabel: {
    color: theme.colors.mutedText,
  },
  headline: {
    maxWidth: 760,
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayExtraBold,
    fontSize: 52,
    lineHeight: 49,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  headlineMobile: {
    fontSize: 39,
    lineHeight: 38,
  },
  headingRule: {
    width: 64,
    height: 3,
    marginTop: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  accentFill: {
    ...StyleSheet.absoluteFillObject,
  },
  support: {
    maxWidth: 820,
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  sections: {
    width: '100%',
  },
  section: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
    paddingTop: 24,
    paddingBottom: 4,
  },
  sectionMobile: {
    paddingTop: 20,
  },
  fieldFlush: {
    marginBottom: 0,
  },
  soundSupportGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  soundSupportGridMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  soundSupportField: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  soundSupportFieldMobile: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  dimensionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  dimensionsRowMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  dimensionField: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  dimensionFieldMobile: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
});
