import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primaryBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.secondaryText,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: theme.fontSizes.bodyLarge,
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
  userTypeSelection: {
    flex: 1,
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSizes.h1,
    fontWeight: 'bold',
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSizes.bodyLarge,
    color: theme.colors.secondaryText,
    marginBottom: theme.spacing.xl,
  },
  userTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  userTypeIcon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  userTypeContent: {
    flex: 1,
  },
  userTypeName: {
    fontSize: theme.fontSizes.h3,
    fontWeight: '600',
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.xs,
  },
  userTypeDescription: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.secondaryText,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.primaryAccent,
    marginLeft: theme.spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  signupButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  termsText: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  loginPromptText: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.secondaryText,
  },
  loginLink: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryAccent,
    fontWeight: '600',
  },
});
