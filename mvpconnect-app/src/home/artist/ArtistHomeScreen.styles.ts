import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const artistHomeStyles = StyleSheet.create({
  errorState: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.07)',
    padding: 18,
  },
  errorTitle: {
    color: theme.colors.warmWhite,
    fontFamily: theme.typography.fontFamily.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.8,
  },
  errorBody: {
    color: theme.colors.secondaryText,
    fontFamily: theme.typography.fontFamily.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: 48,
    marginTop: 14,
  },
});
