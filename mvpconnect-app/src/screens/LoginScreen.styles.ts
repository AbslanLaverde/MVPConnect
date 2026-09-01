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
    borderColor: theme.colors.panelDivider,
    borderWidth: 1,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 4,
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
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.caption,
    fontWeight: 'normal',
    letterSpacing: 2.6,
    marginBottom: theme.spacing.md,
  },
  headline: {
    maxWidth: 600,
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayExtraBold,
    fontSize: 56,
    lineHeight: 54,
    fontWeight: 'normal',
    letterSpacing: -0.8,
    marginBottom: theme.spacing.md,
  },
  headlineDesktop: {
    maxWidth: 680,
  },
  headlineCompact: {
    maxWidth: 350,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  connectionText: {
    color: theme.colors.brandBlue,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontWeight: 'normal',
  },
  headlineNativeCompact: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headlineNativeLead: {
    marginBottom: 0,
    textAlign: 'center',
  },
  storyCopy: {
    maxWidth: 540,
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
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
  title: {
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 36,
    fontWeight: 'normal',
    color: theme.colors.warmWhite,
    letterSpacing: -0.9,
    lineHeight: 37,
    marginBottom: theme.spacing.sm,
  },
  sectionMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionMarkerSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionNumber: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.brandBlue,
    fontSize: theme.fontSizes.caption,
    fontWeight: 'normal',
    letterSpacing: 1.3,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    color: theme.colors.mutedText,
    fontSize: theme.fontSizes.caption,
    fontWeight: 'normal',
    letterSpacing: 1.3,
  },
  sectionLabelActive: {
    color: theme.colors.brandBlue,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: theme.fontSizes.bodyLarge,
    color: theme.colors.secondaryText,
    marginBottom: theme.spacing.md,
  },
  formHeaderRule: {
    height: 1,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.panelDivider,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: theme.spacing.xl,
  },
  forgotPasswordText: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    fontSize: theme.fontSizes.caption,
    color: theme.colors.primaryAccent,
    fontWeight: 'normal',
    letterSpacing: 1.1,
  },
  loginButton: {
    marginBottom: theme.spacing.xl,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.panelDivider,
    marginBottom: theme.spacing.xl,
  },
  signupPrompt: {
    alignItems: 'flex-start',
  },
  signupLink: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.primaryAccent,
    fontWeight: 'normal',
    letterSpacing: 0.7,
  },
});
