import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';

export default function ForgotPasswordScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.emoji}>📧</Text>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.sub}>
            We sent a password reset link to{'\n'}
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>{email}</Text>
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.content}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Reset Password</Text>
        <Text style={s.sub}>Enter the email address associated with your account</Text>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.btnGrad}>
            <Text style={s.btnText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  content:    { flex: 1, padding: Spacing.base, paddingTop: 60, justifyContent: 'flex-start' },
  back:       { marginBottom: 32 },
  backText:   { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  emoji:      { fontSize: 48, textAlign: 'center', marginBottom: 20, marginTop: 60 },
  title:      { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  sub:        { fontSize: 15, color: Colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  field:      { gap: 6, marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 },
  input:      { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.base, fontSize: 15, color: Colors.textPrimary },
  btn:        { borderRadius: Radius.md, overflow: 'hidden' },
  btnDisabled:{ opacity: 0.6 },
  btnGrad:    { padding: 18, alignItems: 'center' },
  btnText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  backBtn:    { marginTop: 24, alignItems: 'center' },
  backBtnText:{ color: Colors.primary, fontWeight: '600', fontSize: 15 },
});
