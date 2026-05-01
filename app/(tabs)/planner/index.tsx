import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore } from '../../../store';
import { generateMealPlan, generateWeeklyAnalysis } from '../../../services/groq';
import { supabase } from '../../../services/supabase';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PlanItem {
  meal: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export default function PlannerScreen() {
  const [activeDay, setActiveDay] = useState('Mon');
  const [loading, setLoading]     = useState(false);
  const [plans, setPlans]         = useState<Record<string, PlanItem[]>>({});
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { profile }               = useAuthStore();
  const { streakDays, totals }    = useNutritionStore();
  const isPro                     = profile?.isPro ?? false;

  // Load saved plan from Supabase
  useEffect(() => {
    async function loadStoredPlan() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, meal_plan_items(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error && data.meal_plan_items?.length > 0) {
        const grouped: Record<string, PlanItem[]> = {};
        data.meal_plan_items.forEach((item: any) => {
          if (!grouped[item.day_of_week]) grouped[item.day_of_week] = [];
          grouped[item.day_of_week].push({
            meal:     item.meal,
            name:     item.name,
            calories: item.calories,
            protein:  item.protein,
            carbs:    item.carbs,
            fat:      item.fat,
          });
        });
        setPlans(grouped);
      }
    }
    loadStoredPlan();
  }, [profile?.id]);

  const handleGenerate = async () => {
    if (!profile) return;
    if (!isPro) {
      router.push('/modals/paywall');
      return;
    }

    setLoading(true);
    try {
      // generateMealPlan now returns structured JSON
      const parsedPlan = await generateMealPlan({
        targetCalories: profile.targetCalories,
        macros:         profile.macros,
        goal:           profile.goal,
        restrictions:   profile.restrictions,
        preferences:    profile.preferences,
      });

      setPlans(parsedPlan);

      // Save to Supabase
      const { data: planData } = await supabase.from('meal_plans').insert({
        user_id:    profile.id,
        title:      'Weekly AI Plan',
        week_start: new Date().toISOString().split('T')[0],
      }).select().single();

      if (planData) {
        const itemsToInsert: any[] = [];
        for (const day of DAYS) {
          const dayMeals = parsedPlan[day] || [];
          for (const m of dayMeals) {
            itemsToInsert.push({
              plan_id:     planData.id,
              day_of_week: day,
              meal:        m.meal,
              name:        m.name,
              calories:    m.calories,
              protein:     m.protein ?? 0,
              carbs:       m.carbs   ?? 0,
              fat:         m.fat     ?? 0,
            });
          }
        }
        if (itemsToInsert.length > 0) {
          await supabase.from('meal_plan_items').insert(itemsToInsert);
        }
      }

      Alert.alert('✅ Plan Ready', 'Your AI meal plan has been generated and saved!');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const meals    = plans[activeDay] ?? [];
  const totalCal = meals.reduce((a, m) => a + m.calories, 0);

  // Generate shopping list from all days
  const handleShoppingList = () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    const allItems = Object.values(plans).flat();
    if (allItems.length === 0) {
      Alert.alert('No Plan', 'Generate a meal plan first to create a shopping list.');
      return;
    }
    const list = allItems.map(i => `• ${i.name} (${i.calories} kcal)`).join('\n');
    Alert.alert('🛒 Shopping List', list);
  };

  const handleWeeklyAnalysis = async () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    setAnalyzing(true);
    try {
      const stats = totals();
      const res = await generateWeeklyAnalysis({
        avgCalories:    stats.calories, // In a real app, calculate actual weekly avg
        targetCalories: profile?.targetCalories ?? 2000,
        avgProtein:     stats.protein,
        avgCarbs:       stats.carbs,
        avgFat:         stats.fat,
        goal:           profile?.goal ?? 'maintain',
        daysLogged:     streakDays,
      });
      setAnalysis(res);
    } catch (err) {
      Alert.alert('Analysis Failed', 'Could not generate weekly review.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Meal Planner</Text>
            <Text style={s.subtitle}>Personalized AI Plans</Text>
          </View>
          <TouchableOpacity style={s.genBtn} activeOpacity={0.8} onPress={handleGenerate} disabled={loading}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.genGrad}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.genText}>✨ Generate</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <DayPicker active={activeDay} onSelect={setActiveDay} />

        {/* Weekly Analysis Section */}
        <View style={s.analysisWrap}>
          <View style={s.analysisHeader}>
            <Text style={s.analysisTitle}>AI Weekly Review</Text>
            <TouchableOpacity onPress={handleWeeklyAnalysis} disabled={analyzing}>
              <Text style={s.analysisBtnText}>{analysis ? 'Regenerate' : 'Analyze'}</Text>
            </TouchableOpacity>
          </View>
          {analyzing ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
          ) : analysis ? (
            <View style={s.analysisContent}>
              <Text style={s.analysisText}>{analysis}</Text>
            </View>
          ) : (
            <Text style={s.analysisPlaceholder}>Get a summary of your week and custom tips.</Text>
          )}
        </View>

        {meals.length > 0 && (
          <View style={s.summary}>
            <Text style={s.summaryText}>
              {totalCal} kcal planned · {Math.max((profile?.targetCalories ?? 2000) - totalCal, 0)} remaining
            </Text>
          </View>
        )}

        <View style={s.mealList}>
          {meals.length > 0 ? (
            meals.map((m, i) => (
              <MealCard key={i} name={m.name} meal={m.meal} cal={m.calories}
                protein={m.protein} carbs={m.carbs} fat={m.fat} />
            ))
          ) : (
            <View style={s.emptyDay}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={s.emptyTitle}>No meals planned</Text>
              <Text style={s.emptySub}>
                {loading ? 'Generating your plan...' : isPro
                  ? 'Tap "Generate" to create an AI meal plan'
                  : 'Upgrade to Pro to generate AI meal plans'}
              </Text>
              {!isPro && !loading && (
                <TouchableOpacity style={s.proBtn} activeOpacity={0.8} onPress={() => router.push('/modals/paywall')}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={s.proGrad}>
                    <Text style={s.proText}>🔓 Unlock Pro</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Shopping list teaser */}
        <TouchableOpacity onPress={handleShoppingList} activeOpacity={0.8}>
          <LinearGradient colors={['#F59E0B11', '#D9770611']} style={s.teaser}>
            <Text style={s.teaserEmoji}>🛒</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.teaserTitle}>Auto Shopping List</Text>
              <Text style={s.teaserSub}>Generate a grocery list from your weekly plan</Text>
            </View>
            {!isPro && <View style={s.proBadge}><Text style={s.proBadgeText}>PRO</Text></View>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DayPicker({ active, onSelect }: { active: string; onSelect: (d: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dp.scroll} contentContainerStyle={dp.row}>
      {DAYS.map((d) => (
        <TouchableOpacity
          key={d}
          style={[dp.day, active === d && dp.dayActive]}
          onPress={() => onSelect(d)}
        >
          <Text style={[dp.dayLabel, active === d && dp.dayLabelActive]}>{d}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function MealCard({ name, meal, cal, protein, carbs, fat }: {
  name: string; meal: string; cal: number;
  protein?: number; carbs?: number; fat?: number;
}) {
  return (
    <View style={mc.card}>
      <View style={[mc.mealDot, { backgroundColor: Colors.primary }]} />
      <View style={mc.info}>
        <Text style={mc.mealLabel}>{meal}</Text>
        <Text style={mc.name}>{name}</Text>
        {(protein !== undefined) && (
          <View style={mc.macroRow}>
            <Text style={[mc.macro, { color: Colors.protein }]}>P {protein}g</Text>
            <Text style={[mc.macro, { color: Colors.carbs }]}>C {carbs}g</Text>
            <Text style={[mc.macro, { color: Colors.fat }]}>F {fat}g</Text>
          </View>
        )}
      </View>
      <Text style={mc.cal}>{cal} kcal</Text>
    </View>
  );
}

const dp = StyleSheet.create({
  scroll:         { marginBottom: Spacing.base },
  row:            { gap: 8, paddingHorizontal: Spacing.base, paddingBottom: 4 },
  day:            { width: 54, height: 64, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface },
  dayActive:      { borderColor: Colors.primary, backgroundColor: '#7C5CFC22' },
  dayLabel:       { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  dayLabelActive: { color: Colors.primary },
});

const mc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  mealDot:   { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info:      { flex: 1 },
  mealLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  name:      { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  macroRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  macro:     { fontSize: 11, fontWeight: '600' },
  cal:       { fontSize: 14, color: Colors.accent, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg, marginBottom: Spacing.md },
  title:       { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle:    { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  genBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  genGrad:     { paddingHorizontal: 14, paddingVertical: 10 },
  genText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  summary:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  summaryText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  mealList:    { paddingHorizontal: Spacing.base },
  emptyDay:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub:    { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  proBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  proGrad:     { paddingHorizontal: 24, paddingVertical: 12 },
  proText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  teaser:      { margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F59E0B33' },
  teaserEmoji: { fontSize: 28 },
  teaserTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  teaserSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  proBadge:    { backgroundColor: '#F59E0B22', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#F59E0B66' },
  proBadgeText:{ color: Colors.pro, fontWeight: '800', fontSize: 11 },
  analysisWrap: { margin: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analysisTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  analysisBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  analysisContent: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 12, marginTop: 4 },
  analysisText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  analysisPlaceholder: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
});
