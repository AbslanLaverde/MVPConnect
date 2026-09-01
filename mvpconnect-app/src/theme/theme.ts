// Theme configuration based on MVPConnect UI Design Document
export const theme = {
  colors: {
    // Background Colors
    primaryBg: '#1a1a1a',
    secondaryBg: '#262626',
    tertiaryBg: '#333333',
    pageBg: '#0c0e13',
    elevatedSurface: '#181b22',
    overlaySurface: 'rgba(18, 20, 27, 0.96)',
    tagSurface: '#242833',
    
    // Text Colors
    primaryText: '#e5e5e5',
    secondaryText: '#a3a3a3',
    disabledText: '#666666',
    warmWhite: '#f4f1e9',
    mutedText: '#c2c4cb',

    // MVPConnect brand semantics
    brandBlue: '#0ea5e9',
    brandViolet: '#8b5cf6',
    brandWarmWhite: '#f4f1e9',
    brandBackground: '#0c0e13',
    
    // Accent Colors
    primaryAccent: '#0ea5e9', // Electric Blue
    secondaryAccent: '#8b5cf6', // Purple
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    error: '#ef4444', // Red
    info: '#3b82f6', // Blue
    connectionBlue: '#38bdf8',
    connectionViolet: '#8b5cf6',
    mvpGold: '#f5c76b',
    
    // Borders & Dividers
    border: '#404040',
    strongBorder: '#525252',
    subtleBorder: '#303541',
    panelDivider: '#2b303a',
    inputBorder: '#2f3440',
    artistBorder: 'rgba(14, 165, 233, 0.28)',
    venueBorder: 'rgba(139, 92, 246, 0.28)',
    mvpGoldBorder: 'rgba(245, 199, 107, 0.45)',
    
    // Additional
    white: '#ffffff',
  },
  
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  typography: {
    fontFamily: {
      displaySemiBold: 'BarlowCondensed_600SemiBold',
      displayBold: 'BarlowCondensed_700Bold',
      displayExtraBold: 'BarlowCondensed_800ExtraBold',
      bodyRegular: 'SpaceGrotesk_400Regular',
      bodyMedium: 'SpaceGrotesk_500Medium',
      bodySemiBold: 'SpaceGrotesk_600SemiBold',
      bodyBold: 'SpaceGrotesk_700Bold',
    },
  },
  
  fontSizes: {
    h1: 32,
    display: 48,
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
