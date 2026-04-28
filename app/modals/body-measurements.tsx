import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants';
import { useBodyStore, useAuthStore, BodyMeasurement } from '../../store';
import { supabase } from '../../services/supabase';

interface Field {
  key: keyof BodyMeasurement;
  label: string;
  unit: string;
  emoji: string;
}

const FIELDS: Field[] = [
  { key: 'weight',  label: 'Weight',    unit: 'kg',  emoji: '⚖️' },
  { key: 'bodyFat', label: 'Body Fat',  unit: '%',   emoji: '📊' },
  { key: 'waist',   label: 'Waist',     unit: 'cm',  emoji: '📏' },
  { key: 'hips',    label: 'Hips',      unit: 'cm',  emoji: '🦵' },
  { key: 'chest',   label: 'Chest',     unit: 'cm',  emoji: '💪' },
  { key: 'arms',    label: 'Arms',      unit: 'cm',  emoji: '💪' },
  { key: 'legs',    label: 'Legs',      unit: 'cm',  emoji: '🦵' },
  { key: 'neck',    label: 'Neck',      unit: 'cm',  emoji: '📏' },
];

export default function BodyMeasurementsModal() {
  const { profile } = useAuthStore();
  const { measurements, addMeasurement } = useBodyStore();
  const [values, setValues] = useState<Partial<Record<keyof BodyMeasurement, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const hasAtLeastOne = FIELDS.some(f => values[f.key]?.trim());
    if (!hasAtLeastOne) {
      Alert.alert('No data', 'Please enter at least one measurement.');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const measurement: BodyMeasurement = {
        id:      `bm-${Date.now()}`,
        date:    today,
        weight:  values.weight  ? parseFloat(values.weight)  : undefined,
        bodyFat: values.bodyFat ? parseFloat(values.bodyFat) : undefined,
        waist:   values.waist   ? parseFloat(values.waist)   : undefined,
        hips:    values.hips    ? parseFloat(values.hips)    : undefined,
        chest:   values.chest   ? parseFloat(values.chest)   : undefined,
        arms:    values.arms    ? parseFloat(values.arms)    : undefined,
        legs:    values.legs    ? parseFloat(values.legs)    : undefined,
        neck:    values.neck    ? parseFloat(values.neck)    : undefined,
      };

      addMeasurement(measurement);

      if (profile?.id) {
        await supabase.from('body_measurements').insert({
          user_id:  profile.id,
          date:     today,
          weight:   measurement.weight,
          body_fat: measurement.bodyFat,
          waist:    measurement.waist,
          hips:     measurement.hips,
          chest:    measurement.chest,
          arms:     measurement.arms,
          legs:     measurement.legs,
          neck:     measurement.neck,
        });
      }

      Alert.alert('✅ Saved', 'Your measurements have been recorded!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save measurements.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate change vs last measurement
  const last = measurements[0];
  const getChange = (key: keyof BodyMeasurement) => {
    const lastVal = last?.[key] as number | undefined;
    const currStr = values[key];
    if (!lastVal || !currStr) return null;
    const diff = parseFloat(currStr) - lastVal;
    if (isNaN(diff)) return null;
    return diff;
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>Body Measurements</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
              <Text style={s.saveText}>{saving ? '...' : 'Save'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.subtitle}>
            {last ? `Last logged: ${last.date}` : 'First measurement — establish your baseline!'}
          </Text>

          {FIELDS.map((field) => {
            const change = getChange(field.key);
            return (
              <View key={field.key} style={s.fieldRow}>
                <View style={s.fieldLeft}>
                  <Text style={s.fieldEmoji}>{field.emoji}</Text>
                  <View>
                    <Text style={s.fieldLabel}>{field.label}</Text>
                    {last?.[field.key] !== undefined && (
                      <Text style={s.fieldPrev}>Previous: {last[field.key]} {field.unit}</Text>
                    )}
                  </View>
                </View>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.fieldInput}
                    value={values[field.key] ?? ''}
                    onChangeText={(v) => setValues(p => ({ ...p, [field.key]: v }))}
                    placeholder="--"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                  <Text style={s.fieldUnit}>{field.unit}</Text>
                  {change !== null && (
                    <Text style={[s.fieldChange, { color: change < 0 ? Colors.success : Colors.error }]}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* History */}
          {measurements.length > 0 && (
            <View style={s.historySection}>
              <Text style={s.historyTitle}>Recent History</Text>
              {measurements.slice(0, 5).map((m) => (
                <View key={m.id} style={s.historyRow}>
                  <Text style={s.historyDate}>{m.date}</Text>
                  <View style={s.historyStats}>
                    {m.weight   !== undefined && <Text style={s.historyStat}>{m.weight}kg</Text>}
                    {m.bodyFat  !== undefined && <Text style={s.historyStat}>{m.bodyFat}% fat</Text>}
                    {m.waist    !== undefined && <Text style={s.historyStat}>W:{m.waist}cm</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  closeText:     { color: Colors.textSecondary, fontSize: 16 },
  title:         { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  saveBtn:       { borderRadius: Radius.md, overflow: 'hidden' },
  saveGrad:      { paddingHorizontal: 20, paddingVertical: 9 },
  saveText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  content:       { padding: Spacing.base },
  subtitle:      { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  fieldLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  fieldEmoji:    { fontSize: 22 },
  fieldLabel:    { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  fieldPrev:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldInput:    { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: Colors.textPrimary, width: 72, textAlign: 'center', borderWidth: 1, borderColor: Colors.border },
  fieldUnit:     { fontSize: 12, color: Colors.textMuted, width: 24 },
  fieldChange:   { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  historySection:{ marginTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.lg },
  historyTitle:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  historyRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyDate:   { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  historyStats:  { flexDirection: 'row', gap: 10 },
  historyStat:   { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
});
