import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';

const FEATURES = [
  { icon: '🍎', label: 'Smart Food Tracking' },
  { icon: '🤖', label: 'AI Nutrition Coach' },
  { icon: '📊', label: 'Body Composition' },
  { icon: '📅', label: 'Meal Planner' },
];

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Decorative background glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.logoMark}>
            <Text style={styles.logoText}>FF</Text>
          </LinearGradient>
          <Text style={styles.brand}>Fit-Forward</Text>
          <Text style={styles.tagline}>
            Your AI-powered nutrition partner.{'\n'}Built to transform your body.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.pill}>
              <Text style={styles.pillIcon}>{f.icon}</Text>
              <Text style={styles.pillLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Get Started — It's Free</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  glow1: {
    position: 'absolute', top: -80, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#7C5CFC', opacity: 0.12,
  },
  glow2: {
    position: 'absolute', top: 120, right: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#22D3EE', opacity: 0.08,
  },
  content:        { flexGrow: 1, padding: Spacing.base, paddingTop: 100 },
  hero:           { alignItems: 'center', marginBottom: 48 },
  logoMark:       { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoText:       { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  brand:          { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1, marginBottom: 16 },
  tagline:        { fontSize: 17, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 },
  features:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 48 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  pillIcon:       { fontSize: 16 },
  pillLabel:      { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  ctas:           { gap: Spacing.md },
  primaryBtn:     { borderRadius: Radius.lg, overflow: 'hidden' },
  primaryGradient:{ padding: 18, alignItems: 'center' },
  primaryText:    { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  secondaryBtn:   { padding: 16, alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border },
  secondaryText:  { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  legal:          { marginTop: 24, textAlign: 'center', fontSize: 11, color: Colors.textMuted, lineHeight: 18 },
});
