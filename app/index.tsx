import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';

/**
 * Entry point — redirects based on auth state.
 * No UI of its own; just a guard.
 */
export default function Index() {
  const { session, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile?.onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/dashboard" />;
}
