/**
 * FitGO Design System — Color Tokens
 * Supports light and dark modes.
 */

const Palette = {
  // Common brand colors
  primary:      '#7C5CFC',  // violet-purple
  primaryLight: '#9D84FD',
  primaryDark:  '#5A3DD6',
  secondary:    '#22D3EE',  // cyan
  accent:       '#F59E0B',  // amber — calories / energy
  
  success:      '#22C55E',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#3B82F6',

  protein:      '#7C5CFC',  // purple
  carbs:        '#22D3EE',  // cyan
  fat:          '#F59E0B',  // amber
  calories:     '#EF4444',  // red-ish
};

export const Colors = {
  dark: {
    ...Palette,
    background:   '#0D0F14',
    surface:      '#161A24',
    surfaceAlt:   '#1E2332',
    border:       '#2A3045',
    textPrimary:  '#F1F5F9',
    textSecondary:'#94A3B8',
    textMuted:    '#475569',
    textInverse:  '#0D0F14',
    tabActive:    '#7C5CFC',
    tabInactive:  '#475569',
    gradientPrimary: ['#7C5CFC', '#4338CA'] as const,
    gradientCard:    ['#1E2332', '#161A24'] as const,
    gradientBurn:    ['#EF4444', '#F59E0B'] as const,
    pro:          '#F59E0B',
    proGradient:  ['#F59E0B', '#D97706'] as const,
  },
  light: {
    ...Palette,
    background:   '#F8FAFC',
    surface:      '#FFFFFF',
    surfaceAlt:   '#F1F5F9',
    border:       '#E2E8F0',
    textPrimary:  '#0F172A',
    textSecondary:'#475569',
    textMuted:    '#94A3B8',
    textInverse:  '#F1F5F9',
    tabActive:    '#7C5CFC',
    tabInactive:  '#94A3B8',
    gradientPrimary: ['#7C5CFC', '#4338CA'] as const,
    gradientCard:    ['#FFFFFF', '#F1F5F9'] as const,
    gradientBurn:    ['#EF4444', '#F59E0B'] as const,
    pro:          '#F59E0B',
    proGradient:  ['#F59E0B', '#D97706'] as const,
  }
};

export type ThemeColors = typeof Colors.dark;
export type ColorKey = keyof ThemeColors;
