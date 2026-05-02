import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Radius } from '../../constants';

const PLANS = [
  {
    id:     'monthly',
    label:  'Monthly',
    price:  '$9.99',
    period: '/month',
    badge:  null,
  },
  {
    id:     'annual',
    label:  'Annual',
    price:  '$59.99',
    period: '/year',
    badge:  'Best Value — Save 50%',
    priceNote: 'Just $5/month',
  },
  {
    id:     'lifetime',
    label:  'Lifetime',
    price:  '$149.99',
    period: ' once',
    badge:  null,
  },
];

const FEATURES = [
  '🤖 Unlimited AI Coach messages',
  '📸 Food photo recognition',
  '🎙️ Voice food logging',
  '📊 Full body measurements tracking',
  '📅 AI meal plan generation',
  '🛒 Auto shopping list',
  '📤 Export plans as PDF',
  '📈 Weekly AI analysis',
  '🍳 Pro recipe library',
  '🚫 No ads ever',
];

export default function PaywallModal() {
  const colors = useTheme();
  const [selected, setSelected] = React.useState('annual');

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.handle, { backgroundColor: colors.border }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <LinearGradient colors={colors.theme === 'dark' ? ['#7C5CFC22', '#22D3EE11'] : [colors.primary + '15', colors.secondary + '08']} style={[s.hero, { borderColor: colors.primary + '33' }]}>
          <Text style={s.heroEmoji}>⭐</Text>
          <Text style={[s.heroTitle, { color: colors.textPrimary }]}>Unlock FitGO Pro</Text>
          <Text style={[s.heroSub, { color: colors.textSecondary }]}>Everything you need to transform your body, powered by AI.</Text>
        </LinearGradient>

        {/* Features */}
        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f} style={[s.featureRow, { borderBottomColor: colors.border }]}>
              <Text style={[s.featureText, { color: colors.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={s.plans}>
          {PLANS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[s.planCard, { backgroundColor: colors.surface, borderColor: colors.border }, selected === p.id && { borderColor: colors.pro, backgroundColor: colors.pro + '11' }]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.8}
            >
              {p.badge && (
                <LinearGradient colors={['#F59E0B', '#D97706']} style={s.planBadge}>
                  <Text style={s.planBadgeText}>{p.badge}</Text>
                </LinearGradient>
              )}
              <View style={s.planContent}>
                <View>
                  <Text style={[s.planLabel, { color: colors.textPrimary }]}>{p.label}</Text>
                  {p.priceNote && <Text style={[s.planNote, { color: colors.textSecondary }]}>{p.priceNote}</Text>}
                </View>
                <View style={s.planPriceWrap}>
                  <Text style={[s.planPrice, { color: colors.textPrimary }, selected === p.id && { color: colors.pro }]}>{p.price}</Text>
                  <Text style={[s.planPeriod, { color: colors.textMuted }]}>{p.period}</Text>
                </View>
              </View>
              {selected === p.id && (
                <View style={s.checkWrap}>
                  <View style={[s.checkCircle, { backgroundColor: colors.pro }]}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial note */}
        <Text style={[s.trial, { color: colors.textSecondary }]}>🎁 7-day free trial — cancel anytime</Text>

        {/* CTA */}
        <TouchableOpacity style={s.cta} activeOpacity={0.85}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={s.ctaGrad}>
            <Text style={s.ctaText}>Start Free Trial</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={() => router.back()}>
          <Text style={[s.restoreText, { color: colors.textSecondary }]}>Restore Purchase</Text>
        </TouchableOpacity>

        <Text style={[s.legal, { color: colors.textMuted }]}>
          Payment will be charged to your account. Subscription auto-renews unless cancelled 24 hours before renewal.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1 },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  scroll:          { padding: Spacing.base, paddingBottom: 40 },
  hero:            { borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center', marginVertical: Spacing.base, borderWidth: 1 },
  heroEmoji:       { fontSize: 40, marginBottom: 12 },
  heroTitle:       { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroSub:         { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  features:        { marginBottom: Spacing.xl },
  featureRow:      { paddingVertical: 7, borderBottomWidth: 1 },
  featureText:     { fontSize: 14 },
  plans:           { gap: 10, marginBottom: Spacing.base },
  planCard:        { borderRadius: Radius.lg, borderWidth: 1.5, overflow: 'hidden' },
  planBadge:       { paddingVertical: 6, alignItems: 'center' },
  planBadgeText:   { color: '#fff', fontWeight: '700', fontSize: 12 },
  planContent:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  planLabel:       { fontSize: 16, fontWeight: '700' },
  planNote:        { fontSize: 12, marginTop: 2 },
  planPriceWrap:   { alignItems: 'flex-end' },
  planPrice:       { fontSize: 20, fontWeight: '800' },
  planPeriod:      { fontSize: 12 },
  checkWrap:       { position: 'absolute', top: Spacing.base, right: Spacing.base },
  checkCircle:     { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  checkText:       { color: '#fff', fontWeight: '800', fontSize: 13 },
  trial:           { textAlign: 'center', fontSize: 14, marginVertical: 12 },
  cta:             { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 12 },
  ctaGrad:         { padding: 18, alignItems: 'center' },
  ctaText:         { color: '#fff', fontWeight: '800', fontSize: 17 },
  restoreBtn:      { alignItems: 'center', padding: 12 },
  restoreText:     { fontSize: 14, fontWeight: '500' },
  legal:           { textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 8 },
});
