// The existing Home rail, shared with application chrome (not a global token system).
export const APP_COMPACT_BREAKPOINT = 768;
export const APP_CONTENT_MAX_WIDTH = 1200;
export const appHorizontalPadding = (width: number): number =>
  width < APP_COMPACT_BREAKPOINT ? 20 : width < 1200 ? 32 : 48;
