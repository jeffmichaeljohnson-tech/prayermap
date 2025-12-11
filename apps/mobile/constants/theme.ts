/**
 * PrayerMap Ethereal Theme
 *
 * Design System Reference:
 * - Figma: https://www.figma.com/design/cTvjLgWvSTXkeDTMgyASdn/Ethereal-Prayer-Map-App
 * - GitHub: https://github.com/jeffmichaeljohnson-tech/prayermap-design-system
 *
 * This theme implements the "Ethereal Glass" aesthetic without using
 * Apple's BlurView to avoid battery drain and animation conflicts.
 */

import { ViewStyle, TextStyle } from 'react-native';

// ============================================================================
// COLOR PALETTE - Ethereal Heavenly Colors
// ============================================================================

export const colors = {
  // Dawn Blues
  sky: {
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
  },

  // Soft Golds
  amber: {
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
  },

  // Gentle Purples
  purple: {
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
  },

  // Soft Pink (for accents)
  pink: {
    300: '#F9A8D4',
    400: '#F472B6',
  },

  // Ethereal Background Gradient Colors (HSL values for gradient)
  ethereal: {
    sky: 'hsl(210, 100%, 95%)',      // Light sky blue
    dawn: 'hsl(200, 80%, 85%)',      // Gentle dawn blue
    purple: 'hsl(270, 60%, 90%)',    // Soft lavender
    gold: 'hsl(45, 100%, 85%)',      // Warm gold
  },

  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',

  // Gray Scale
  gray: {
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
  },

  // Semantic Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Prayer State Colors
  prayer: {
    active: 'hsl(45, 100%, 70%)',    // Gold for active prayers
    answered: 'hsl(150, 60%, 70%)',  // Green for answered
  },

  // Glass Effect Colors (rgba for transparency)
  glass: {
    white10: 'rgba(255, 255, 255, 0.1)',
    white20: 'rgba(255, 255, 255, 0.2)',
    white30: 'rgba(255, 255, 255, 0.3)',
    white40: 'rgba(255, 255, 255, 0.4)',
    white85: 'rgba(255, 255, 255, 0.85)',
    white92: 'rgba(255, 255, 255, 0.92)',
    black50: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(31, 38, 135, 0.15)',
    shadowStrong: 'rgba(31, 38, 135, 0.2)',
  },
};

// ============================================================================
// GRADIENTS - Ethereal Background Gradients
// ============================================================================

export const gradients = {
  // Main ethereal background (sky → dawn → purple)
  etherealBackground: ['#E8F4F8', '#C5E4ED', '#E0D4F0'],

  // Prayer connection line gradient (gold → blue → purple)
  connectionLine: ['#FFD700', '#70B8E8', '#A78BFA'],
  connectionLineReverse: ['#A78BFA', '#70B8E8', '#FFD700'],

  // Button gradient (gold → purple)
  primaryButton: ['#FCD34D', '#C084FC'],

  // Glow gradients
  goldGlow: ['rgba(252, 211, 77, 0.6)', 'rgba(252, 211, 77, 0)'],
  purpleGlow: ['rgba(192, 132, 252, 0.6)', 'rgba(192, 132, 252, 0)'],

  // Particle trail gradient
  particleTrail: ['#FFD700', '#FFC0CB', '#9370DB', '#87CEEB'],
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families
  fonts: {
    display: 'Cinzel',           // Headers, titles, branding
    body: 'Inter',               // Body text, UI elements
    mono: 'SpaceMono',           // Code, timestamps
  },

  // Font Sizes (in pixels, will need scaling for RN)
  sizes: {
    display: 48,
    title: 32,
    heading: 24,
    subheading: 20,
    body: 16,
    small: 14,
    caption: 12,
    tiny: 10,
  },

  // Font Weights
  weights: {
    light: '300' as TextStyle['fontWeight'],
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },

  // Line Heights
  lineHeights: {
    tight: 1.0,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2.0,
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  base: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
  // Ethereal glow shadow (blue-tinted)
  ethereal: {
    shadowColor: '#1F2687',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
};

// ============================================================================
// FAUX-GLASS STYLES (No BlurView - Battery Efficient)
// ============================================================================

export const glass: Record<string, ViewStyle> = {
  // Light glass - for cards, containers
  light: {
    backgroundColor: colors.glass.white85,
    borderWidth: 1,
    borderColor: colors.glass.white30,
    ...shadows.ethereal,
  },

  // Strong glass - for modals, important elements
  strong: {
    backgroundColor: colors.glass.white92,
    borderWidth: 1,
    borderColor: colors.glass.white40,
    shadowColor: '#1F2687',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },

  // Subtle glass - for hover states, overlays
  subtle: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: colors.glass.white20,
    shadowColor: '#1F2687',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },

  // Dark glass - for dark mode or contrast areas
  dark: {
    backgroundColor: 'rgba(30, 30, 40, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
  },
};

// ============================================================================
// ANIMATION DURATIONS
// ============================================================================

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 1000,
  dramatic: 2000,

  // Spring configurations for react-native-reanimated
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    default: { damping: 15, stiffness: 300 },
    bouncy: { damping: 10, stiffness: 400 },
  },
};

// ============================================================================
// CATEGORY COLORS (Prayer Categories)
// ============================================================================

export const categoryColors = {
  health: { bg: 'rgba(248, 113, 113, 0.3)', text: '#DC2626' },      // Red
  peace: { bg: 'rgba(96, 165, 250, 0.3)', text: '#2563EB' },        // Blue
  gratitude: { bg: 'rgba(251, 191, 36, 0.3)', text: '#D97706' },    // Amber
  relationships: { bg: 'rgba(244, 114, 182, 0.3)', text: '#DB2777' }, // Pink
  guidance: { bg: 'rgba(192, 132, 252, 0.3)', text: '#9333EA' },    // Purple
  financial: { bg: 'rgba(52, 211, 153, 0.3)', text: '#059669' },    // Green
  spiritual: { bg: 'rgba(129, 140, 248, 0.3)', text: '#4F46E5' },   // Indigo
  general: { bg: 'rgba(253, 224, 71, 0.3)', text: '#CA8A04' },      // Yellow
};

// ============================================================================
// THEME EXPORT
// ============================================================================

const theme = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  glass,
  animation,
  categoryColors,
};

export default theme;
