import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore } from '../../store';
import { Radius } from '../../constants';

const ACTIVITY_OPTIONS = [
  { label: 'No Hago Ejercicio', icon: '🚫' },
  { label: '1-2 Días por Semana', icon: '🔥' },
  { label: '3-4 días por Semana', icon: '🔥' },
  { label: '5-6 días por Semana', icon: '🔥' },
  { label: 'Diario', icon: '🔥' },
];

export default function SelectActivityLevelModal() {
  const colors = useTheme();
  const { exerciseLevel, setExerciseLevel } = useNutritionStore();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: colors.textPrimary, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Ejercicio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {ACTIVITY_OPTIONS.map(opt => {
          const isSelected = exerciseLevel === opt.label;
          return (
            <TouchableOpacity 
              key={opt.label} 
              style={[s.option, { backgroundColor: isSelected ? '#423812' : colors.surface, borderColor: isSelected ? colors.primary : 'transparent' }]}
              onPress={() => {
                setExerciseLevel(opt.label);
                router.back();
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 16 }}>{opt.icon}</Text>
              <Text style={[s.optLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  optLabel: { fontSize: 16, fontWeight: '700' },
  dividerLabel: { textAlign: 'center', marginVertical: 16, fontSize: 18, fontWeight: '700' },
  healthIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
});
