import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { FoodItem } from '../../services/foodDatabase';
import { useNutritionStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Meal = typeof MEALS[number];

export default function FoodDetailModal() {
  const colors = useTheme();
  const { foodJson }          = useLocalSearchParams<{ foodJson: string }>();
  const food: FoodItem        = JSON.parse(foodJson ?? '{}');
  const [grams, setGrams]     = useState('100');
  const [meal, setMeal]       = useState<Meal>('lunch');
  const { addLog }            = useNutritionStore();

  const g      = parseFloat(grams) || 0;
  const factor = g / 100;
  const cal    = Math.round(food.calories * factor);
  const pro    = Math.round(food.protein  * factor);
  const carb   = Math.round(food.carbs    * factor);
  const fat    = Math.round(food.fat      * factor);

  const handleAdd = () => {
    if (!g || g <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid number of grams.');
      return;
    }
    addLog({
      id:       `${Date.now()}-${food.id}`,
      foodItem: food,
      grams:    g,
      meal,
      loggedAt: new Date().toISOString(),
      calories: cal,
      protein:  pro,
      carbs:    carb,
      fat,
    });
    router.back();
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Handle */}
      <View style={[s.handle, { backgroundColor: colors.border }]} />

      <ScrollView>
        {/* Product header */}
        <View style={s.header}>
          <Text style={[s.name, { color: colors.textPrimary }]}>{food.name}</Text>
          {food.brand && <Text style={[s.brand, { color: colors.textSecondary }]}>{food.brand}</Text>}
          <View style={[s.sourcePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.sourceText, { color: colors.textMuted }]}>{food.source}</Text>
          </View>
        </View>

        {/* Macro summary */}
        <View style={[s.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.macroTitle, { color: colors.textMuted }]}>Per {grams || '?'}g</Text>
          <View style={s.macroRow}>
            {[
              { label: 'Calories', val: cal, color: colors.accent },
              { label: 'Protein',  val: `${pro}g`,  color: colors.protein },
              { label: 'Carbs',    val: `${carb}g`, color: colors.carbs },
              { label: 'Fat',      val: `${fat}g`,  color: colors.fat },
            ].map(({ label, val, color }) => (
              <View key={label} style={s.macroItem}>
                <Text style={[s.macroVal, { color }]}>{val}</Text>
                <Text style={[s.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Grams input */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Amount (grams)</Text>
          <TextInput
            style={[s.gramsInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.textPrimary }]}
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>

        {/* Meal selector */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Add to meal</Text>
          <View style={s.mealRow}>
            {MEALS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.mealPill, { backgroundColor: colors.surface, borderColor: colors.border }, meal === m && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }]}
                onPress={() => setMeal(m)}
                activeOpacity={0.75}
              >
                <Text style={[s.mealPillText, { color: colors.textSecondary }, meal === m && { color: colors.primary, fontWeight: '700' }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[s.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.addGrad}>
            <Text style={s.addText}>Add to {meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  handle:           { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  header:           { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  name:             { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  brand:            { fontSize: 14, marginBottom: 8 },
  sourcePill:       { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  sourceText:       { fontSize: 11, textTransform: 'capitalize' },
  macroCard:        { margin: Spacing.base, borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1 },
  macroTitle:       { fontSize: 13, marginBottom: 14, fontWeight: '500' },
  macroRow:         { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem:        { alignItems: 'center', gap: 4 },
  macroVal:         { fontSize: 22, fontWeight: '800' },
  macroLabel:       { fontSize: 12 },
  section:          { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  sectionLabel:     { fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  gramsInput:       { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  mealRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealPill:         { borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8 },
  mealPillText:     { fontSize: 13, fontWeight: '500' },
  footer:           { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, paddingBottom: 36 },
  cancelBtn:        { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:       { fontWeight: '600', fontSize: 15 },
  addBtn:           { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  addGrad:          { padding: 14, alignItems: 'center' },
  addText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
});
