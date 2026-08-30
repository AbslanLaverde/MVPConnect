import { StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSizes.bodyRegular,
    color: theme.colors.primaryText,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.elevatedSurface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.subtleBorder,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primaryAccent,
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
    fontSize: 16,
    opacity: 0.72,
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
});
