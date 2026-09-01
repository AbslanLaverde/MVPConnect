import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.sm,
    fontWeight: '700',
    letterSpacing: 1.15,
  },
  labelBrand: {
    fontFamily: theme.typography.fontFamily.bodySemiBold,
    fontWeight: 'normal',
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14171d',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: theme.colors.brandBlue,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryText,
  },
  focusGradientBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
  },
  inputBrand: {
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontWeight: 'normal',
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  leftIcon: {
    paddingLeft: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    minWidth: 44,
    minHeight: 44,
    paddingRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggle: {
    color: theme.colors.brandViolet,
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.86,
  },
  errorText: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.fontSizes.bodySmall,
    color: theme.colors.secondaryText,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  feedbackTextBrand: {
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontWeight: 'normal',
  },
});
