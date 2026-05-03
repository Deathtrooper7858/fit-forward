import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore } from '../../store';
import { Spacing, Radius } from '../../constants';

export default function SleepModal() {
  const colors = useTheme();
  const { setSleep } = useNutritionStore();
  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState('07:00');

  const calculateHours = () => {
    try {
      const [bH, bM] = bedtime.split(':').map(Number);
      const [wH, wM] = waketime.split(':').map(Number);
      let diff = (wH * 60 + wM) - (bH * 60 + bM);
      if (diff < 0) diff += 24 * 60; // Next day
      return +(diff / 60).toFixed(1);
    } catch {
      return 0;
    }
  };

  const handleSave = () => {
    const hours = calculateHours();
    if (hours > 0 && hours <= 24) {
      setSleep(hours);
      router.back();
    }
  };

  const hours = calculateHours();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Registrar Sueño</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={{ color: colors.textPrimary, fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 20 }}>🌙</Text>
        <Text style={[s.desc, { color: colors.textSecondary }]}>Ingresa tu hora de acostarte y levantarte.</Text>
        
        <View style={s.row}>
          <View style={s.inputContainer}>
            <Text style={[s.label, { color: colors.textPrimary }]}>Hora de dormir</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={bedtime}
              onChangeText={setBedtime}
              keyboardType="numbers-and-punctuation"
              placeholder="23:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={s.inputContainer}>
            <Text style={[s.label, { color: colors.textPrimary }]}>Hora de despertar</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              value={waketime}
              onChangeText={setWaketime}
              keyboardType="numbers-and-punctuation"
              placeholder="07:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={[s.resultBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[s.resultLabel, { color: colors.textSecondary }]}>Total de horas dormidas</Text>
          <Text style={[s.resultValue, { color: colors.primary }]}>{hours > 0 ? `${hours}h` : '--'}</Text>
        </View>

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#7C5CFC' }]} onPress={handleSave}>
          <Text style={s.saveText}>Guardar Sueño</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { position: 'absolute', right: Spacing.lg },
  content: { padding: Spacing.lg },
  desc: { textAlign: 'center', fontSize: 16, marginBottom: 32 },
  row: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  inputContainer: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 50, borderRadius: Radius.lg, paddingHorizontal: 16, fontSize: 16, textAlign: 'center' },
  resultBox: { padding: 24, borderRadius: Radius.lg, alignItems: 'center', marginBottom: 32 },
  resultLabel: { fontSize: 14, marginBottom: 8 },
  resultValue: { fontSize: 32, fontWeight: '800' },
  saveBtn: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
