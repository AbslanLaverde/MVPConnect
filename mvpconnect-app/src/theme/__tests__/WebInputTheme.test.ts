import { theme } from '../theme';
import { webInputThemeCss } from '../WebInputTheme';

describe('web input theme', () => {
  it('keeps Chrome autofill on the canonical dark input surface', () => {
    expect(webInputThemeCss).toContain('input:-webkit-autofill');
    expect(webInputThemeCss).toContain(theme.colors.inputSurface);
    expect(webInputThemeCss).toContain(theme.colors.primaryText);
  });
});
