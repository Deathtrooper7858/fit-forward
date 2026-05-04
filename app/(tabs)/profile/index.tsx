import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../constants';
import { 
  useAuthStore, useBodyStore, useSettingsStore, 
  useNutritionStore, useCoachStore, useRecipesStore, useProgressStore 
} from '../../../store';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../../services/foodDatabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import LanguageModal from '../../../components/LanguageModal';
import { Target, Flame, Dumbbell, Heart, Zap, Monitor, Footprints, Activity, Scale, ChevronLeft, ChevronRight } from 'lucide-react-native';

// ─── Inline edit modal (cross-platform, replaces Alert.prompt) ────────────────
function EditModal({
  visible, title, placeholder, keyboardType, initialValue, onSave, onClose,
}: {
  visible: boolean; title: string; placeholder: string;
  keyboardType?: 'numeric' | 'default';
  initialValue?: string; onSave: (val: string) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [value, setValue] = useState(initialValue ?? '');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={em.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[em.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[em.title, { color: colors.textPrimary }]}>{title}</Text>
          <TextInput
            style={[em.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={keyboardType ?? 'default'}
            autoFocus
          />
          <View style={em.row}>
            <TouchableOpacity style={[em.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[em.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={() => { onSave(value); onClose(); }}>
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={em.saveGrad}>
                <Text style={em.saveText}>{t('common.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  box:       { borderRadius: Radius.xl, padding: 24, borderWidth: 1, overflow: 'hidden' },
  title:     { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  input:     { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  row:       { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  cancelText:{ fontWeight: '600' },
  saveBtn:   { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  saveGrad:  { paddingVertical: 12, alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '700' },
});


// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, onPress }: {
  label: string; value: string | number; unit: string; color: string; onPress?: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <TouchableOpacity style={[stat.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={[stat.value, { color }]}>{value}</Text>
      <Text style={[stat.unit, { color: colors.textMuted }]}>{unit}</Text>
      <Text style={[stat.label, { color: colors.textSecondary }]}>{label}</Text>
      {onPress && <Text style={[stat.editHint, { color: colors.textMuted }]}>{t('common.tapToEdit')}</Text>}
    </TouchableOpacity>
  );
}

const stat = StyleSheet.create({
  card:     { flex: 1, borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 1 },
  value:    { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  unit:     { fontSize: 11, marginBottom: 4 },
  label:    { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  editHint: { fontSize: 8, marginTop: 4, textTransform: 'uppercase' },
});

function MenuRow({ icon, label, value, onPress, isDestructive, rightIcon, indent }: {
  icon: string; label: string; value?: string; onPress?: () => void; isDestructive?: boolean; rightIcon?: string; indent?: boolean;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[mr.row, { borderBottomColor: colors.border, paddingLeft: indent ? Spacing.xl : Spacing.base }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={mr.icon}>{icon}</Text>
      <Text style={[mr.label, { color: isDestructive ? colors.error : colors.textPrimary }]}>{label}</Text>
      {value && <Text style={[mr.value, { color: colors.textSecondary }]}>{value}</Text>}
      <Text style={[mr.arrow, { color: rightIcon === '🔒' ? colors.accent : colors.textMuted, fontSize: rightIcon ? 14 : 20 }]}>{rightIcon || '›'}</Text>
    </TouchableOpacity>
  );
}

// ─── Goal Wizard Modal ────────────────────────────────────────────────────────
function GoalWizardModal({ visible, onClose, onSave, initialData }: {
  visible: boolean; onClose: () => void; onSave: (data: any) => void; initialData: any;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setData(initialData);
    }
  }, [visible, initialData]);

  const STEPS_COUNT = 3;

  const GOALS = [
    { id: 'lose',     icon: <Flame size={24} color={colors.primary} />, title: t('onboarding.loseTitle', 'Perder Grasa'),   sub: t('onboarding.loseSub', 'Optimiza la pérdida de peso y conserva tu masa muscular') },
    { id: 'gain',     icon: <Dumbbell size={24} color={colors.primary} />, title: t('onboarding.gainTitle', 'Ganar Músculo'),   sub: t('onboarding.gainSub', 'Incrementa tu peso y hazte más fuerte') },
    { id: 'maintain', icon: <Heart size={24} color={colors.primary} />, title: t('onboarding.stayTitle', 'Mantener Peso'),  sub: t('onboarding.staySub', 'Mantén tu peso estable y busca la recomposición corporal') },
  ];

  const ACTIVITIES = [
    { id: 'sedentary',   label: t('exercise.none', 'No Hago Ejercicio'),    sub: t('onboarding.activitySedentary', 'Poco o nada de ejercicio'),     icon: <Monitor size={22} color={colors.primary} /> },
    { id: 'light',       label: t('exercise.1-2', '1-2 Días por Semana'), sub: t('onboarding.activityLight', 'Ejercicio ligero o caminatas'),            icon: <Footprints size={22} color={colors.primary} /> },
    { id: 'moderate',    label: t('exercise.3-4', '3-4 Días por Semana'), sub: t('onboarding.activityModerate', 'Ejercicio regular'),         icon: <Activity size={22} color={colors.primary} /> },
    { id: 'active',      label: t('exercise.5-6', '5-6 Días por Semana'),    sub: t('onboarding.activityActive', 'Ejercicio intenso'),              icon: <Dumbbell size={22} color={colors.primary} /> },
    { id: 'very_active', label: t('exercise.daily', 'Diario'),    sub: t('onboarding.activityVeryActive', 'Entrenamiento diario'),              icon: <Zap size={22} color={colors.primary} /> },
  ];

  const handleNext = () => {
    if (step < STEPS_COUNT - 1) setStep(step + 1);
    else onSave(data);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={wm.header}>
          <TouchableOpacity onPress={handleBack} style={wm.backBtn}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={wm.progressBg}>
            <View style={[wm.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / STEPS_COUNT) * 100}%` }]} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={wm.scroll}>
          {step === 0 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.goalTitle', '¿Cuál es tu objetivo?')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('onboarding.goalSub', 'Calcularemos tus calorías necesarias para lograrlo')}</Text>
              <View style={wm.list}>
                {GOALS.map(g => (
                  <TouchableOpacity key={g.id} style={[wm.card, { backgroundColor: colors.surface, borderColor: data.goal === g.id ? colors.primary : colors.border }]} onPress={() => setData({...data, goal: g.id})}>
                    <View style={wm.iconContainer}>{g.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[wm.cardTitle, { color: colors.textPrimary }]}>{g.title}</Text>
                      <Text style={[wm.cardSub, { color: colors.textSecondary }]}>{g.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle', 'Estilo de Vida')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub', '¿Qué tan activo eres en tu día a día?')}</Text>
              <View style={wm.list}>
                {ACTIVITIES.map(a => (
                  <TouchableOpacity key={a.id} style={[wm.card, { backgroundColor: colors.surface, borderColor: data.activityLevel === a.id ? colors.primary : colors.border }]} onPress={() => setData({...data, activityLevel: a.id})}>
                    <View style={wm.iconContainer}>{a.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[wm.cardTitle, { color: colors.textPrimary }]}>{a.label}</Text>
                      <Text style={[wm.cardSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.targetWeight', 'Peso objetivo')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('profile.enterWeight', 'Ingresa el peso en kg')}</Text>
              <View style={wm.weightControl}>
                <TouchableOpacity onPress={() => setData({...data, targetWeight: data.targetWeight - 1})} style={[wm.weightBtn, { borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32, color: colors.primary }}>-</Text>
                </TouchableOpacity>
                <View style={wm.weightValue}>
                  <Text style={[wm.weightText, { color: colors.textPrimary }]}>{data.targetWeight}</Text>
                  <Text style={[wm.weightUnit, { color: colors.textMuted }]}>kg</Text>
                </View>
                <TouchableOpacity onPress={() => setData({...data, targetWeight: data.targetWeight + 1})} style={[wm.weightBtn, { borderColor: colors.border }]}>
                  <Text style={{ fontSize: 32, color: colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={wm.footer}>
          <TouchableOpacity style={wm.nextBtn} onPress={handleNext}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={wm.nextGrad}>
              <Text style={wm.nextText}>{step === STEPS_COUNT - 1 ? t('common.save', 'Guardar') : t('common.continue', 'Continuar')}</Text>
              <ChevronRight size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const wm = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  progressBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scroll: { padding: Spacing.xl },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  sub: { fontSize: 15, opacity: 0.7, marginBottom: 32 },
  list: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.xl, borderWidth: 2, gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(124, 92, 252, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardSub: { fontSize: 13, opacity: 0.6, lineHeight: 18 },
  weightControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 },
  weightBtn: { width: 64, height: 64, borderRadius: Radius.xl, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  weightValue: { alignItems: 'center' },
  weightText: { fontSize: 48, fontWeight: '900' },
  weightUnit: { fontSize: 18, fontWeight: '600', opacity: 0.5 },
  footer: { padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.xl },
  nextBtn: { borderRadius: Radius.xl, overflow: 'hidden' },
  nextGrad: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const mr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1 },
  icon:  { fontSize: 20, width: 28 },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
  value: { fontSize: 14 },
  arrow: { fontSize: 20 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { theme, setTheme, language, setLanguage } = useSettingsStore();
  const { profile, setProfile, clearAuth } = useAuthStore();
  const { latest: latestMeasurement }      = useBodyStore();
  const lastMeasure = latestMeasurement();

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    visible: boolean; field: string; title: string; placeholder: string;
    keyboardType?: 'numeric' | 'default'; initialValue?: string;
  }>({ visible: false, field: '', title: '', placeholder: '' });

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(false);

  const openEdit = (field: string, title: string, placeholder: string, keyboardType: 'numeric' | 'default' = 'default') => {
    setEditModal({
      visible: true, field, title, placeholder, keyboardType,
      initialValue: String((profile as any)?.[field] ?? ''),
    });
  };

  const updateProfileFields = async (updates: Partial<any>) => {
    if (!profile) return;

    // Use store ID or fallback to auth user ID to avoid "invalid uuid" errors
    let userId = profile.id;
    if (!userId || userId === '') {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? '';
    }

    if (!userId) {
      Alert.alert(t('common.error'), t('profile.userIdNotFound'));
      return;
    }

    const newProfile = { ...profile, ...updates, id: userId };

    const triggerFields = ['weight', 'height', 'age', 'sex', 'activityLevel', 'goal'];
    if (Object.keys(updates).some(k => triggerFields.includes(k))) {
      const { tdee } = calculateTDEE({
        weight:        newProfile.weight,
        height:        newProfile.height,
        age:           newProfile.age,
        sex:           newProfile.sex,
        activityLevel: newProfile.activityLevel,
      });
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
      newProfile.tdee           = tdee;
      newProfile.targetCalories = targetCalories;
      newProfile.macros         = { protein, carbs, fat };
    }

    try {
      const { error } = await supabase.from('users').update({
        name:             newProfile.name,
        avatar_url:       newProfile.avatarUrl,
        weight:           newProfile.weight,
        height:           newProfile.height,
        age:              newProfile.age,
        sex:              newProfile.sex,
        activity_level:   newProfile.activityLevel,
        goal:             newProfile.goal,
        target_weight:    newProfile.targetWeight,
        tdee:             newProfile.tdee,
        target_calories:  newProfile.targetCalories,
        macros:           newProfile.macros,
        restrictions:     newProfile.restrictions,
      }).eq('id', userId);

      if (error) throw error;
      setProfile(newProfile);
    } catch (err) {
      console.error('Update profile error:', err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    }
  };

  const updateProfileField = async (field: string, value: any) => {
    await updateProfileFields({ [field]: value });
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const asset = result.assets[0];
        const base64 = asset.base64!;
        const uri = asset.uri;
        const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        
        let userId = profile?.id;
        if (!userId || userId === '') {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id ?? '';
        }
        
        if (!userId) throw new Error(t('profile.notAuth'));

        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        await updateProfileField('avatarUrl', publicUrl);
      }
    } catch (err) {
      console.error('Pick image error:', err);
      Alert.alert(t('common.error'), t('profile.uploadFailed'));
    }
  };

  const handleSaveEdit = (val: string) => {
    if (!val.trim() && editModal.field !== 'restrictions') return;
    const field = editModal.field;
    
    if (field === 'restrictions') {
      const list = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      updateProfileField('restrictions', list);
      return;
    }

    const numericFields = ['weight', 'height', 'age'];
    let parsed: any = numericFields.includes(field) ? parseFloat(val) : val;
    if (numericFields.includes(field)) {
      if (isNaN(parsed)) return;
      if (field === 'age') parsed = Math.min(Math.max(parsed, 5), 120);
      if (field === 'weight') parsed = Math.min(Math.max(parsed, 20), 300);
      if (field === 'height') parsed = Math.min(Math.max(parsed, 50), 250);
    }
    updateProfileField(field, parsed);
  };

  const handleEditGoalFlow = () => {
    setWizardVisible(true);
  };

  const handleEditSex = () => {
    Alert.alert(t('profile.sex'), t('profile.bmrQuest'), [
      { text: t('profile.male'),   onPress: () => updateProfileField('sex', 'male') },
      { text: t('profile.female'), onPress: () => updateProfileField('sex', 'female') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleEditActivity = () => {
    Alert.alert(t('profile.activity'), t('profile.activityQuest'), [
      { text: t('profile.sedentary'),   onPress: () => updateProfileField('activityLevel', 'sedentary') },
      { text: t('profile.lightlyActive'), onPress: () => updateProfileField('activityLevel', 'light') },
      { text: t('profile.moderatelyActive'), onPress: () => updateProfileField('activityLevel', 'moderate') },
      { text: t('profile.veryActive'), onPress: () => updateProfileField('activityLevel', 'active') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleEditLanguage = () => {
    setLangModalVisible(true);
  };

  const handleNotImplemented = () => {
    Alert.alert(t('common.comingSoon'), t('common.notImplemented'));
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.signOut'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'), style: 'destructive',
        onPress: async () => {
          // Deep clear all stores on sign out
          useNutritionStore.getState().reset();
          useCoachStore.getState().resetAll();
          useBodyStore.getState().reset();
          useRecipesStore.getState().reset();
          useProgressStore.getState().reset();

          await supabase.auth.signOut();
          clearAuth();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const bmi = profile && profile.height > 0
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : '--';

  const goalLabel = profile?.goal === 'lose'
    ? '⬇️ ' + t('profile.loseWeight')
    : profile?.goal === 'gain'
    ? '⬆️ ' + t('profile.gainMuscle')
    : '⚖️ ' + t('profile.maintain');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        placeholder={editModal.placeholder}
        keyboardType={editModal.keyboardType}
        initialValue={editModal.initialValue}
        onSave={handleSaveEdit}
        onClose={() => setEditModal(p => ({ ...p, visible: false }))}
      />

      <LanguageModal
        visible={langModalVisible}
        currentLang={language}
        onSelect={setLanguage}
        onClose={() => setLangModalVisible(false)}
      />

      <GoalWizardModal
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        onSave={(data) => {
          updateProfileFields({
            goal: data.goal,
            activityLevel: data.activityLevel,
            targetWeight: data.targetWeight
          });
          setWizardVisible(false);
        }}
        initialData={{
          goal: profile?.goal ?? 'lose',
          activityLevel: profile?.activityLevel ?? 'moderate',
          targetWeight: profile?.targetWeight ?? profile?.weight ?? 70
        }}
      />

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={colors.gradientCard} style={s.header}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              )}
              <View style={[s.editBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 10 }}>📸</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))}>
            <Text style={[s.name, { color: colors.textPrimary }]}>{profile?.name ?? 'User'} ✎</Text>
          </TouchableOpacity>
          <Text style={[s.email, { color: colors.textSecondary }]}>{profile?.email ?? ''}</Text>
          {profile?.role === 'super_admin' ? (
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⚡ Super Admin</Text>
            </LinearGradient>
          ) : profile?.role === 'admin' ? (
            <LinearGradient colors={['#10B981', '#059669']} style={s.proBadge}>
              <Text style={s.proBadgeText}>🛡️ Administrator</Text>
            </LinearGradient>
          ) : profile?.isPro ? (
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⭐ Pro Member</Text>
            </LinearGradient>
          ) : (
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/modals/paywall')}>
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>{t('profile.upgradePro')} 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Configuración */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.settings', 'Configuración')}</Text>
          <MenuRow icon="🔥" label={t('profile.updateGoals', 'Actualizar objetivos')} onPress={handleEditGoalFlow} />
          <MenuRow icon="🍎" label={t('profile.mealPlanFoods', 'Plan de Comidas y Alimentos')} onPress={() => openEdit('restrictions', t('profile.dietary'), t('profile.dietarySub'), 'default')} />
          <MenuRow icon="🔔" label={t('profile.reminders', 'Recordatorios')} onPress={handleNotImplemented} />
          <MenuRow icon="🌗" label={t('profile.interface', 'Interfaz')} value={theme === 'dark' ? t('profile.dark', 'Oscuro') : t('profile.lightMode', 'Claro')} onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <MenuRow icon="🍱" label={t('profile.syncMeals', 'Sincronizar Comidas')} rightIcon="🔒" onPress={handleNotImplemented} />
          <MenuRow icon="👤" label={t('profile.account', 'Cuenta')} rightIcon={showAccount ? '▼' : '›'} onPress={() => setShowAccount(!showAccount)} />
          
          {showAccount && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <MenuRow icon="✎" label={t('profile.editName', 'Nombre')} value={profile?.name ?? '--'} indent onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))} />
              <MenuRow icon="⚖️" label={t('profile.weight', 'Peso')} value={`${profile?.weight ?? '--'} ${t('profile.kg')}`} indent onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} />
              <MenuRow icon="📏" label={t('profile.height', 'Altura')} value={`${profile?.height ?? '--'} ${t('profile.cm')}`} indent onPress={() => openEdit('height', t('profile.height'), t('profile.enterHeight'), 'numeric')} />
              <MenuRow icon="🎂" label={t('profile.age', 'Edad')} value={`${profile?.age ?? '--'}`} indent onPress={() => openEdit('age', t('profile.age'), t('profile.enterAge'), 'numeric')} />
              <MenuRow icon="⚧️" label={t('profile.sex', 'Sexo')} value={profile?.sex ? (profile.sex === 'male' ? t('profile.male') : t('profile.female')) : '--'} indent onPress={handleEditSex} />
              <MenuRow icon="🌐" label={t('profile.language', 'Idioma')} value={language.toUpperCase()} indent onPress={handleEditLanguage} />
            </View>
          )}
        </View>

        {/* About */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('about.title', 'Acerca de')}</Text>
          <MenuRow icon="ℹ️" label={t('about.moreInfo', 'Más información')} rightIcon={showAbout ? '▼' : '›'} onPress={() => setShowAbout(!showAbout)} />
          
          {showAbout && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.border }}>
              <MenuRow icon="📱" label={t('about.tiktok', 'TikTok')} indent onPress={() => Linking.openURL('https://www.tiktok.com/@fit_go?is_from_webapp=1&sender_device=pc')} />
              <MenuRow icon="📸" label={t('about.instagram', 'Instagram')} indent onPress={() => Linking.openURL('https://www.instagram.com/fit___go/')} />
              <MenuRow icon="📧" label={t('about.email', 'Email')} value="fitgoenterprise@gmail.com" indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} />
              <MenuRow icon="💬" label={t('profile.sendFeedback', 'Enviar Sugerencia')} indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} />
              <View style={s.hashtagRow}>
                <Text style={[s.hashtagText, { color: colors.primary }]}>#FitGo #TuMejorVersion</Text>
              </View>
            </View>
          )}
        </View>


        {/* Danger Zone */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.dangerZone', 'Zona Peligrosa')}</Text>
          <MenuRow icon="🚪" label={t('profile.signOut', 'Cerrar Sesión')} onPress={handleLogout} isDestructive rightIcon=" " />
        </View>

        <Text style={[s.version, { color: colors.textMuted }]}>FitGO v1.0.1</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MeasureStat({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { alignItems: 'center', padding: Spacing['2xl'], paddingTop: Spacing.lg, marginBottom: Spacing.base },
  avatar:      { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14, position: 'relative' },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  editBadge:   { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  email:       { fontSize: 13, marginBottom: 16 },
  proBadge:    { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6 },
  proBadgeText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  upgradeBtn:  { borderRadius: Radius.lg, overflow: 'hidden' },
  upgradeGrad: { paddingHorizontal: 20, paddingVertical: 10 },
  upgradeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow:    { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.base, marginBottom: Spacing.base },
  goalCard:    { marginHorizontal: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base, borderWidth: 1 },
  goalLabel:   { fontSize: 13, fontWeight: '500' },
  goalValue:   { fontSize: 15, fontWeight: '700' },
  editHint:    { fontSize: 10 },
  measureCard: { marginHorizontal: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1 },
  measureRow:  { flexDirection: 'row', marginTop: 10 },
  section:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  sectionTitle:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', padding: Spacing.base, paddingBottom: 6 },
  version:     { textAlign: 'center', fontSize: 12, marginTop: 8 },
  hashtagRow:  { padding: Spacing.base, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  hashtagText: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
});
