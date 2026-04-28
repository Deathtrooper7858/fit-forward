import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';

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
  const [selected, setSelected] = React.useState('annual');

  return (
    <View style={s.container}>
      <View style={s.handle} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <LinearGradient colors={['#7C5CFC22', '#22D3EE11']} style={s.hero}>
          <Text style={s.heroEmoji}>⭐</Text>
          <Text style={s.heroTitle}>Unlock Fit-Forward Pro</Text>
          <Text style={s.heroSub}>Everything you need to transform your body, powered by AI.</Text>
        </LinearGradient>

        {/* Features */}
        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f} style={s.featureRow}>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={s.plans}>
          {PLANS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[s.planCard, selected === p.id && s.planCardActive]}
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
                  <Text style={s.planLabel}>{p.label}</Text>
                  {p.priceNote && <Text style={s.planNote}>{p.priceNote}</Text>}
                </View>
                <View style={s.planPriceWrap}>
                  <Text style={[s.planPrice, selected === p.id && s.planPriceActive]}>{p.price}</Text>
                  <Text style={s.planPeriod}>{p.period}</Text>
                </View>
              </View>
              {selected === p.id && (
                <View style={s.checkWrap}>
                  <View style={s.checkCircle}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial note */}
        <Text style={s.trial}>🎁 7-day free trial — cancel anytime</Text>

        {/* CTA */}
        <TouchableOpacity style={s.cta} activeOpacity={0.85}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={s.ctaGrad}>
            <Text style={s.ctaText}>Start Free Trial</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={() => router.back()}>
          <Text style={s.restoreText}>Restore Purchase</Text>
        </TouchableOpacity>

        <Text style={s.legal}>
          Payment will be charged to your account. Subscription auto-renews unless cancelled 24 hours before renewal.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  handle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12 },
  scroll:          { padding: Spacing.base, paddingBottom: 40 },
  hero:            { borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center', marginVertical: Spacing.base, borderWidth: 1, borderColor: '#7C5CFC33' },
  heroEmoji:       { fontSize: 40, marginBottom: 12 },
  heroTitle:       { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  heroSub:         { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  features:        { marginBottom: Spacing.xl },
  featureRow:      { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border },
  featureText:     { fontSize: 14, color: Colors.textPrimary },
  plans:           { gap: 10, marginBottom: Spacing.base },
  planCard:        { borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, overflow: 'hidden' },
  planCardActive:  { borderColor: Colors.pro, backgroundColor: '#F59E0B11' },
  planBadge:       { paddingVertical: 6, alignItems: 'center' },
  planBadgeText:   { color: '#fff', fontWeight: '700', fontSize: 12 },
  planContent:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  planLabel:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  planNote:        { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  planPriceWrap:   { alignItems: 'flex-end' },
  planPrice:       { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  planPriceActive: { color: Colors.pro },
  planPeriod:      { fontSize: 12, color: Colors.textMuted },
  checkWrap:       { position: 'absolute', top: Spacing.base, right: Spacing.base },
  checkCircle:     { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.pro, justifyContent: 'center', alignItems: 'center' },
  checkText:       { color: '#fff', fontWeight: '800', fontSize: 13 },
  trial:           { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginVertical: 12 },
  cta:             { borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 12 },
  ctaGrad:         { padding: 18, alignItems: 'center' },
  ctaText:         { color: '#fff', fontWeight: '800', fontSize: 17 },
  restoreBtn:      { alignItems: 'center', padding: 12 },
  restoreText:     { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  legal:           { textAlign: 'center', fontSize: 11, color: Colors.textMuted, lineHeight: 16, marginTop: 8 },
});
