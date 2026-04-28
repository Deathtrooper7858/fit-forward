/**
 * Fit-Forward Design System — Color Tokens
 * Dark-first palette. All surfaces reference these tokens.
 */
export const Colors = {
  // Base backgrounds
  background:   '#0D0F14',  // deepest dark
  surface:      '#161A24',  // cards, panels
  surfaceAlt:   '#1E2332',  // elevated cards
  border:       '#2A3045',  // subtle dividers

  // Brand / accent
  primary:      '#7C5CFC',  // violet-purple
  primaryLight: '#9D84FD',
  primaryDark:  '#5A3DD6',
  secondary:    '#22D3EE',  // cyan
  accent:       '#F59E0B',  // amber — calories / energy

  // Semantic
  success:      '#22C55E',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#3B82F6',

  // Text
  textPrimary:  '#F1F5F9',
  textSecondary:'#94A3B8',
  textMuted:    '#475569',
  textInverse:  '#0D0F14',

  // Macros
  protein:      '#7C5CFC',  // purple
  carbs:        '#22D3EE',  // cyan
  fat:          '#F59E0B',  // amber
  calories:     '#EF4444',  // red-ish

  // Tab bar
  tabActive:    '#7C5CFC',
  tabInactive:  '#475569',

  // Gradients (used as array pairs)
  gradientPrimary: ['#7C5CFC', '#4338CA'] as const,
  gradientCard:    ['#1E2332', '#161A24'] as const,
  gradientBurn:    ['#EF4444', '#F59E0B'] as const,

  // Pro
  pro:          '#F59E0B',
  proGradient:  ['#F59E0B', '#D97706'] as const,
};

export type ColorKey = keyof typeof Colors;
