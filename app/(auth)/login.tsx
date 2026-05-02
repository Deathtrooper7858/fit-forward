import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';
import { useAuthStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';

export default function LoginScreen() {
  const colors = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setSession }          = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      Alert.alert('Login failed', error.message);
      return;
    }
    
    // Redirection is now handled automatically by NavigationGuard in _layout.tsx
    // once onAuthStateChange triggers and profile is fetched.
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.logoCircle}>
            <Text style={styles.logoText}>FF</Text>
          </LinearGradient>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Log in to continue your journey</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.btnGradient}>
              <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  scroll:      { flexGrow: 1, padding: Spacing.base },
  header:      { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoCircle:  { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoText:    { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  title:       { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle:    { fontSize: 15 },
  form:        { gap: Spacing.base },
  field:       { gap: 6 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input:       { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 15 },
  forgotWrap:  { alignSelf: 'flex-end' },
  forgotText:  { fontSize: 13, fontWeight: '500' },
  btn:         { borderRadius: Radius.md, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { padding: Spacing.base, alignItems: 'center' },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 32 },
  footerText:  { fontSize: 14 },
  footerLink:  { fontWeight: '700', fontSize: 14 },
});
