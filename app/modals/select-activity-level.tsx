import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore, useAuthStore, UserProfile } from '../../store';
import { supabase } from '../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../services/foodDatabase';
import { Radius } from '../../constants';
import { useTranslation } from 'react-i18next';

const ACTIVITY_OPTIONS = [
  { label: 'exercise.none', icon: '🚫' },
  { label: 'exercise.1-2',  icon: '🔥' },
  { label: 'exercise.3-4',  icon: '🔥' },
  { label: 'exercise.5-6',  icon: '🔥' },
  { label: 'exercise.daily', icon: '🔥' },
];

const EXERCISE_TO_ACTIVITY: Record<string, UserProfile['activityLevel']> = {
  'none':  'sedentary',
  '1-2':   'light',
  '3-4':   'moderate',
  '5-6':   'active',
  'daily': 'very_active',
};

const ACTIVITY_TO_EXERCISE: Record<string, string> = {
  'sedentary':   'none',
  'light':       '1-2',
  'moderate':    '3-4',
  'active':      '5-6',
  'very_active': 'daily',
};

export default function SelectActivityLevelModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyExercise, setExerciseLevel, selectedDate } = useNutritionStore();
  const { profile, setProfile } = useAuthStore();

  const exerciseLevel = dailyExercise[selectedDate]
    || ACTIVITY_TO_EXERCISE[profile?.activityLevel || '']
    || '3-4';

  const handleSelect = async (optKey: string) => {
    // 1. Save daily override
    setExerciseLevel(optKey);

    // 2. Sync to profile activityLevel
    const newActivityLevel = EXERCISE_TO_ACTIVITY[optKey] || 'moderate';
    if (!profile) { router.back(); return; }
    const newProfile: UserProfile = { ...profile, activityLevel: newActivityLevel };
    const { tdee } = calculateTDEE({
      weight: newProfile.weight, height: newProfile.height,
      age: newProfile.age, sex: newProfile.sex,
      activityLevel: newActivityLevel,
    });
    const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
    newProfile.tdee = tdee;
    newProfile.targetCalories = targetCalories;
    newProfile.macros = { protein, carbs, fat };
    setProfile(newProfile);
    await supabase.from('users').update({
      activity_level: newActivityLevel,
      tdee, target_calories: targetCalories, macros: { protein, carbs, fat },
    }).eq('id', profile.id);

    router.back();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: colors.textPrimary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('exercise.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {t('onboarding.activitySub', 'Selecciona el nivel que mejor describe tu rutina semanal')}
        </Text>

        {ACTIVITY_OPTIONS.map(opt => {
          const optKey = opt.label.replace('exercise.', '');
          const isSelected = exerciseLevel === optKey;
          return (
            <TouchableOpacity
              key={opt.label}
              activeOpacity={0.75}
              style={[
                s.option,
                {
                  backgroundColor: isSelected ? 'rgba(124,92,252,0.12)' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelect(optKey)}
            >
              <View style={[s.iconWrap, { backgroundColor: isSelected ? colors.primary : colors.surfaceAlt }]}>
                <Text style={s.optIcon}>{opt.icon}</Text>
              </View>
              <Text style={[s.optLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                {t(opt.label)}
              </Text>
              {isSelected && (
                <View style={[s.checkmark, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn:  { width: 40, height: 40, justifyContent: 'center' },
  title:    { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  content:  { padding: 16, gap: 12 },
  option:   {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: Radius.xl, borderWidth: 1.5, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  optIcon:  { fontSize: 20 },
  optLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  checkmark:{ width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
