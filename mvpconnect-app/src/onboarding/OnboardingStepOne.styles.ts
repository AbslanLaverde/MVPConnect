import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const stepOneStyles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 48,
  },
  columnsMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  formColumn: {
    flex: 1,
    minWidth: 0,
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
    maxWidth: 580,
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
    maxWidth: 540,
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 28,
  },
  form: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
    paddingTop: 24,
  },
  sectionLabel: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.35,
    marginBottom: 12,
  },
  required: {
    color: theme.colors.error,
  },
  identityDesktop: {
    width: 370,
    flexShrink: 0,
  },
  identityMobile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 28,
  },
  mediaDesktop: {
    width: '100%',
  },
  mediaMobile: {
    width: 148,
    flexShrink: 0,
  },
  mediaAccentFrame: {
    padding: 1,
    overflow: 'hidden',
  },
  mediaInner: {
    backgroundColor: theme.colors.pageBg,
  },
  mediaField: {
    marginBottom: 0,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    marginTop: 18,
  },
  identityCopyDesktop: {
    marginTop: 18,
    paddingHorizontal: 4,
  },
  identityLabel: {
    color: theme.colors.primaryText,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 14,
  },
  identityName: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 28,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  identityPersona: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 5,
  },
  identitySupport: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  locationBlock: {
    marginTop: 4,
  },
});

