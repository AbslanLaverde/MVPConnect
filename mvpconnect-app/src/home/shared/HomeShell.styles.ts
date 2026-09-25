import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { APP_CONTENT_MAX_WIDTH } from '../../appShell/appLayout';

export const homeShellStyles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.pageBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  frame: {
    width: '100%',
    maxWidth: APP_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  sections: {
    width: '100%',
    gap: 48,
  },
  sectionsMobile: {
    gap: 30,
  },
});
