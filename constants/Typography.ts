/**
 * Fit-Forward Design System — Typography
 * Using Inter (body) + DM Sans (display) via expo-font / Google Fonts
 */
export const Typography = {
  // Font families — loaded via expo-font
  fontFamily: {
    regular:      'Inter_400Regular',
    medium:       'Inter_500Medium',
    semiBold:     'Inter_600SemiBold',
    bold:         'Inter_700Bold',
    displayReg:   'DMSans_400Regular',
    displayBold:  'DMSans_700Bold',
  },

  // Font sizes (sp — scales with system)
  fontSize: {
    xs:   11,
    sm:   13,
    base: 15,
    md:   17,
    lg:   20,
    xl:   24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },

  // Line heights
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  tracking: {
    tight:  -0.5,
    normal:  0,
    wide:    0.5,
    wider:   1,
  },
};
