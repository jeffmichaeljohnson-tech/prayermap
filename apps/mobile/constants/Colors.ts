/**
 * PrayerMap Color Constants
 *
 * Ethereal Heavenly Color Palette
 * Reference: https://github.com/jeffmichaeljohnson-tech/prayermap-design-system
 */

// Primary ethereal colors
const etherealColors = {
  // Dawn Blues
  sky300: '#7DD3FC',
  sky400: '#38BDF8',
  sky500: '#0EA5E9',

  // Soft Golds
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',

  // Gentle Purples
  purple300: '#D8B4FE',
  purple400: '#C084FC',
  purple500: '#A855F7',

  // Soft Pinks
  pink300: '#F9A8D4',
  pink400: '#F472B6',

  // Ethereal background colors
  etherealSky: '#E8F4F8',
  etherealDawn: '#C5E4ED',
  etherealPurple: '#E0D4F0',
};

// Glass effect colors
const glassColors = {
  white85: 'rgba(255, 255, 255, 0.85)',
  white92: 'rgba(255, 255, 255, 0.92)',
  white30: 'rgba(255, 255, 255, 0.3)',
  shadow: 'rgba(31, 38, 135, 0.15)',
};

// Gray scale
const grayColors = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
};

export default {
  light: {
    // Primary app colors
    text: grayColors[800],
    textSecondary: grayColors[600],
    background: etherealColors.etherealSky,
    tint: etherealColors.purple400,
    tabIconDefault: grayColors[400],
    tabIconSelected: etherealColors.purple400,

    // Ethereal palette
    ...etherealColors,

    // Glass effects
    glass: glassColors.white85,
    glassStrong: glassColors.white92,
    glassBorder: glassColors.white30,
    glassShadow: glassColors.shadow,

    // Semantic
    primary: etherealColors.purple400,
    secondary: etherealColors.sky400,
    accent: etherealColors.amber300,
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',

    // UI elements
    card: glassColors.white85,
    cardBorder: glassColors.white30,
    inputBackground: 'rgba(255, 255, 255, 0.6)',
    inputBorder: grayColors[300],
    placeholder: grayColors[400],

    // Tab bar
    tabBar: glassColors.white92,
    tabBarBorder: glassColors.white30,
  },
  dark: {
    // Primary app colors
    text: '#FFFFFF',
    textSecondary: grayColors[300],
    background: '#1A1A2E',
    tint: etherealColors.purple300,
    tabIconDefault: grayColors[500],
    tabIconSelected: etherealColors.purple300,

    // Ethereal palette (adjusted for dark)
    ...etherealColors,

    // Glass effects (dark mode)
    glass: 'rgba(30, 30, 40, 0.85)',
    glassStrong: 'rgba(30, 30, 45, 0.92)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassShadow: 'rgba(0, 0, 0, 0.3)',

    // Semantic
    primary: etherealColors.purple300,
    secondary: etherealColors.sky300,
    accent: etherealColors.amber200,
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',

    // UI elements
    card: 'rgba(30, 30, 40, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    inputBackground: 'rgba(50, 50, 70, 0.6)',
    inputBorder: grayColors[600],
    placeholder: grayColors[500],

    // Tab bar
    tabBar: 'rgba(30, 30, 40, 0.92)',
    tabBarBorder: 'rgba(255, 255, 255, 0.1)',
  },

  // Export raw colors for direct access
  ethereal: etherealColors,
  gray: grayColors,
  glass: glassColors,
};
