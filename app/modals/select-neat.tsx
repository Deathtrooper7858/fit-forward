import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore, useAuthStore, UserProfile } from '../../store';
import { supabase } from '../../services/supabase';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateTDEE, calculateMacros } from '../../services/foodDatabase';

const NEAT_OPTIONS = [
  { key: 'seated',              icon: '🪑' },
  { key: 'standing_sometimes',  icon: '🧍' },
  { key: 'standing_mostly',     icon: '🚶' },
  { key: 'moving',              icon: '🏃' },
  { key: 'physical_work',       icon: '🏗️' },
];

const NEAT_TO_ACTIVITY: Record<string, UserProfile['activityLevel']> = {
  'seated':             'sedentary',
  'standing_sometimes': 'light',
  'standing_mostly':    'moderate',
  'moving':             'active',
  'physical_work':      'very_active',
};

const ACTIVITY_TO_NEAT: Record<string, string> = {
  'sedentary':   'seated',
  'light':       'standing_sometimes',
  'moderate':    'standing_mostly',
  'active':      'moving',
  'very_active': 'physical_work',
};

export default function SelectNeatModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyNeat, setNeat, selectedDate } = useNutritionStore();
  const { profile, setProfile } = useAuthStore();
  
  const neatLevel = dailyNeat[selectedDate] 
    || ACTIVITY_TO_NEAT[profile?.activityLevel || ''] 
    || 'standing_sometimes';

  const handleSelect = async (key: string) => {
    // 1. Save daily override
    setNeat(key);

    // 2. Sync to profile activityLevel (Global change)
    const newActivityLevel = NEAT_TO_ACTIVITY[key] || 'light';
    if (!profile) { router.back(); return; }
    
    const newProfile: UserProfile = { ...profile, activityLevel: newActivityLevel };
    
    // Recalculate TDEE and Macros to keep consistency
    const { tdee } = calculateTDEE({
      weight: newProfile.weight,
      height: newProfile.height,
      age: newProfile.age,
      sex: newProfile.sex,
      activityLevel: newActivityLevel,
    });
    const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
    
    newProfile.tdee = tdee;
    newProfile.targetCalories = targetCalories;
    newProfile.macros = { protein, carbs, fat };

    setProfile(newProfile);
    
    await supabase
      .from('users')
      .update({ 
        activity_level: newActivityLevel,
        tdee,
        target_calories: targetCalories,
        macros: { protein, carbs, fat }
      })
      .eq('id', profile.id);

    router.back();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: colors.textPrimary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('neat.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {t('onboarding.activitySub', 'Selecciona el nivel que mejor describe tu día a día')}
        </Text>

        {NEAT_OPTIONS.map(opt => {
          const isSelected = neatLevel === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.75}
              style={[
                s.option,
                {
                  backgroundColor: isSelected ? 'rgba(124,92,252,0.12)' : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelect(opt.key)}
            >
              <View style={[s.iconWrap, { backgroundColor: isSelected ? colors.primary : colors.surfaceAlt }]}>
                <Text style={s.optIcon}>{opt.icon}</Text>
              </View>
              <View style={s.optText}>
                <Text style={[s.optLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                  {t(`neat.${opt.key}`)}
                </Text>
                <Text style={[s.optSub, { color: colors.textSecondary }]}>
                  {t(`neat.${opt.key}Sub`)}
                </Text>
              </View>
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
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn:   { width: 40, height: 40, justifyContent: 'center' },
  title:     { fontSize: 18, fontWeight: '700' },
  subtitle:  { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  content:   { padding: 16, gap: 12 },
  option:    {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: Radius.xl, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  iconWrap:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optIcon:   { fontSize: 22 },
  optText:   { flex: 1 },
  optLabel:  { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optSub:    { fontSize: 13, lineHeight: 18 },
  checkmark: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
