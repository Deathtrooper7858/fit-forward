import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore } from '../../../store';
import { supabase } from '../../../services/supabase';

const RING_SIZE     = 180;
const STROKE_WIDTH  = 15;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Calorie Ring ─────────────────────────────────────────────────────────────
function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct             = Math.min(consumed / Math.max(target, 1), 1);
  const strokeDashoffset = CIRCUMFERENCE - pct * CIRCUMFERENCE;
  const remaining        = Math.max(target - consumed, 0);

  return (
    <View style={ring.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={Colors.surfaceAlt} strokeWidth={STROKE_WIDTH} fill="transparent" />
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={pct > 0.9 ? '#EF4444' : Colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
      </Svg>
      <View style={ring.textWrap}>
        <Text style={ring.consumed}>{consumed}</Text>
        <Text style={ring.label}>kcal eaten</Text>
        <View style={ring.divider} />
        <Text style={ring.remaining}>{remaining} left</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: RING_SIZE, width: RING_SIZE, alignSelf: 'center', marginVertical: 12 },
  textWrap:  { position: 'absolute', alignItems: 'center', zIndex: 2 },
  consumed:  { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  label:     { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  divider:   { width: 40, height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  remaining: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  return (
    <View style={macro.wrap}>
      <View style={macro.row}>
        <Text style={macro.label}>{label}</Text>
        <Text style={macro.values}><Text style={{ color }}>{current}</Text>/{target}g</Text>
      </View>
      <View style={macro.track}>
        <View style={[macro.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const macro = StyleSheet.create({
  wrap:   { gap: 6 },
  row:    { flexDirection: 'row', justifyContent: 'space-between' },
  label:  { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  values: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  track:  { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  fill:   { height: 8, borderRadius: 4 },
});

// ─── Quick-action button ──────────────────────────────────────────────────────
function QuickAction({ emoji, label, onPress, subValue }: {
  emoji: string; label: string; onPress: () => void; subValue?: string;
}) {
  return (
    <TouchableOpacity style={qa.btn} onPress={onPress} activeOpacity={0.75}>
      <LinearGradient colors={[Colors.surfaceAlt, Colors.surface]} style={qa.gradient}>
        <Text style={qa.emoji}>{emoji}</Text>
        <Text style={qa.label}>{label}</Text>
        {subValue && <Text style={qa.subValue}>{subValue}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const qa = StyleSheet.create({
  btn:      { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  gradient: { padding: Spacing.base, alignItems: 'center', gap: 4 },
  emoji:    { fontSize: 26 },
  label:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  subValue: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
});

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { profile }                                         = useAuthStore();
  const { todayLogs, waterIntake, addWater, setLogs, totals, streakDays, setStreak } = useNutritionStore();
  const { calories, protein, carbs, fat }                  = useMemo(() => totals(), [todayLogs]);

  const target   = profile?.targetCalories ?? 2000;
  const macros   = profile?.macros ?? { protein: 150, carbs: 200, fat: 67 };
  const name     = profile?.name?.split(' ')[0] ?? 'there';
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Load today's logs from Supabase
  useEffect(() => {
    async function loadTodayData() {
      if (!profile?.id) return;
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', profile.id)
        .gte('logged_at', today)
        .lte('logged_at', today + 'T23:59:59');

      if (data && !error) {
        const formattedLogs = data.map((d: any) => ({
          id:        d.id,
          foodItem:  {
            id:       d.food_id ?? d.id,
            name:     d.food_name,
            calories: d.grams > 0 ? Math.round((d.calories / d.grams) * 100) : d.calories,
            protein:  d.grams > 0 ? Math.round((d.protein  / d.grams) * 100) : d.protein,
            carbs:    d.grams > 0 ? Math.round((d.carbs    / d.grams) * 100) : d.carbs,
            fat:      d.grams > 0 ? Math.round((d.fat      / d.grams) * 100) : d.fat,
            source:   'custom',
          },
          grams:    d.grams,
          meal:     d.meal,
          loggedAt: d.logged_at ?? d.created_at,
          calories: d.calories,
          protein:  d.protein,
          carbs:    d.carbs,
          fat:      d.fat,
        }));
        setLogs(formattedLogs as any);
      }

      // Calculate real streak from Supabase
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
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}, {name} 👋</Text>
            <Text style={s.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
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
        <View style={s.card}>
          <Text style={s.sectionTitle}>Today's Progress</Text>
          <CalorieRing consumed={calories} target={target} />
          <View style={s.macros}>
            <MacroBar label="Protein"       current={protein} target={macros.protein} color={Colors.protein} />
            <MacroBar label="Carbohydrates" current={carbs}   target={macros.carbs}   color={Colors.carbs}   />
            <MacroBar label="Fat"           current={fat}     target={macros.fat}     color={Colors.fat}     />
          </View>
        </View>

        {/* Quick actions */}
        <Text style={[s.sectionTitle, { marginHorizontal: Spacing.base, marginTop: Spacing.lg }]}>
          Quick Actions
        </Text>
        <View style={s.actions}>
          <QuickAction emoji="🍽️" label="Log Meal"  onPress={() => router.push('/(tabs)/tracker')} />
          <QuickAction emoji="📷" label="Scan Food" onPress={() => router.push('/modals/scan')} />
          <QuickAction emoji="🤖" label="Ask Fitz"  onPress={() => router.push('/(tabs)/coach')} />
          <QuickAction emoji="🥗" label="Recipes"   onPress={() => router.push('/modals/recipes')} />
        </View>

        {/* Streak + water row */}
        <View style={s.bannerRow}>
          <LinearGradient colors={['#7C5CFC22', '#22D3EE11']} style={[s.banner, { flex: 3 }]}>
            <Text style={s.bannerEmoji}>🔥</Text>
            <View>
              <Text style={s.bannerTitle}>
                {streakDays > 0 ? `${streakDays}-Day Streak!` : 'Start your streak!'}
              </Text>
              <Text style={s.bannerSub}>
                {streakDays > 0 ? 'Keep logging to maintain momentum' : 'Log today to begin'}
              </Text>
            </View>
          </LinearGradient>
          <TouchableOpacity style={[s.banner, s.waterBanner, { flex: 1 }]} onPress={handleAddWater} activeOpacity={0.8}>
            <Text style={s.bannerEmoji}>💧</Text>
            <Text style={s.waterNum}>{(waterIntake / 1000).toFixed(1)}L</Text>
            <Text style={s.bannerSub}>of 2L</Text>
          </TouchableOpacity>
        </View>

        {/* Recent logs */}
        {todayLogs.length > 0 && (
          <View style={s.recentWrap}>
            <View style={s.recentHeader}>
              <Text style={s.sectionTitle}>Recent Logs</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/tracker')}>
                <Text style={s.seeAll}>See all ›</Text>
              </TouchableOpacity>
            </View>
            {todayLogs.slice(-3).reverse().map((log) => (
              <View key={log.id} style={s.logRow}>
                <View>
                  <Text style={s.logName}>{log.foodItem.name}</Text>
                  <Text style={s.logMeal}>{log.meal} · {log.grams}g</Text>
                </View>
                <Text style={s.logCal}>{log.calories} kcal</Text>
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
  safe:         { flex: 1, backgroundColor: Colors.background },
  scroll:       { flex: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg },
  greeting:     { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  date:         { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  avatar:       { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatarGrad:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarImage:  { width: 44, height: 44, borderRadius: 22 },
  card:         { margin: Spacing.base, borderRadius: Radius.xl, backgroundColor: Colors.surface, padding: Spacing.base, ...Shadow.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  macros:       { gap: Spacing.md, marginTop: Spacing.lg },
  actions:      { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.base, marginTop: 8 },
  bannerRow:    { flexDirection: 'row', gap: 10, margin: Spacing.base },
  banner:       { borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#7C5CFC33' },
  waterBanner:  { flexDirection: 'column', borderColor: '#22D3EE33', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bannerEmoji:  { fontSize: 28 },
  bannerTitle:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  bannerSub:    { fontSize: 11, color: Colors.textSecondary },
  waterNum:     { fontSize: 20, fontWeight: '800', color: Colors.secondary },
  recentWrap:   { marginHorizontal: Spacing.base, marginTop: Spacing.md },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  seeAll:       { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  logRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logName:      { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  logMeal:      { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  logCal:       { fontSize: 14, color: Colors.accent, fontWeight: '700' },
});
