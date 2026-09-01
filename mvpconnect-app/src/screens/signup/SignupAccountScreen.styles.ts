import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  scrollContentMobile: {
    paddingHorizontal: theme.spacing.md,
  },
  pageFrame: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  brandRow: {
    minHeight: 74,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.panelDivider,
  },
  pageAccentRule: {
    width: '100%',
    height: 1,
    marginTop: -1,
  },
  pageAccentRuleSolid: {
    width: '100%',
    height: 1,
  },
  changeRole: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  changeRoleText: {
    color: theme.colors.mutedText,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.bodySmall,
    letterSpacing: 1.2,
  },
  intro: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.bodySmall,
    letterSpacing: 1.8,
    marginBottom: theme.spacing.md,
  },
  gradientEyebrow: {
    width: 180,
    height: 18,
    marginBottom: theme.spacing.md,
  },
  headline: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 58,
    lineHeight: 54,
    letterSpacing: -0.5,
  },
  headlineMobile: {
    fontSize: 48,
    lineHeight: 45,
  },
  accentRule: {
    width: 48,
    height: 2,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  accentRuleSolid: {
    width: 48,
    height: 2,
  },
  support: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: theme.fontSizes.bodyRegular,
    lineHeight: 22,
  },
  form: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
    paddingTop: theme.spacing.xl,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  duplicateAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  duplicateActionText: {
    color: theme.colors.brandBlue,
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.bodySmall,
    letterSpacing: 1.1,
  },
  formError: {
    color: theme.colors.error,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: theme.fontSizes.bodySmall,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  cta: {
    marginTop: theme.spacing.sm,
    borderRadius: 3,
  },
  gradientCtaFrame: {
    minHeight: 56,
    marginTop: theme.spacing.sm,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gradientCtaArtwork: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gradientCtaButton: {
    marginTop: 0,
    backgroundColor: 'transparent',
  },
  memberSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  memberLabel: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    fontSize: theme.fontSizes.caption,
    letterSpacing: 1.5,
  },
  signIn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  signInText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.bodyRegular,
    letterSpacing: 1.1,
  },
  gradientSignInText: {
    width: 100,
    height: 24,
  },
  legal: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: theme.fontSizes.bodySmall,
    lineHeight: 19,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.panelDivider,
  },
  legalLink: {
    color: theme.colors.warmWhite,
    textDecorationLine: 'underline',
  },
});
