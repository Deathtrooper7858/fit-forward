import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';

import { useTheme } from '../hooks/useTheme';

/**
 * Entry point — redirects based on auth state.
 * No UI of its own; just a guard.
 */
export default function Index() {
  const { isLoading } = useAuthStore();
  const colors = useTheme();

  // Navigation is now handled by NavigationGuard in _layout.tsx
  // This screen only shows while isLoading is true (if Splash Screen was already hidden)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return null;
}
