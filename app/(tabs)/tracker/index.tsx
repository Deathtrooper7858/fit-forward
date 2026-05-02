import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../../store';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { searchFood, FoodItem } from '../../../services/foodDatabase';
import { transcribeAudio, parseVoiceLog } from '../../../services/groq';
import { supabase } from '../../../services/supabase';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Meal = typeof MEALS[number];

const MEAL_ICONS: Record<Meal, string> = {
  breakfast: '🌅',
  lunch:     '☀️',
  dinner:    '🌙',
  snack:     '🍎',
};

function MealSelector({ active, onSelect }: { active: Meal; onSelect: (m: Meal) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={ms.row}>
      {MEALS.map((m) => (
        <TouchableOpacity
          key={m} style={[ms.pill, { borderColor: colors.border }, active === m && { borderColor: colors.primary, backgroundColor: '#7C5CFC22' }]}
          onPress={() => onSelect(m)} activeOpacity={0.75}
        >
          <Text style={ms.icon}>{MEAL_ICONS[m]}</Text>
          <Text style={[ms.label, { color: colors.textMuted }, active === m && { color: colors.primary }]}>
            {t(`tracker.${m}`) || m.charAt(0).toUpperCase() + m.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  pill:       { flex: 1, borderRadius: Radius.lg, borderWidth: 1.5, paddingVertical: 8, alignItems: 'center', gap: 2 },
  pillActive: { },
  icon:       { fontSize: 18 },
  label:      { fontSize: 10, fontWeight: '500' },
  labelActive:{ },
});

function FoodCard({ item, onAdd, isFavorite, onToggleFav }: {
  item: FoodItem; onAdd: (item: FoodItem) => void;
  isFavorite: boolean; onToggleFav: (item: FoodItem) => void;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[fc.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => onAdd(item)} activeOpacity={0.8}>
      <View style={fc.left}>
        <Text style={[fc.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        {item.brand && <Text style={[fc.brand, { color: colors.textMuted }]} numberOfLines={1}>{item.brand}</Text>}
        <View style={fc.macroRow}>
          <Text style={[fc.macro, { color: colors.protein }]}>P {item.protein}g</Text>
          <Text style={[fc.macro, { color: colors.carbs }]}>C {item.carbs}g</Text>
          <Text style={[fc.macro, { color: colors.fat }]}>F {item.fat}g</Text>
        </View>
      </View>
      <View style={fc.right}>
        <TouchableOpacity onPress={() => onToggleFav(item)} style={fc.favBtn}>
          <Text style={fc.favText}>{isFavorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
        <Text style={[fc.cal, { color: colors.accent }]}>{item.calories}</Text>
        <Text style={[fc.calUnit, { color: colors.textMuted }]}>kcal/100g</Text>
        <View style={[fc.addBtn, { backgroundColor: colors.primary }]}>
          <Text style={fc.addText}>+</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  card:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1, ...Shadow.sm },
  left:     { flex: 1, marginRight: 12 },
  name:     { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  brand:    { fontSize: 12, marginBottom: 6 },
  macroRow: { flexDirection: 'row', gap: 10 },
  macro:    { fontSize: 12, fontWeight: '600' },
  right:    { alignItems: 'center', gap: 4 },
  favBtn:   { padding: 4 },
  favText:  { fontSize: 18 },
  cal:      { fontSize: 18, fontWeight: '800' },
  calUnit:  { fontSize: 10 },
  addBtn:   { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  addText:  { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 28 },
});

export default function TrackerScreen() {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<FoodItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [activeMeal, setActiveMeal] = useState<Meal>('lunch');
  const [showFavorites, setShowFavorites] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);
  const isRecording   = recorderState.isRecording;

  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile }   = useAuthStore();
  const { todayLogs, removeLog, favoriteFoods, addFavorite, removeFavorite, addLog } = useNutritionStore();

  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice logging.');
        return;
      }
      
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err: any) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        setLoading(true);
        try {
          const text = await transcribeAudio(uri);
          const items = await parseVoiceLog(text, language);
          
          for (const item of items) {
            const log = {
              id: `v-${Date.now()}-${Math.random()}`,
              foodItem: { ...item, id: `v-${Date.now()}`, source: 'ai' },
              grams: item.grams,
              meal: activeMeal,
              loggedAt: new Date().toISOString(),
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            };
            addLog(log as any);
            if (profile?.id) {
              await supabase.from('food_logs').insert({
                user_id: profile.id,
                food_name: item.name,
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
                grams: item.grams,
                meal: activeMeal,
              });
            }
          }
          if (items.length > 0) {
            Alert.alert('Success', `Logged ${items.length} items from your voice!`);
          }
        } catch (err) {
          Alert.alert('Voice Log Failed', 'Could not parse your voice. Try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const isFavorite = (id: string) => favoriteFoods.some(f => f.id === id);

  const handleToggleFav = (item: FoodItem) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  };

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setShowFavorites(false);
    try {
      const foods = await searchFood(query.trim());
      setResults(foods);
    } catch {
      Alert.alert('Search failed', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleAdd = (item: FoodItem) => {
    router.push({
      pathname: '/modals/food-detail',
      params: { foodJson: JSON.stringify(item), meal: activeMeal },
    });
  };

  const handleDeleteLog = (logId: string, foodName: string) => {
    Alert.alert(
      'Remove Entry',
      `Remove "${foodName}" from today's log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            removeLog(logId);
            if (profile?.id) {
              await supabase.from('food_logs').delete().eq('id', logId);
            }
          },
        },
      ]
    );
  };

  const grouped = MEALS.reduce((acc, m) => {
    acc[m] = todayLogs.filter((l) => l.meal === m);
    return acc;
  }, {} as Record<Meal, typeof todayLogs>);

  const displayedResults = showFavorites ? favoriteFoods : results;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>{t('tracker.title')}</Text>
        <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/modals/scan')} activeOpacity={0.8}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.scanGrad}>
            <Text style={s.scanText}>📷 {t('tracker.photoRecognition')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedResults}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <FoodCard
            item={item}
            onAdd={handleAdd}
            isFavorite={isFavorite(item.id)}
            onToggleFav={handleToggleFav}
          />
        )}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {/* Meal selector */}
            <MealSelector active={activeMeal} onSelect={setActiveMeal} />

            {/* Search + favorites toggle */}
            <View style={s.searchRow}>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={query}
                onChangeText={setQuery}
                placeholder={t('tracker.searchFood')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={doSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={[s.searchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={doSearch}>
                <Text style={s.searchBtnText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.searchBtn, { backgroundColor: colors.surface, borderColor: colors.border }, isRecording && { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
              >
                <Text style={s.searchBtnText}>{isRecording ? '🛑' : '🎙️'}</Text>
              </TouchableOpacity>
              {favoriteFoods.length > 0 && (
                <TouchableOpacity
                  style={[s.searchBtn, { backgroundColor: colors.surface, borderColor: colors.border }, showFavorites && { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}
                  onPress={() => { setShowFavorites(!showFavorites); setResults([]); }}
                >
                  <Text style={s.searchBtnText}>⭐</Text>
                </TouchableOpacity>
              )}
            </View>

            {showFavorites && favoriteFoods.length > 0 && (
              <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>⭐ Favorites</Text>
            )}

            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}

            {/* Today's logs */}
            {displayedResults.length === 0 && !loading && (
              <View style={s.logsSection}>
                <Text style={[s.logsTitle, { color: colors.textPrimary }]}>{t('tracker.dailySummary')}</Text>
                {MEALS.map((m) =>
                  grouped[m].length > 0 ? (
                    <View key={m} style={s.mealGroup}>
                      <Text style={[s.mealGroupTitle, { color: colors.textMuted }]}>{MEAL_ICONS[m]} {t(`tracker.${m}`) || m}</Text>
                      {grouped[m].map((log) => (
                        <TouchableOpacity
                          key={log.id}
                          style={[s.logItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onLongPress={() => handleDeleteLog(log.id, log.foodItem.name)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[s.logName, { color: colors.textPrimary }]}>{log.foodItem.name}</Text>
                            <Text style={[s.logMacros, { color: colors.textMuted }]}>
                              P{log.protein}g · C{log.carbs}g · F{log.fat}g · {log.grams}g
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.logCal, { color: colors.accent }]}>{log.calories} kcal</Text>
                            <Text style={[s.holdHint, { color: colors.textMuted }]}>Hold to remove</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null
                )}
                {todayLogs.length === 0 && (
                  <View style={s.emptyState}>
                    <Text style={s.emptyEmoji}>🍽️</Text>
                    <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>{t('common.noData') || 'Nothing logged yet'}</Text>
                    <Text style={[s.emptySub, { color: colors.textMuted }]}>{t('tracker.emptySub') || 'Search for food above, scan a barcode, or use AI photo recognition'}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg },
  title:         { fontSize: 24, fontWeight: '800' },
  scanBtn:       { borderRadius: Radius.md, overflow: 'hidden' },
  scanGrad:      { paddingHorizontal: 16, paddingVertical: 10 },
  scanText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  list:          { padding: Spacing.base, paddingTop: 0 },
  searchRow:     { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  input:         { flex: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5 },
  searchBtn:     { borderRadius: Radius.md, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1.5 },
  searchBtnText: { fontSize: 18 },
  sectionLabel:  { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  logsSection:   { marginTop: Spacing.sm },
  logsTitle:     { fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },
  mealGroup:     { marginBottom: Spacing.base },
  mealGroupTitle:{ fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'capitalize' },
  logItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.md, marginBottom: 6, borderWidth: 1 },
  logName:       { fontSize: 14, fontWeight: '500' },
  logMacros:     { fontSize: 11, marginTop: 2 },
  logCal:        { fontSize: 14, fontWeight: '600' },
  holdHint:      { fontSize: 9, marginTop: 2 },
  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub:      { fontSize: 14, textAlign: 'center' },
});
