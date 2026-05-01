import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Colors, Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore } from '../../../store';
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
  return (
    <View style={ms.row}>
      {MEALS.map((m) => (
        <TouchableOpacity
          key={m} style={[ms.pill, active === m && ms.pillActive]}
          onPress={() => onSelect(m)} activeOpacity={0.75}
        >
          <Text style={ms.icon}>{MEAL_ICONS[m]}</Text>
          <Text style={[ms.label, active === m && ms.labelActive]}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  row:        { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  pill:       { flex: 1, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 8, alignItems: 'center', gap: 2 },
  pillActive: { borderColor: Colors.primary, backgroundColor: '#7C5CFC22' },
  icon:       { fontSize: 18 },
  label:      { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  labelActive:{ color: Colors.primary },
});

function FoodCard({ item, onAdd, isFavorite, onToggleFav }: {
  item: FoodItem; onAdd: (item: FoodItem) => void;
  isFavorite: boolean; onToggleFav: (item: FoodItem) => void;
}) {
  return (
    <TouchableOpacity style={fc.card} onPress={() => onAdd(item)} activeOpacity={0.8}>
      <View style={fc.left}>
        <Text style={fc.name} numberOfLines={1}>{item.name}</Text>
        {item.brand && <Text style={fc.brand} numberOfLines={1}>{item.brand}</Text>}
        <View style={fc.macroRow}>
          <Text style={[fc.macro, { color: Colors.protein }]}>P {item.protein}g</Text>
          <Text style={[fc.macro, { color: Colors.carbs }]}>C {item.carbs}g</Text>
          <Text style={[fc.macro, { color: Colors.fat }]}>F {item.fat}g</Text>
        </View>
      </View>
      <View style={fc.right}>
        <TouchableOpacity onPress={() => onToggleFav(item)} style={fc.favBtn}>
          <Text style={fc.favText}>{isFavorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
        <Text style={fc.cal}>{item.calories}</Text>
        <Text style={fc.calUnit}>kcal/100g</Text>
        <View style={fc.addBtn}>
          <Text style={fc.addText}>+</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  card:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  left:     { flex: 1, marginRight: 12 },
  name:     { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  brand:    { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  macroRow: { flexDirection: 'row', gap: 10 },
  macro:    { fontSize: 12, fontWeight: '600' },
  right:    { alignItems: 'center', gap: 4 },
  favBtn:   { padding: 4 },
  favText:  { fontSize: 18 },
  cal:      { fontSize: 18, fontWeight: '800', color: Colors.accent },
  calUnit:  { fontSize: 10, color: Colors.textMuted },
  addBtn:   { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
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
          const items = await parseVoiceLog(text);
          
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
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Food Tracker</Text>
        <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/modals/scan')} activeOpacity={0.8}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.scanGrad}>
            <Text style={s.scanText}>📷 Scan / AI</Text>
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
                style={s.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Search food (e.g. chicken breast)…"
                placeholderTextColor={Colors.textMuted}
                onSubmitEditing={doSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={s.searchBtn} onPress={doSearch}>
                <Text style={s.searchBtnText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.searchBtn, isRecording && { backgroundColor: '#EF444422', borderColor: '#EF4444' }]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
              >
                <Text style={s.searchBtnText}>{isRecording ? '🛑' : '🎙️'}</Text>
              </TouchableOpacity>
              {favoriteFoods.length > 0 && (
                <TouchableOpacity
                  style={[s.searchBtn, showFavorites && { backgroundColor: '#7C5CFC22', borderColor: Colors.primary }]}
                  onPress={() => { setShowFavorites(!showFavorites); setResults([]); }}
                >
                  <Text style={s.searchBtnText}>⭐</Text>
                </TouchableOpacity>
              )}
            </View>

            {showFavorites && favoriteFoods.length > 0 && (
              <Text style={s.sectionLabel}>⭐ Favorites</Text>
            )}

            {loading && <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />}

            {/* Today's logs */}
            {displayedResults.length === 0 && !loading && (
              <View style={s.logsSection}>
                <Text style={s.logsTitle}>Today's Meals</Text>
                {MEALS.map((m) =>
                  grouped[m].length > 0 ? (
                    <View key={m} style={s.mealGroup}>
                      <Text style={s.mealGroupTitle}>{MEAL_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                      {grouped[m].map((log) => (
                        <TouchableOpacity
                          key={log.id}
                          style={s.logItem}
                          onLongPress={() => handleDeleteLog(log.id, log.foodItem.name)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={s.logName}>{log.foodItem.name}</Text>
                            <Text style={s.logMacros}>
                              P{log.protein}g · C{log.carbs}g · F{log.fat}g · {log.grams}g
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={s.logCal}>{log.calories} kcal</Text>
                            <Text style={s.holdHint}>Hold to remove</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null
                )}
                {todayLogs.length === 0 && (
                  <View style={s.emptyState}>
                    <Text style={s.emptyEmoji}>🍽️</Text>
                    <Text style={s.emptyTitle}>Nothing logged yet</Text>
                    <Text style={s.emptySub}>Search for food above, scan a barcode, or use AI photo recognition</Text>
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
  safe:          { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg },
  title:         { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scanBtn:       { borderRadius: Radius.md, overflow: 'hidden' },
  scanGrad:      { paddingHorizontal: 16, paddingVertical: 10 },
  scanText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  list:          { padding: Spacing.base, paddingTop: 0 },
  searchRow:     { flexDirection: 'row', gap: 8, marginBottom: Spacing.base },
  input:         { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border },
  searchBtn:     { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border },
  searchBtnText: { fontSize: 18 },
  sectionLabel:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  logsSection:   { marginTop: Spacing.sm },
  logsTitle:     { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  mealGroup:     { marginBottom: Spacing.base },
  mealGroupTitle:{ fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'capitalize' },
  logItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  logName:       { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  logMacros:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  logCal:        { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  holdHint:      { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub:      { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
