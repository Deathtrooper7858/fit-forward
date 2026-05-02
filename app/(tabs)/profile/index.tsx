import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../constants';
import { useAuthStore, useBodyStore, useSettingsStore } from '../../../store';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../../services/foodDatabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';

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
          <Text style={[em.title, { color: colors.textPrimary }]}>{t('profile.unlockPro')}</Text>
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

// ─── Language Modal ───────────────────────────────────────────────────────────
function LanguageModal({
  visible, currentLang, onSelect, onClose,
}: {
  visible: boolean; currentLang: string; onSelect: (lang: any) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  
  const languages = [
    { id: 'en', name: 'English' },
    { id: 'es', name: 'Español' },
    { id: 'fr', name: 'Français' },
    { id: 'pt', name: 'Português' },
    { id: 'it', name: 'Italiano' },
    { id: 'de', name: 'Deutsch' },
    { id: 'ru', name: 'Русский' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={[em.box, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}>
          <Text style={[em.title, { color: colors.textPrimary, margin: 24, marginBottom: 16 }]}>{t('profile.language')}</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {languages.map((l) => (
              <TouchableOpacity
                key={l.id}
                style={{ padding: 16, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: currentLang === l.id ? colors.primary + '22' : 'transparent' }}
                onPress={() => { onSelect(l.id); onClose(); }}
              >
                <Text style={{ fontSize: 16, color: currentLang === l.id ? colors.primary : colors.textPrimary, fontWeight: currentLang === l.id ? '700' : '400' }}>{l.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row' }}>
            <TouchableOpacity style={[em.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[em.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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

function MenuRow({ icon, label, value, onPress, isDestructive }: {
  icon: string; label: string; value?: string; onPress?: () => void; isDestructive?: boolean;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[mr.row, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={mr.icon}>{icon}</Text>
      <Text style={[mr.label, { color: isDestructive ? colors.error : colors.textPrimary }]}>{label}</Text>
      {value && <Text style={[mr.value, { color: colors.textSecondary }]}>{value}</Text>}
      <Text style={[mr.arrow, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

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

  const openEdit = (field: string, title: string, placeholder: string, keyboardType: 'numeric' | 'default' = 'default') => {
    setEditModal({
      visible: true, field, title, placeholder, keyboardType,
      initialValue: String((profile as any)?.[field] ?? ''),
    });
  };

  const updateProfileField = async (field: string, value: any) => {
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

    const newProfile = { ...profile, [field]: value, id: userId };

    if (['weight', 'height', 'age', 'sex', 'activityLevel', 'goal'].includes(field)) {
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
    const parsed = numericFields.includes(field) ? parseFloat(val) : val;
    if (numericFields.includes(field) && isNaN(parsed as number)) return;
    updateProfileField(field, parsed);
  };

  const handleEditGoal = () => {
    Alert.alert(t('profile.currentGoal'), t('profile.goalQuest'), [
      { text: t('profile.loseWeight'),  onPress: () => updateProfileField('goal', 'lose') },
      { text: t('profile.maintain'),     onPress: () => updateProfileField('goal', 'maintain') },
      { text: t('profile.gainMuscle'), onPress: () => updateProfileField('goal', 'gain') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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
          await supabase.auth.signOut();
          clearAuth();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const bmi = profile
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
            <LinearGradient colors={['#F59E0B', '#D97706']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⭐ Pro Member</Text>
            </LinearGradient>
          ) : (
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/modals/paywall')}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>Upgrade to Pro 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatCard label={t('profile.weight')}  value={profile?.weight ?? '--'}         unit="kg"   color={colors.primary}   onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} />
          <StatCard label={t('profile.calories') || 'Calories'} value={profile?.targetCalories ?? '--'} unit="kcal" color={colors.accent} />
          <StatCard label={t('profile.bmi') || 'BMI'}      value={bmi}                             unit="bmi"  color={colors.secondary} />
        </View>

        {/* Goal banner */}
        <TouchableOpacity style={[s.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleEditGoal} activeOpacity={0.7}>
          <View>
            <Text style={[s.goalLabel, { color: colors.textSecondary }]}>{t('profile.currentGoal')}</Text>
            <Text style={[s.goalValue, { color: colors.textPrimary }]}>{goalLabel}</Text>
          </View>
          <Text style={[s.editHint, { color: colors.textMuted }]}>{t('profile.tapToChange') || 'Tap to change ›'}</Text>
        </TouchableOpacity>

        {/* Body measurements quick stats */}
        {lastMeasure && (
          <View style={[s.measureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.lastMeasurement')}</Text>
            <View style={s.measureRow}>
              {lastMeasure.bodyFat  !== undefined && <MeasureStat label={t('profile.bodyFat')} value={`${lastMeasure.bodyFat}%`} />}
              {lastMeasure.waist    !== undefined && <MeasureStat label={t('profile.waist')} value={`${lastMeasure.waist}cm`} />}
              {lastMeasure.hips     !== undefined && <MeasureStat label={t('profile.hips')}  value={`${lastMeasure.hips}cm`} />}
            </View>
          </View>
        )}

        {/* Settings sections */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.bodyHealth')}</Text>
          <MenuRow icon="📏" label={t('profile.height')}       value={`${profile?.height ?? '--'} cm`} onPress={() => openEdit('height', t('profile.height'), t('profile.enterHeight'), 'numeric')} />
          <MenuRow icon="⚖️" label={t('profile.weight')}       value={`${profile?.weight ?? '--'} kg`} onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} />
          <MenuRow icon="🎂" label={t('profile.age')}          value={`${profile?.age ?? '--'} yrs`}  onPress={() => openEdit('age', t('profile.age'), t('profile.enterAge'), 'numeric')} />
          <MenuRow icon="⚧️" label={t('profile.sex')}          value={profile?.sex ? (profile.sex === 'male' ? t('profile.male') : t('profile.female')) : '--'} onPress={handleEditSex} />
          <MenuRow icon="🏃" label={t('profile.activity')}     value={profile?.activityLevel ? t(`profile.${profile.activityLevel}`) : '--'} onPress={handleEditActivity} />
          <MenuRow icon="📊" label={t('profile.measurements')} onPress={() => router.push('/modals/body-measurements')} />
          <MenuRow icon="🎯" label={t('profile.recalculate')} onPress={handleEditGoal} />
        </View>

        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.accountApp')}</Text>
          <MenuRow icon="👤" label={t('profile.editName')} onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))} />
          <MenuRow icon="🍽️" label={t('profile.dietary')} value={profile?.restrictions?.join(', ') || 'None'} onPress={() => openEdit('restrictions', t('profile.dietary'), 'e.g. Vegan, Nut-free', 'default')} />
          <MenuRow icon="🌙" label={t('profile.appearance')} value={theme === 'dark' ? t('profile.dark') : t('profile.lightMode')} onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <MenuRow icon="🌐" label={t('profile.language')} value={language.toUpperCase()} onPress={handleEditLanguage} />
          <MenuRow icon="🔔" label={t('profile.notifications')} onPress={handleNotImplemented} />
        </View>

        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('about.title')}</Text>
          <MenuRow 
            icon="📱" 
            label={t('about.tiktok')} 
            onPress={() => Linking.openURL('https://www.tiktok.com/@fit_go?is_from_webapp=1&sender_device=pc')} 
          />
          <MenuRow 
            icon="📸" 
            label={t('about.instagram')} 
            onPress={() => Linking.openURL('https://www.instagram.com/fit___go/')} 
          />
          <MenuRow 
            icon="📧" 
            label={t('about.email')} 
            value="fitgoenterprise@gmail.com"
            onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} 
          />
          <View style={s.hashtagRow}>
            <Text style={[s.hashtagText, { color: colors.primary }]}>#FitGo #TuMejorVersion</Text>
          </View>
        </View>

        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.dangerZone')}</Text>
          <MenuRow icon="🚪" label={t('profile.signOut')} onPress={handleLogout} isDestructive />
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
