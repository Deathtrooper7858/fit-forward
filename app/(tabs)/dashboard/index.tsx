import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore, useBodyStore } from '../../../store';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const WIDGET_WIDTH = (width - Spacing.base * 2 - Spacing.md) / 2;

const RING_SIZE     = 180;
const STROKE_WIDTH  = 15;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Calorie/Score Ring ─────────────────────────────────────────────────────────
function ScoreRing({ consumed, target }: { consumed: number; target: number }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pct = Math.min(consumed / Math.max(target, 1), 1);
  const strokeDashoffset = CIRCUMFERENCE - pct * CIRCUMFERENCE;

  return (
    <View style={ring.container}>
      <Text style={[ring.topLabel, { color: colors.textSecondary }]}>{t('tracker.today', 'Hoy')}</Text>
      <View style={{ height: 16 }} />
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={colors.surfaceAlt} strokeWidth={STROKE_WIDTH} fill="transparent" />
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={pct > 0.9 ? colors.error : colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
      </Svg>
      <View style={ring.textWrap}>
        <Text style={[ring.consumed, { color: colors.textPrimary }]}>{consumed}</Text>
        <Text style={[ring.label, { color: colors.textSecondary }]}>
          {consumed < target * 0.3 ? 'Bajo' : consumed > target * 0.9 ? 'Alto' : 'Medio'}
        </Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 12 },
  topLabel:  { fontSize: 16, fontWeight: '500', position: 'absolute', top: -10 },
  textWrap:  { position: 'absolute', alignItems: 'center', zIndex: 2, top: RING_SIZE / 2 - 10 },
  consumed:  { fontSize: 40, fontWeight: '800' },
  label:     { fontSize: 16, marginTop: 4 },
});

