import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.md,
  },
  scrollContentDesktop: {
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  scrollContentCompact: {
    padding: 0,
  },
  shell: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.subtleBorder,
    borderWidth: 1,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  shellDesktop: {
    minHeight: 820,
    flexDirection: 'row',
  },
  shellCompact: {
    borderWidth: 0,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  storyPanel: {
    padding: theme.spacing.lg,
  },
  storyPanelDesktop: {
    width: '58%',
    padding: theme.spacing.xl,
  },
  storyPanelStacked: {
    borderTopColor: theme.colors.panelDivider,
    borderTopWidth: 1,
  },
  storyPanelCompact: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  stackedBrand: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.elevatedSurface,
  },
  stackedBrandCompact: {
    paddingBottom: theme.spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandDesktop: {
    paddingHorizontal: theme.spacing.xl,
  },
  storyContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
  },
  storyContentDesktop: {
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: 76,
  },
  storyContentCompact: {
    paddingTop: 0,
  },
  eyebrow: {
    color: theme.colors.primaryAccent,
    fontSize: theme.fontSizes.caption,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: theme.spacing.md,
  },
  headline: {
    maxWidth: 600,
    color: theme.colors.warmWhite,
    fontSize: theme.fontSizes.display,
    lineHeight: 54,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: theme.spacing.md,
  },
  headlineCompact: {
    maxWidth: 350,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  storyCopy: {
    maxWidth: 540,
    color: theme.colors.secondaryText,
    fontSize: theme.fontSizes.bodyLarge,
    lineHeight: 25,
    marginBottom: theme.spacing.lg,
  },
  storyCopyCompact: {
    maxWidth: 350,
    fontSize: theme.fontSizes.bodyRegular,
    lineHeight: 21,
    marginBottom: theme.spacing.md,
  },
  centeredText: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  authPanel: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    backgroundColor: theme.colors.elevatedSurface,
    borderTopColor: theme.colors.panelDivider,
    borderTopWidth: 1,
  },
  authPanelStacked: {
    borderTopWidth: 0,
  },
  authPanelCompact: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  authPanelDesktop: {
    width: '42%',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    borderTopWidth: 0,
    borderLeftColor: theme.colors.panelDivider,
    borderLeftWidth: 1,
  },
  authAmbient: {
    position: 'absolute',
    width: 360,
    height: 360,
    right: -190,
    top: -190,
    borderRadius: 180,
    backgroundColor: theme.colors.brandViolet,
    opacity: 0.045,
  },
  title: {
    fontSize: theme.fontSizes.h1,
    fontWeight: '800',
    color: theme.colors.warmWhite,
    letterSpacing: -0.6,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSizes.bodyLarge,
    color: theme.colors.secondaryText,
    marginBottom: theme.spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: theme.spacing.xl,
  },
  forgotPasswordText: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.primaryAccent,
  },
  loginButton: {
    marginBottom: theme.spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.panelDivider,
    marginBottom: theme.spacing.xl,
  },
  signupPrompt: {
    alignItems: 'flex-start',
  },
  signupPromptText: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.secondaryText,
    marginBottom: theme.spacing.sm,
  },
  signupLink: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
});
