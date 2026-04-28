import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store';
import { Colors } from '../constants';

SplashScreen.preventAutoHideAsync();

// ─── Navigation Guard ─────────────────────────────────────────────────────────
function NavigationGuard() {
  const { session, profile, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!session) {
      // Not logged in → go to auth
      if (!inAuthGroup) router.replace('/(auth)/welcome');
    } else if (session && profile && !profile.onboardingDone) {
      // Logged in but onboarding not done
      if (!inOnboarding) router.replace('/onboarding');
    } else if (session && profile?.onboardingDone) {
      // Fully onboarded → tabs
      if (inAuthGroup || inOnboarding) router.replace('/(tabs)/dashboard');
    }
  }, [session, profile, isLoading]);

  return null;
}

export default function RootLayout() {
  const { setSession, setLoading, setProfile } = useAuthStore();

  useEffect(() => {
    const handleSession = async (session: any) => {
      setSession(session);
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data && !error) {
            setProfile({
              id:             data.id,
              email:          data.email,
              name:           data.name,
              avatarUrl:      data.avatar_url,
              sex:            data.sex,
              age:            data.age,
              weight:         data.weight,
              height:         data.height,
              activityLevel:  data.activity_level,
              goal:           data.goal,
              tdee:           data.tdee,
              targetCalories: data.target_calories,
              macros:         data.macros,
              restrictions:   data.restrictions,
              preferences:    data.preferences,
              isPro:          data.is_pro,
              onboardingDone: data.onboarding_done,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch profile', err);
        }
      } else {
        setProfile(null);
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleSession(session);
      } catch (err: any) {
        console.warn('[Auth] Failed to restore session:', err?.message);
        setSession(null);
      } finally {
        setLoading(false);
        SplashScreen.hideAsync();
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="modals/scan"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/food-detail"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/body-measurements"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