// ─── Widget Card ────────────────────────────────────────────────────────────────
function WidgetCard({ title, value, subValue, icon, onPress, customContent }: any) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[w.card, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.8} delayLongPress={500} onLongPress={() => Alert.alert('Modo edición', 'Mantén presionado y arrastra para mover el widget (Próximamente)')}>
      <View style={w.header}>
        <Text style={w.icon}>{icon}</Text>
        <Text style={[w.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {customContent ? customContent : (
        <View style={w.content}>
          <Text style={[w.value, { color: colors.textPrimary }]}>{value}</Text>
          {subValue && <Text style={[w.subValue, { color: colors.textSecondary }]}>{subValue}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const w = StyleSheet.create({
  card: { width: WIDGET_WIDTH, height: 160, borderRadius: Radius.xl, padding: Spacing.md, ...Shadow.sm, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center' },
  value: { fontSize: 28, fontWeight: '800' },
  subValue: { fontSize: 12, marginTop: 4 },
});

// ─── Dashboard (Progreso) Screen ────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile } = useAuthStore();
  const { todayLogs, waterIntake, dailySteps, selectedDate, totals, fetchLogs, dailySleep } = useNutritionStore();
  const { latest } = useBodyStore();
  
  const { calories } = useMemo(() => totals(), [todayLogs]);
  const target = profile?.targetCalories ?? 2000;
  const name = profile?.name?.split(' ')[0] ?? t('dashboard.fallbackName');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening');

  useEffect(() => {
    async function loadTodayData() {
      if (!profile?.id) return;
      const today = new Date().toLocaleDateString('en-CA');
      await fetchLogs(profile.id, today);
    }
    loadTodayData();
  }, [profile?.id]);

  const currentWeight = latest()?.weight || profile?.weight || 0;
  const targetWeight = profile?.goal === 'lose' ? currentWeight - 5 : profile?.goal === 'gain' ? currentWeight + 5 : currentWeight; // placeholder logic
  const steps = dailySteps[selectedDate] || 0;
  const sleepHours = dailySleep[selectedDate] || 0;

  // Widget Order State (Mock for now, to support future drag drop)
  const [widgetsOrder, setWidgetsOrder] = useState(['weight', 'bodyFat', 'sleep', 'calories', 'steps', 'water', 'macros', 'measurements', 'photos']);

  const getGoalInfo = () => {
    switch (profile?.goal) {
      case 'lose': return { label: t('profile.loseWeight', 'Pérdida de Peso'), icon: '📉' };
      case 'gain': return { label: t('profile.gainMuscle', 'Ganancia Muscular'), icon: '💪' };
      default: return { label: t('profile.maintain', 'Mantenimiento'), icon: '⚖️' };
    }
  };
  const goalInfo = getGoalInfo();

  const renderWidget = (id: string) => {
    switch (id) {
      case 'weight':
        return (
          <WidgetCard key="weight" title="Peso Balanza" icon="⚖️"
            value={`${currentWeight}`} subValue="kg"
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'sleep':
        return (
          <WidgetCard key="sleep" title="Sueño" icon="🌙"
            customContent={
              <View style={w.content}>
                 <Text style={[w.value, { color: colors.textPrimary }]}>{sleepHours > 0 ? `${sleepHours}h` : '--'}</Text>
                 <Text style={[w.subValue, { color: colors.textSecondary }]}>{sleepHours > 0 ? 'Registrado hoy' : 'Toca para añadir'}</Text>
              </View>
            }
            onPress={() => router.push('/modals/sleep' as any)}
          />
        );
      case 'calories':
        return (
          <WidgetCard key="calories" title="Calorías" icon="⚡"
            customContent={
              <View style={w.content}>
                <Text style={{fontSize: 24, fontWeight: '800', color: colors.textPrimary}}>{calories}</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>Registra tu comida</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'steps':
        return (
          <WidgetCard key="steps" title="Pasos" icon="👟"
            customContent={
              <View style={w.content}>
                <Text style={{fontSize: 24, fontWeight: '800', color: colors.textPrimary}}>{steps}</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>Sincroniza Health</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'water':
        return (
          <WidgetCard key="water" title="Agua" icon="💧"
            customContent={
              <View style={w.content}>
                <Text style={{fontSize: 24, fontWeight: '800', color: colors.textPrimary}}>{(waterIntake / 1000).toFixed(1)} L 🚩</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>Promedio Semanal</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'bodyFat':
        return (
          <WidgetCard key="bodyFat" title="Grasa Corporal" icon="🔥"
            value={latest()?.bodyFat ? `${latest()?.bodyFat}%` : '--'} subValue="Toca para actualizar"
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'macros':
        return (
          <WidgetCard key="macros" title="Macros" icon="🥗"
            customContent={
              <View style={[w.content, { gap: 4 }]}>
                <Text style={{ fontSize: 13, color: colors.protein }}>P: {totals().protein}g</Text>
                <Text style={{ fontSize: 13, color: colors.carbs }}>C: {totals().carbs}g</Text>
                <Text style={{ fontSize: 13, color: colors.fat }}>G: {totals().fat}g</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'measurements':
        return (
          <WidgetCard key="measurements" title="Medidas" icon="📏"
            value="Ver historial" subValue="Cintura, pecho, etc."
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'photos':
        return (
          <WidgetCard key="photos" title="" icon=""
            customContent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32, color: colors.textSecondary }}>📷</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 8 }}>Añadir fotos</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>para ver el progreso</Text>
              </View>
            }
            onPress={() => Alert.alert('Fotos', 'Añadir fotos (Próximamente)')}
          />
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: colors.textPrimary }]}>{greeting}, {name} 👋</Text>
            <Text style={[s.date, { color: colors.textSecondary }]}>{new Date().toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatarGrad}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{name[0]?.toUpperCase()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Nutritional Score Card */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Score Nutricional</Text>
          <Text style={{ color: colors.textPrimary }}>→</Text>
        </View>
        <View style={[s.cardFull, { backgroundColor: colors.surface }]}>
          <ScoreRing consumed={calories} target={target} />
        </View>

        {/* Phase Card */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Fase</Text>
          <Text style={{ color: colors.textPrimary }}>→</Text>
        </View>
        <View style={[s.cardFull, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 20 }}>{goalInfo.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary }}>{goalInfo.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>{currentWeight} kg</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.secondary }}>🎯 {targetWeight} kg</Text>
          </View>
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { backgroundColor: colors.secondary, width: '30%' }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 24 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>📅 Llegarás en</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>11 semanas</Text>
          </View>
          <TouchableOpacity style={[s.updateBtn, { backgroundColor: '#7C5CFC' }]} onPress={() => router.push('/modals/body-measurements')}>
            <Text style={[s.updateBtnText, { color: '#FFF' }]}>Actualizar Progreso</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Estadísticas</Text>
          <Text style={{ color: colors.textPrimary }}>→</Text>
        </View>
        <View style={s.widgetGrid}>
          {widgetsOrder.map(id => renderWidget(id))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg },
  greeting: { fontSize: 24, fontWeight: '800' },
  date: { fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  cardFull: { borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.md },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  updateBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  updateBtnText: { fontSize: 16, fontWeight: '700' },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'space-between' },
});
