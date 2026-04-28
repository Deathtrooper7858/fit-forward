import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { FoodItem } from '../../services/foodDatabase';
import { useNutritionStore } from '../../store';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Meal = typeof MEALS[number];

export default function FoodDetailModal() {
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
    <View style={s.container}>
      {/* Handle */}
      <View style={s.handle} />

      <ScrollView>
        {/* Product header */}
        <View style={s.header}>
          <Text style={s.name}>{food.name}</Text>
          {food.brand && <Text style={s.brand}>{food.brand}</Text>}
          <View style={s.sourcePill}>
            <Text style={s.sourceText}>{food.source}</Text>
          </View>
        </View>

        {/* Macro summary */}
        <View style={s.macroCard}>
          <Text style={s.macroTitle}>Per {grams || '?'}g</Text>
          <View style={s.macroRow}>
            {[
              { label: 'Calories', val: cal, color: Colors.accent },
              { label: 'Protein',  val: `${pro}g`,  color: Colors.protein },
              { label: 'Carbs',    val: `${carb}g`, color: Colors.carbs },
              { label: 'Fat',      val: `${fat}g`,  color: Colors.fat },
            ].map(({ label, val, color }) => (
              <View key={label} style={s.macroItem}>
                <Text style={[s.macroVal, { color }]}>{val}</Text>
                <Text style={s.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Grams input */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Amount (grams)</Text>
          <TextInput
            style={s.gramsInput}
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>

        {/* Meal selector */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Add to meal</Text>
          <View style={s.mealRow}>
            {MEALS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.mealPill, meal === m && s.mealPillActive]}
                onPress={() => setMeal(m)}
                activeOpacity={0.75}
              >
                <Text style={[s.mealPillText, meal === m && s.mealPillTextActive]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.cancelText}>Cancel</Text>
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
  container:        { flex: 1, backgroundColor: Colors.background },
  handle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  header:           { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  name:             { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  brand:            { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  sourcePill:       { alignSelf: 'flex-start', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  sourceText:       { fontSize: 11, color: Colors.textMuted, textTransform: 'capitalize' },
  macroCard:        { margin: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  macroTitle:       { fontSize: 13, color: Colors.textMuted, marginBottom: 14, fontWeight: '500' },
  macroRow:         { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem:        { alignItems: 'center', gap: 4 },
  macroVal:         { fontSize: 22, fontWeight: '800' },
  macroLabel:       { fontSize: 12, color: Colors.textSecondary },
  section:          { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  sectionLabel:     { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  gramsInput:       { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary, padding: Spacing.base, fontSize: 20, color: Colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  mealRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealPill:         { borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surface },
  mealPillActive:   { borderColor: Colors.primary, backgroundColor: '#7C5CFC22' },
  mealPillText:     { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  mealPillTextActive:{ color: Colors.primary, fontWeight: '700' },
  footer:           { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 36 },
  cancelBtn:        { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  cancelText:       { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  addBtn:           { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  addGrad:          { padding: 14, alignItems: 'center' },
  addText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
});
