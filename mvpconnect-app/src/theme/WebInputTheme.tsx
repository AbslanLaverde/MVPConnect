import { useEffect } from 'react';
import { Platform } from 'react-native';
import { theme } from './theme';

const STYLE_ID = 'mvpconnect-web-input-theme';

export const webInputThemeCss = `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus {
  -webkit-text-fill-color: ${theme.colors.primaryText} !important;
  caret-color: ${theme.colors.primaryText} !important;
  -webkit-box-shadow: 0 0 0 1000px ${theme.colors.inputSurface} inset !important;
  box-shadow: 0 0 0 1000px ${theme.colors.inputSurface} inset !important;
  transition: background-color 9999s ease-out 0s;
}
`;

/** Keeps browser-managed autofill consistent with the shared dark input surface. */
export const WebInputTheme = () => {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    if (document.getElementById(STYLE_ID)) return undefined;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = webInputThemeCss;
    document.head.appendChild(style);

    return () => style.remove();
  }, []);

  return null;
};
