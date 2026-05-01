import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../constants';
import { useAuthStore, useBodyStore } from '../../../store';
import { supabase } from '../../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../../services/foodDatabase';

// ─── Inline edit modal (cross-platform, replaces Alert.prompt) ────────────────
function EditModal({
  visible, title, placeholder, keyboardType, initialValue, onSave, onClose,
}: {
  visible: boolean; title: string; placeholder: string;
  keyboardType?: 'numeric' | 'default';
  initialValue?: string; onSave: (val: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={em.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={em.box}>
          <Text style={em.title}>{title}</Text>
          <TextInput
            style={em.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={Colors.textMuted}
            keyboardType={keyboardType ?? 'default'}
            autoFocus
          />
          <View style={em.row}>
            <TouchableOpacity style={em.cancelBtn} onPress={onClose}>
              <Text style={em.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={() => { onSave(value); onClose(); }}>
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={em.saveGrad}>
                <Text style={em.saveText}>Save</Text>
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
  box:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 24, borderWidth: 1, borderColor: Colors.border },
  title:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  input:     { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  row:       { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, alignItems: 'center' },
  cancelText:{ color: Colors.textSecondary, fontWeight: '600' },
  saveBtn:   { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  saveGrad:  { paddingVertical: 12, alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '700' },
});

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, onPress }: {
  label: string; value: string | number; unit: string; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={stat.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={[stat.value, { color }]}>{value}</Text>
      <Text style={stat.unit}>{unit}</Text>
      <Text style={stat.label}>{label}</Text>
      {onPress && <Text style={stat.editHint}>Tap to edit</Text>}
    </TouchableOpacity>
  );
}

const stat = StyleSheet.create({
  card:     { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  value:    { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  unit:     { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  label:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  editHint: { fontSize: 8, color: Colors.textMuted, marginTop: 4, textTransform: 'uppercase' },
});

function MenuRow({ icon, label, value, onPress, isDestructive }: {
  icon: string; label: string; value?: string; onPress?: () => void; isDestructive?: boolean;
}) {
  return (
    <TouchableOpacity style={mr.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={mr.icon}>{icon}</Text>
      <Text style={[mr.label, isDestructive && { color: Colors.error }]}>{label}</Text>
      {value && <Text style={mr.value}>{value}</Text>}
      <Text style={mr.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const mr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  icon:  { fontSize: 20, width: 28 },
  label: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  value: { fontSize: 14, color: Colors.textSecondary },
  arrow: { fontSize: 20, color: Colors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profile, setProfile, clearAuth } = useAuthStore();
  const { latest: latestMeasurement }      = useBodyStore();
  const lastMeasure = latestMeasurement();

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    visible: boolean; field: string; title: string; placeholder: string;
    keyboardType?: 'numeric' | 'default'; initialValue?: string;
  }>({ visible: false, field: '', title: '', placeholder: '' });

  const openEdit = (field: string, title: string, placeholder: string, keyboardType: 'numeric' | 'default' = 'default') => {
    setEditModal({
      visible: true, field, title, placeholder, keyboardType,
      initialValue: String((profile as any)?.[field] ?? ''),
    });
  };

  const updateProfileField = async (field: string, value: any) => {
    if (!profile) return;
    const newProfile = { ...profile, [field]: value };

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
        weight:           newProfile.weight,
        height:           newProfile.height,
        age:              newProfile.age,
        sex:              newProfile.sex,
        activity_level:   newProfile.activityLevel,
        goal:             newProfile.goal,
        tdee:             newProfile.tdee,
        target_calories:  newProfile.targetCalories,
        macros:           newProfile.macros,
      }).eq('id', profile.id);

      if (error) throw error;
      setProfile(newProfile);
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSaveEdit = (val: string) => {
    if (!val.trim()) return;
    const field = editModal.field;
    const numericFields = ['weight', 'height', 'age'];
    const parsed = numericFields.includes(field) ? parseFloat(val) : val;
    if (numericFields.includes(field) && isNaN(parsed as number)) return;
    updateProfileField(field, parsed);
  };

  const handleEditGoal = () => {
    Alert.alert('Change Goal', 'What is your current objective?', [
      { text: 'Lose Weight',  onPress: () => updateProfileField('goal', 'lose') },
      { text: 'Maintain',     onPress: () => updateProfileField('goal', 'maintain') },
      { text: 'Build Muscle', onPress: () => updateProfileField('goal', 'gain') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditSex = () => {
    Alert.alert('Biological Sex', 'Used for calculating basal metabolic rate:', [
      { text: 'Male',   onPress: () => updateProfileField('sex', 'male') },
      { text: 'Female', onPress: () => updateProfileField('sex', 'female') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditActivity = () => {
    Alert.alert('Activity Level', 'Select your daily activity level:', [
      { text: 'Sedentary',   onPress: () => updateProfileField('activityLevel', 'sedentary') },
      { text: 'Lightly Active', onPress: () => updateProfileField('activityLevel', 'light') },
      { text: 'Moderately Active', onPress: () => updateProfileField('activityLevel', 'moderate') },
      { text: 'Very Active', onPress: () => updateProfileField('activityLevel', 'active') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleNotImplemented = () => {
    Alert.alert('Coming Soon', 'This feature is currently in development and will be available in a future update.');
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
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
    ? '⬇️ Lose Weight'
    : profile?.goal === 'gain'
    ? '⬆️ Gain Muscle'
    : '⚖️ Maintain';

  return (
    <SafeAreaView style={s.safe}>
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        placeholder={editModal.placeholder}
        keyboardType={editModal.keyboardType}
        initialValue={editModal.initialValue}
        onSave={handleSaveEdit}
        onClose={() => setEditModal(p => ({ ...p, visible: false }))}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1E2332', '#161A24']} style={s.header}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatar}>
            <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </LinearGradient>
          <Text style={s.name}>{profile?.name ?? 'User'}</Text>
          <Text style={s.email}>{profile?.email ?? ''}</Text>
          {profile?.isPro ? (
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
          <StatCard label="Weight"  value={profile?.weight ?? '--'}         unit="kg"   color={Colors.primary}   onPress={() => openEdit('weight', 'Update Weight', 'Enter weight in kg', 'numeric')} />
          <StatCard label="Calories" value={profile?.targetCalories ?? '--'} unit="kcal" color={Colors.accent} />
          <StatCard label="BMI"      value={bmi}                             unit="bmi"  color={Colors.secondary} />
        </View>

        {/* Goal banner */}
        <TouchableOpacity style={s.goalCard} onPress={handleEditGoal} activeOpacity={0.7}>
          <View>
            <Text style={s.goalLabel}>Current Goal</Text>
            <Text style={s.goalValue}>{goalLabel}</Text>
          </View>
          <Text style={s.editHint}>Tap to change ›</Text>
        </TouchableOpacity>

        {/* Body measurements quick stats */}
        {lastMeasure && (
          <View style={s.measureCard}>
            <Text style={s.sectionTitle}>Last Measurement</Text>
            <View style={s.measureRow}>
              {lastMeasure.bodyFat  !== undefined && <MeasureStat label="Body Fat" value={`${lastMeasure.bodyFat}%`} />}
              {lastMeasure.waist    !== undefined && <MeasureStat label="Waist" value={`${lastMeasure.waist}cm`} />}
              {lastMeasure.hips     !== undefined && <MeasureStat label="Hips"  value={`${lastMeasure.hips}cm`} />}
            </View>
          </View>
        )}

        {/* Settings sections */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Body & Health</Text>
          <MenuRow icon="📏" label="Height"       value={`${profile?.height ?? '--'} cm`} onPress={() => openEdit('height', 'Update Height', 'Enter height in cm', 'numeric')} />
          <MenuRow icon="⚖️" label="Weight"       value={`${profile?.weight ?? '--'} kg`} onPress={() => openEdit('weight', 'Update Weight', 'Enter weight in kg', 'numeric')} />
          <MenuRow icon="🎂" label="Age"          value={`${profile?.age ?? '--'} yrs`}  onPress={() => openEdit('age', 'Update Age', 'Enter your age', 'numeric')} />
          <MenuRow icon="⚧️" label="Sex"          value={profile?.sex ? profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1) : '--'} onPress={handleEditSex} />
          <MenuRow icon="🏃" label="Activity"     value={profile?.activityLevel ?? '--'} onPress={handleEditActivity} />
          <MenuRow icon="📊" label="Measurements" onPress={() => router.push('/modals/body-measurements')} />
          <MenuRow icon="🎯" label="Recalculate Macros" onPress={handleEditGoal} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Account & App</Text>
          <MenuRow icon="👤" label="Edit Name"           onPress={() => openEdit('name', 'Update Name', 'Enter your name')} />
          <MenuRow icon="🍽️" label="Dietary Preferences" onPress={handleNotImplemented} />
          <MenuRow icon="🔔" label="Notifications"       onPress={handleNotImplemented} />
          <MenuRow icon="🌙" label="Appearance"          value="Dark" onPress={handleNotImplemented} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Danger Zone</Text>
          <MenuRow icon="🚪" label="Sign Out" onPress={handleLogout} isDestructive />
        </View>

        <Text style={s.version}>Fit-Forward v1.0.1</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MeasureStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: Colors.textMuted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { alignItems: 'center', padding: Spacing['2xl'], paddingTop: Spacing.lg, marginBottom: Spacing.base },
  avatar:      { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  email:       { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  proBadge:    { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6 },
  proBadgeText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  upgradeBtn:  { borderRadius: Radius.lg, overflow: 'hidden' },
  upgradeGrad: { paddingHorizontal: 20, paddingVertical: 10 },
  upgradeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow:    { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.base, marginBottom: Spacing.base },
  goalCard:    { marginHorizontal: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  goalLabel:   { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  goalValue:   { fontSize: 15, color: Colors.textPrimary, fontWeight: '700' },
  editHint:    { fontSize: 10, color: Colors.textMuted },
  measureCard: { marginHorizontal: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  measureRow:  { flexDirection: 'row', marginTop: 10 },
  section:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  sectionTitle:{ fontSize: 12, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', padding: Spacing.base, paddingBottom: 6 },
  version:     { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 8 },
});
