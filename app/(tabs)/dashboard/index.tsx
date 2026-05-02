import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../../store';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../services/supabase';

const RING_SIZE     = 180;
const STROKE_WIDTH  = 15;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Calorie Ring ─────────────────────────────────────────────────────────────
const ring = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: RING_SIZE, width: RING_SIZE, alignSelf: 'center', marginVertical: 12 },
  textWrap:  { position: 'absolute', alignItems: 'center', zIndex: 2 },
  consumed:  { fontSize: 32, fontWeight: '800' },
  label:     { fontSize: 12, marginBottom: 4 },
  divider:   { width: 40, height: 1, marginVertical: 4 },
  remaining: { fontSize: 13, fontWeight: '600' },
});

// ... (skipping some logic)

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pct             = Math.min(consumed / Math.max(target, 1), 1);
  const strokeDashoffset = CIRCUMFERENCE - pct * CIRCUMFERENCE;
  const remaining        = Math.max(target - consumed, 0);

  return (
    <View style={ring.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={colors.surfaceAlt} strokeWidth={STROKE_WIDTH} fill="transparent" />
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={pct > 0.9 ? colors.error : colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
      </Svg>
      <View style={ring.textWrap}>
        <Text style={[ring.consumed, { color: colors.textPrimary }]}>{consumed}</Text>
        <Text style={[ring.label, { color: colors.textSecondary }]}>{t('dashboard.kcalEaten')}</Text>
        <View style={[ring.divider, { backgroundColor: colors.border }]} />
        <Text style={[ring.remaining, { color: colors.primary }]}>{remaining} {t('dashboard.kcalLeft')}</Text>
      </View>
    </View>
  );
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const colors = useTheme();
  const pct = Math.min(current / Math.max(target, 1), 1);
  return (
    <View style={macro.wrap}>
      <View style={macro.row}>
        <Text style={[macro.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[macro.values, { color: colors.textMuted }]}><Text style={{ color }}>{current}</Text>/{target}g</Text>
      </View>
      <View style={[macro.track, { backgroundColor: colors.border }]}>
        <View style={[macro.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const macro = StyleSheet.create({
  wrap:   { gap: 6 },
  row:    { flexDirection: 'row', justifyContent: 'space-between' },
  label:  { fontSize: 13, fontWeight: '500' },
  values: { fontSize: 13, fontWeight: '500' },
  track:  { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill:   { height: 8, borderRadius: 4 },
});

// ─── Quick-action button ──────────────────────────────────────────────────────
function QuickAction({ emoji, label, onPress, subValue }: {
  emoji: string; label: string; onPress: () => void; subValue?: string;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[qa.btn, { borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={qa.gradient}>
        <Text style={qa.emoji}>{emoji}</Text>
        <Text style={[qa.label, { color: colors.textSecondary }]}>{label}</Text>
        {subValue && <Text style={[qa.subValue, { color: colors.primary }]}>{subValue}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const qa = StyleSheet.create({
  btn:      { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  gradient: { padding: Spacing.base, alignItems: 'center', gap: 4 },
  emoji:    { fontSize: 26 },
  label:    { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  subValue: { fontSize: 11, fontWeight: '700' },
});

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile }                                         = useAuthStore();
  const { todayLogs, waterIntake, addWater, setLogs, totals, streakDays, setStreak, fetchLogs } = useNutritionStore();
  const { calories, protein, carbs, fat }                  = useMemo(() => totals(), [todayLogs]);

  const target   = profile?.targetCalories ?? 2000;
  const macros   = profile?.macros ?? { protein: 150, carbs: 200, fat: 67 };
  const name     = profile?.name?.split(' ')[0] ?? t('dashboard.fallbackName');
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening');

  // Load today's logs from Supabase
  useEffect(() => {
    async function loadTodayData() {
      if (!profile?.id) return;
      const today = new Date().toISOString().split('T')[0];
      
      await fetchLogs(profile.id, today);
      calculateStreak(profile.id);
    }

    async function calculateStreak(userId: string) {
      const { data } = await supabase
        .from('food_logs')
        .select('logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (!data || data.length === 0) { setStreak(0); return; }

      const loggedDays = [...new Set(data.map((d: any) =>
        (d.logged_at ?? '').substring(0, 10)
      ))].sort().reverse();

      let streak   = 0;
      const today2 = new Date();
      for (let i = 0; i < loggedDays.length; i++) {
        const expected = new Date(today2);
        expected.setDate(expected.getDate() - i);
        const expectedStr = expected.toISOString().split('T')[0];
        if (loggedDays[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
      setStreak(streak);
    }

    loadTodayData();
  }, [profile?.id]);

  const handleAddWater = () => addWater(250);

  const waterGlasses    = Math.floor(waterIntake / 250);
  const waterTarget     = 8; // 8 glasses = 2L

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: colors.textPrimary }]}>{greeting}, {name} 👋</Text>
            <Text style={[s.date, { color: colors.textSecondary }]}>{new Date().toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatarGrad}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{name[0]?.toUpperCase()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Calorie card */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('dashboard.todayProgress')}</Text>
          <CalorieRing consumed={calories} target={target} />
          <View style={s.macros}>
            <MacroBar label={t('profile.protein') || 'Protein'}       current={protein} target={macros.protein} color={colors.protein} />
            <MacroBar label={t('profile.carbs') || 'Carbohydrates'} current={carbs}   target={macros.carbs}   color={colors.carbs}   />
            <MacroBar label={t('profile.fat') || 'Fat'}           current={fat}     target={macros.fat}     color={colors.fat}     />
          </View>
        </View>

        {/* Quick actions */}
        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginHorizontal: Spacing.base, marginTop: Spacing.lg }]}>
          {t('dashboard.quickActions')}
        </Text>
        <View style={s.actions}>
          <QuickAction emoji="🍽️" label={t('dashboard.logMeal')}  onPress={() => router.push('/(tabs)/tracker')} />
          <QuickAction emoji="📷" label={t('dashboard.scanFood')} onPress={() => router.push('/modals/scan')} />
          <QuickAction emoji="🍎" label={t('tabs.nutritionist')}  onPress={() => router.push({ pathname: '/(tabs)/coach', params: { initialTab: 'nutritionist' } } as any)} />
          <QuickAction emoji="💪" label={t('tabs.trainer')}       onPress={() => router.push({ pathname: '/(tabs)/coach', params: { initialTab: 'trainer' } } as any)} />
        </View>

        {/* Streak + water row */}
        <View style={s.bannerRow}>
          <LinearGradient colors={[colors.surfaceAlt + '44', colors.surface + '22']} style={[s.banner, { flex: 3, borderColor: colors.border }]}>
            <Text style={s.bannerEmoji}>🔥</Text>
            <View>
              <Text style={[s.bannerTitle, { color: colors.textPrimary }]}>
                {streakDays > 0 ? t('dashboard.streak', { count: streakDays }) : t('dashboard.startStreak')}
              </Text>
              <Text style={[s.bannerSub, { color: colors.textSecondary }]}>
                {streakDays > 0 ? t('dashboard.streakKeep') : t('dashboard.streakStart')}
              </Text>
            </View>
          </LinearGradient>
          <TouchableOpacity style={[s.banner, s.waterBanner, { flex: 1, borderColor: colors.border }]} onPress={handleAddWater} activeOpacity={0.8}>
            <Text style={s.bannerEmoji}>💧</Text>
            <Text style={[s.waterNum, { color: colors.secondary }]}>{(waterIntake / 1000).toFixed(1)}L</Text>
            <Text style={[s.bannerSub, { color: colors.textSecondary }]}>{t('dashboard.of2L')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent logs */}
        {todayLogs.length > 0 && (
          <View style={s.recentWrap}>
            <View style={s.recentHeader}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{t('dashboard.recentLogs')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tracker')}>
              <Text style={[s.seeAll, { color: colors.primary }]}>{t('dashboard.seeAll')} ›</Text>
            </TouchableOpacity>
          </View>
            {todayLogs.slice(-3).reverse().map((log) => (
              <View key={log.id} style={[s.logRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[s.logName, { color: colors.textPrimary }]}>{log.foodItem.name}</Text>
                  <Text style={[s.logMeal, { color: colors.textSecondary }]}>
                    {log.meal} · {log.grams}g · {new Date(log.loggedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
                <Text style={[s.logCal, { color: colors.accent }]}>{log.calories} kcal</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { flex: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg },
  greeting:     { fontSize: 22, fontWeight: '700' },
  date:         { fontSize: 13, marginTop: 2 },
  avatar:       { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarGrad:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarImage:  { width: 44, height: 44, borderRadius: 22 },
  card:         { margin: Spacing.base, borderRadius: Radius.xl, padding: Spacing.base, ...Shadow.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.md },
  macros:       { gap: Spacing.md, marginTop: Spacing.lg },
  actions:      { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.base, marginTop: 8 },
  bannerRow:    { flexDirection: 'row', gap: 10, margin: Spacing.base },
  banner:       { borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1 },
  waterBanner:  { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bannerEmoji:  { fontSize: 28 },
  bannerTitle:  { fontSize: 14, fontWeight: '700' },
  bannerSub:    { fontSize: 11 },
  waterNum:     { fontSize: 20, fontWeight: '800' },
  recentWrap:   { marginHorizontal: Spacing.base, marginTop: Spacing.md },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  seeAll:       { fontSize: 13, fontWeight: '600' },
  logRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  logName:      { fontSize: 14, fontWeight: '500' },
  logMeal:      { fontSize: 12, textTransform: 'capitalize', marginTop: 2 },
  logCal:       { fontSize: 14, fontWeight: '700' },
});
