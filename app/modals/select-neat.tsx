import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore } from '../../store';
import { Radius } from '../../constants';

const NEAT_OPTIONS = [
  { label: 'Mayormente Sentado', icon: '🪑', sub: 'Pasas la mayor parte del tiempo sentado' },
  { label: 'A veces de pie', icon: '🧍', sub: 'Mezcla de estar sentado y moverte' },
  { label: 'Mayormente de pie', icon: '🚶', sub: 'Pasas la mayor parte del tiempo de pie' },
  { label: 'En movimiento todo el día', icon: '🏃', sub: 'Trabajo activo o movimiento constante' },
  { label: 'Trabajo físico intenso', icon: '🏗️', sub: 'Cargas pesadas o esfuerzo físico continuo' },
];

export default function SelectNeatModal() {
  const colors = useTheme();
  const { neatLevel, setNeat } = useNutritionStore();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: colors.textPrimary, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Estilo de vida (NEAT)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {NEAT_OPTIONS.map(opt => {
          const isSelected = neatLevel === opt.label;
          return (
            <TouchableOpacity 
              key={opt.label} 
              style={[s.option, { backgroundColor: isSelected ? '#423812' : colors.surface, borderColor: isSelected ? colors.primary : 'transparent' }]}
              onPress={() => {
                setNeat(opt.label);
                router.back();
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 16 }}>{opt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>{opt.label}</Text>
                <Text style={[s.optSub, { color: isSelected ? colors.primary : colors.textSecondary }]}>{opt.sub}</Text>
              </View>
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
  optLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optSub: { fontSize: 13, fontWeight: '500' },
  dividerLabel: { textAlign: 'center', marginVertical: 16, fontSize: 18, fontWeight: '700' },
  healthIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
});
