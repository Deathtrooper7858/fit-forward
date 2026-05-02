/**
 * FitGO Design System — Color Tokens
 * Supports light and dark modes.
 */

const Palette = {
  // Common brand colors
  primary:      '#EAB308',  // yellow / gold
  primaryLight: '#FDE047',
  primaryDark:  '#CA8A04',
  secondary:    '#22D3EE',  // cyan
  accent:       '#F59E0B',  // amber — calories / energy
  
  success:      '#22C55E',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#3B82F6',

  protein:      '#EAB308',  // yellow
  carbs:        '#22D3EE',  // cyan
  fat:          '#F59E0B',  // amber
  calories:     '#EF4444',  // red-ish
};

export const Colors = {
  dark: {
    ...Palette,
    background:   '#000000',
    surface:      '#1C1C1E',
    surfaceAlt:   '#2C2C2E',
    border:       '#3A3A3C',
    textPrimary:  '#F1F5F9',
    textSecondary:'#94A3B8',
    textMuted:    '#64748B',
    textInverse:  '#000000',
    tabActive:    '#EAB308',
    tabInactive:  '#64748B',
    gradientPrimary: ['#EAB308', '#CA8A04'] as const,
    gradientCard:    ['#1C1C1E', '#000000'] as const,
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
    textInverse:  '#FFFFFF',
    tabActive:    '#EAB308',
    tabInactive:  '#94A3B8',
    gradientPrimary: ['#EAB308', '#CA8A04'] as const,
    gradientCard:    ['#FFFFFF', '#F1F5F9'] as const,
    gradientBurn:    ['#EF4444', '#F59E0B'] as const,
    pro:          '#F59E0B',
    proGradient:  ['#F59E0B', '#D97706'] as const,
  }
};

export type ThemeColors = typeof Colors.dark;
export type ColorKey = keyof ThemeColors;
