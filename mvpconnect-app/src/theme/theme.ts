// Theme configuration based on MVPConnect UI Design Document
export const theme = {
  colors: {
    // Background Colors
    primaryBg: '#1a1a1a',
    secondaryBg: '#262626',
    tertiaryBg: '#333333',
    
    // Text Colors
    primaryText: '#e5e5e5',
    secondaryText: '#a3a3a3',
    disabledText: '#666666',
    
    // Accent Colors
    primaryAccent: '#0ea5e9', // Electric Blue
    secondaryAccent: '#8b5cf6', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
    
    // Borders & Dividers
    border: '#404040',
    strongBorder: '#525252',
    
    // Additional
    white: '#ffffff',
  },
  
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  fontSizes: {
    h1: 32,
    h2: 24,
    h3: 20,
    bodyLarge: 16,
    bodyRegular: 14,
    bodySmall: 12,
    caption: 10,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 10.32,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
