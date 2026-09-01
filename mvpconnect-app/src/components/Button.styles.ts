import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  button: {
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Variants
  button_primary: {
    backgroundColor: theme.colors.primaryAccent,
  },
  button_secondary: {
    backgroundColor: theme.colors.secondaryAccent,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primaryAccent,
  },
  button_text: {
    backgroundColor: 'transparent',
  },

  // Sizes
  button_small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
  },
  button_medium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 48,
  },
  button_large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 56,
  },

  // Text styles
  text: {
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  textBrand: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontWeight: 'normal',
  },
  text_primary: {
    color: theme.colors.white,
  },
  text_secondary: {
    color: theme.colors.white,
  },
  text_outline: {
    color: theme.colors.primaryAccent,
  },
  text_text: {
    color: theme.colors.primaryAccent,
  },
  text_small: {
    fontSize: theme.fontSizes.bodySmall,
  },
  text_medium: {
    fontSize: theme.fontSizes.bodyRegular,
  },
  text_large: {
    fontSize: theme.fontSizes.bodyLarge,
  },
});
