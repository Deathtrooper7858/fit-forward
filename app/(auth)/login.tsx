import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';
import { useAuthStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setSession }          = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillFields'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      Alert.alert(t('auth.loginFailed'), error.message);
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
        <View style={styles.header}>
          <Image 
            source={require('../../assets/fitgo.jpeg')} 
            style={styles.logoImage} 
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.login')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.loginSub')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
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
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
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
            <Text style={[styles.forgotText, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.btnGradient}>
              <Text style={styles.btnText}>{loading ? t('auth.signingIn') : t('auth.signIn')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount').split('?')[0]}? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.register')}</Text>
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
  logoImage:   { width: 80, height: 80, borderRadius: 24, marginBottom: 20 },
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
