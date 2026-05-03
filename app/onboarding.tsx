import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius } from '../constants';
import { useAuthStore, useSettingsStore } from '../store';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { calculateTDEE, calculateMacros } from '../services/foodDatabase';
import { supabase } from '../services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Step types ────────────────────────────────────────────────────────────────
const STEPS = ['goal', 'stats', 'activity', 'diet'] as const;
type Step = typeof STEPS[number];

interface OnboardingData {
  goal:         'lose' | 'maintain' | 'gain';
  sex:          'male' | 'female';
  age:          number;
  weight:       number;
  height:       number;
  activityLevel:'sedentary'|'light'|'moderate'|'active'|'very_active';
  restrictions: string[];
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────
function GoalStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const GOALS = [
    { id: 'lose',     icon: '🔥', title: t('onboarding.loseTitle'),   sub: t('onboarding.loseSub') },
    { id: 'maintain', icon: '⚖️', title: t('onboarding.stayTitle'),  sub: t('onboarding.staySub') },
    { id: 'gain',     icon: '💪', title: t('onboarding.gainTitle'),   sub: t('onboarding.gainSub') },
  ] as const;

  return (
    <View style={step.container}>
      <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.goalTitle')}</Text>
      <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.goalSub')}</Text>
      <View style={step.optionList}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }, data.goal === g.id && { borderColor: colors.primary, backgroundColor: '#7C5CFC15' }]}
            onPress={() => onChange({ goal: g.id })}
            activeOpacity={0.8}
          >
            <Text style={step.optionIcon}>{g.icon}</Text>
            <View>
              <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{g.title}</Text>
              <Text style={[step.optionSub, { color: colors.textSecondary }]}>{g.sub}</Text>
            </View>
            {data.goal === g.id && <View style={[step.optionCheck, { backgroundColor: colors.primary }]}><Text style={step.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 2: Stats ────────────────────────────────────────────────────────────
function StatsStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={step.container}>
      <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.statsTitle')}</Text>
      <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.statsSub')}</Text>

      <View style={step.statsGrid}>
        {/* Sex */}
        <View style={step.field}>
          <Text style={[step.fieldLabel, { color: colors.textSecondary }]}>{t('onboarding.sexLabel')}</Text>
          <View style={step.sexRow}>
            {(['male', 'female'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[step.sexBtn, { backgroundColor: colors.surface, borderColor: colors.border }, data.sex === s && { borderColor: colors.primary, backgroundColor: '#7C5CFC15' }]}
                onPress={() => onChange({ sex: s })}
              >
                <Text style={step.sexIcon}>{s === 'male' ? '♂️' : '♀️'}</Text>
                <Text style={[step.sexLabel, { color: colors.textSecondary }, data.sex === s && { color: colors.primary }]}>
                  {t(`profile.${s}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Numeric fields */}
        {[
          { label: t('profile.age'), key: 'age', unit: t('profile.ageYears'), min: 15, max: 80 },
          { label: t('profile.weight'), key: 'weight', unit: t('profile.kg'), min: 30, max: 250 },
          { label: t('profile.height'), key: 'height', unit: t('profile.cm'), min: 100, max: 250 },
        ].map(({ label, key, unit, min, max }) => (
          <View key={key} style={step.field}>
            <Text style={[step.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={step.numRow}>
              <TouchableOpacity
                style={[step.numBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur > min) onChange({ [key]: cur - 1 });
                }}
              >
                <Text style={[step.numBtnText, { color: colors.primary }]}>−</Text>
              </TouchableOpacity>
              <View style={[step.numDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[step.numValue, { color: colors.textPrimary }]}>{(data as any)[key] ?? '-'}</Text>
                <Text style={[step.numUnit, { color: colors.textMuted }]}>{unit}</Text>
              </View>
              <TouchableOpacity
                style={[step.numBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur < max) onChange({ [key]: cur + 1 });
                }}
              >
                <Text style={[step.numBtnText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Step 3: Activity ─────────────────────────────────────────────────────────
function ActivityStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const ACTIVITY_LEVELS = [
    { id: 'sedentary',   label: t('profile.sedentary'),    sub: t('onboarding.activitySedentary'),     icon: '🛋️' },
    { id: 'light',       label: t('profile.lightlyActive'), sub: t('onboarding.activityLight'),            icon: '🚶' },
    { id: 'moderate',    label: t('profile.moderatelyActive'), sub: t('onboarding.activityModerate'),         icon: '🏃' },
    { id: 'active',      label: t('profile.veryActive'),    sub: t('onboarding.activityActive'),              icon: '🏋️' },
    { id: 'very_active', label: t('profile.very_active') || 'Athlete',  sub: t('onboarding.activityVeryActive'),icon: '⚡' },
  ] as const;

  return (
    <View style={step.container}>
      <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle')}</Text>
      <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub')}</Text>
      <View style={step.optionList}>
        {ACTIVITY_LEVELS.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }, data.activityLevel === a.id && { borderColor: colors.primary, backgroundColor: '#7C5CFC15' }]}
            onPress={() => onChange({ activityLevel: a.id })}
            activeOpacity={0.8}
          >
            <Text style={step.optionIcon}>{a.icon}</Text>
            <View>
              <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{a.label}</Text>
              <Text style={[step.optionSub, { color: colors.textSecondary }]}>{a.sub}</Text>
            </View>
            {data.activityLevel === a.id && <View style={[step.optionCheck, { backgroundColor: colors.primary }]}><Text style={step.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 4: Diet ─────────────────────────────────────────────────────────────
const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Halal', 'Kosher', 'Keto'];

function DietStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const toggle = (opt: string) => {
    const cur = data.restrictions ?? [];
    onChange({ restrictions: cur.includes(opt) ? cur.filter((r) => r !== opt) : [...cur, opt] });
  };

  return (
    <View style={step.container}>
      <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.dietTitle')}</Text>
      <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.dietSub')}</Text>
      <View style={step.dietGrid}>
        {DIET_OPTIONS.map((opt) => {
          const active = data.restrictions?.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[step.dietPill, { backgroundColor: colors.surface, borderColor: colors.border }, active && { borderColor: colors.primary, backgroundColor: '#7C5CFC22' }]}
              onPress={() => toggle(opt)}
              activeOpacity={0.75}
            >
              <Text style={[step.dietPillText, { color: colors.textSecondary }, active && { color: colors.primary, fontWeight: '700' }]}>
                {t(`onboarding.diet${opt.replace('-', '')}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Shared step styles ────────────────────────────────────────────────────────
const step = StyleSheet.create({
  container:        { flex: 1 },
  title:            { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  sub:              { fontSize: 15, marginBottom: 28 },
  optionList:       { gap: 10 },
  optionCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.base, borderRadius: Radius.lg, borderWidth: 1.5 },
  optionCardActive: { backgroundColor: '#7C5CFC15' },
  optionIcon:       { fontSize: 28, width: 38 },
  optionTitle:      { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optionSub:        { fontSize: 12 },
  optionCheck:      { marginLeft: 'auto', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkText:        { color: '#fff', fontWeight: '800', fontSize: 13 },
  statsGrid:        { gap: 20 },
  field:            {},
  fieldLabel:       { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  sexRow:           { flexDirection: 'row', gap: 10 },
  sexBtn:           { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 4 },
  sexBtnActive:     { backgroundColor: '#7C5CFC15' },
  sexIcon:          { fontSize: 24 },
  sexLabel:         { fontSize: 14, fontWeight: '600' },
  sexLabelActive:   { },
  numRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numBtn:           { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  numBtnText:       { fontSize: 22, fontWeight: '600', lineHeight: 28 },
  numDisplay:       { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  numValue:         { fontSize: 22, fontWeight: '800' },
  numUnit:          { fontSize: 13, marginTop: 4 },
  dietGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dietPill:         { borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10 },
  dietPillActive:   { backgroundColor: '#7C5CFC22' },
  dietPillText:     { fontSize: 14, fontWeight: '500' },
  dietPillTextActive:{ fontWeight: '700' },
});

// ─── Main Onboarding Screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { theme } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData]               = useState<Partial<OnboardingData>>({ restrictions: [], age: 25, weight: 70, height: 170 });
  const [saving, setSaving]           = useState(false);
  const { setProfile, profile }       = useAuthStore();

  const stepId = STEPS[currentStep];

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = () => {
    if (stepId === 'goal')     return !!data.goal;
    if (stepId === 'stats')    return !!data.sex && !!data.age && !!data.weight && !!data.height;
    if (stepId === 'activity') return !!data.activityLevel;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const d = data as OnboardingData;
      const { tdee } = calculateTDEE({
        weight: d.weight, height: d.height,
        age: d.age, sex: d.sex, activityLevel: d.activityLevel,
      });
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, d.goal);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        Alert.alert(t('common.error'), t('profile.userIdNotFound'));
        router.replace('/(auth)/welcome');
        return;
      }

      const profileData = {
        id:             authData.user.id,
        name:           authData.user.user_metadata?.full_name ?? '',
        email:          authData.user.email ?? '',
        sex:            d.sex,
        age:            d.age,
        weight:         d.weight,
        height:         d.height,
        activityLevel:  d.activityLevel,
        goal:           d.goal,
        tdee,
        targetCalories,
        macros:         { protein, carbs, fat },
        restrictions:   d.restrictions,
        isPro:          false,
        role:           'user' as const,
        onboardingDone: true,
      };

      const { error: upsertError } = await supabase.from('users').upsert({
        id:               profileData.id,
        email:            profileData.email,
        name:             profileData.name,
        sex:              profileData.sex,
        age:              profileData.age,
        weight:           profileData.weight,
        height:           profileData.height,
        activity_level:   profileData.activityLevel,
        goal:             profileData.goal,
        tdee:             profileData.tdee,
        target_calories:  profileData.targetCalories,
        macros:           profileData.macros,
        restrictions:     profileData.restrictions,
        is_pro:           profileData.isPro,
        onboarding_done:  profileData.onboardingDone,
        updated_at:       new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      setProfile(profileData);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      console.error('[Onboarding] Error:', err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const stepComponents: Record<Step, React.ReactNode> = {
    goal:     <GoalStep     data={data} onChange={updateData} />,
    stats:    <StatsStep    data={data} onChange={updateData} />,
    activity: <ActivityStep data={data} onChange={updateData} />,
    diet:     <DietStep     data={data} onChange={updateData} />,
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={s.progressWrap}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[s.progressSegment, { backgroundColor: colors.border }, i <= currentStep && { backgroundColor: colors.primary }]}
          />
        ))}
      </View>
      
      {/* Exit Button */}
      <TouchableOpacity 
        style={s.exitBtn} 
        onPress={async () => {
          await supabase.auth.signOut();
          setProfile(null);
          router.replace('/(auth)/welcome');
        }}
      >
        <Text style={[s.exitText, { color: colors.textMuted }]}>{t('profile.signOut')}</Text>
      </TouchableOpacity>

      {/* Step content */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {stepComponents[stepId]}
      </ScrollView>

      {/* Navigation */}
      <View style={[s.footer, { borderTopColor: colors.border }]}>
        {currentStep > 0 && (
          <TouchableOpacity style={[s.backBtn, { borderColor: colors.border }]} onPress={() => setCurrentStep((s) => s - 1)}>
            <Text style={[s.backText, { color: colors.textSecondary }]}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.nextGrad}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.nextText}>
                {currentStep === STEPS.length - 1 ? t('onboarding.letsGo') : t('onboarding.continue')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                 { flex: 1 },
  progressWrap:         { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.base, marginTop: 12 },
  progressSegment:      { flex: 1, height: 4, borderRadius: 2 },
  scroll:               { flex: 1 },
  content:              { padding: Spacing.base, paddingTop: Spacing.xl },
  footer:               { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, paddingBottom: 36 },
  backBtn:              { paddingHorizontal: Spacing.base, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5 },
  backText:             { fontWeight: '600', fontSize: 15 },
  nextBtn:              { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  nextBtnDisabled:      { opacity: 0.5 },
  nextGrad:             { padding: 16, alignItems: 'center' },
  nextText:             { color: '#fff', fontWeight: '700', fontSize: 16 },
  exitBtn:              { position: 'absolute', top: 16, right: 16, padding: 8, zIndex: 10 },
  exitText:             { fontSize: 13, fontWeight: '500' },
});
