import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';

export default function TrackerMenuModal() {
  const { t } = useTranslation();
  const colors = useTheme();

  const options = [
    { label: 'tracker.copyDay', icon: '👯', color: colors.textPrimary },
    { label: 'tracker.pasteDay', icon: '📋', color: colors.textMuted },
    { label: 'tracker.emptyDay', icon: '🗑️', color: '#EF4444' },
    { label: 'tracker.adjustPortions', icon: '🍎', color: colors.textPrimary },
    { label: 'tracker.recalculateMeals', icon: '🔄', color: colors.textPrimary },
    { label: 'tracker.exportPlan', icon: '📄', color: colors.textPrimary },
    { label: 'tracker.exportDay', icon: '📤', color: colors.textPrimary },
  ];

  return (
    <Pressable style={s.overlay} onPress={() => router.back()}>
      <View style={[s.menu, { backgroundColor: '#1C1C1E', borderColor: colors.border }]}>
        {options.map((opt, idx) => (
          <TouchableOpacity 
            key={opt.label} 
            style={[s.item, idx < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#2C2C2E' }]}
            onPress={() => {
              // Action logic here
              router.back();
            }}
          >
            <Text style={[s.label, { color: opt.color }]}>{t(opt.label)}</Text>
            <Text style={s.icon}>{opt.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menu: {
    width: 250,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { fontSize: 16, fontWeight: '500' },
  icon: { fontSize: 18 },
});
