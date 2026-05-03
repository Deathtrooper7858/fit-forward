import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { getFoodByBarcode } from '../../services/foodDatabase';
import { analyzeFoodPhoto } from '../../services/groq';
import { useNutritionStore, useSettingsStore, useAuthStore } from '../../store';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { SuccessModal } from '../../components/SuccessModal';

type ScanMode = 'barcode' | 'photo';
type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export default function ScanModal() {
  const { t } = useTranslation();
  const { initialMeal, date } = useLocalSearchParams<{ initialMeal?: Meal, date?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [mode, setMode]                 = useState<ScanMode>('barcode');
  const [photoResult, setPhotoResult]   = useState<{
    foods: { 
      name: string; grams: number; calories: number; protein: number; carbs: number; fat: number;
      sugar?: number; fiber?: number; sodium?: number; iron?: number; saturatedFat?: number; transFat?: number;
    }[];
    totalCalories: number;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  } | null>(null);
  const [editedFoods, setEditedFoods] = useState<{
    name: string; grams: number; calories: number; protein: number; carbs: number; fat: number;
    sugar?: number; fiber?: number; sodium?: number; iron?: number; saturatedFat?: number; transFat?: number;
    originalGrams: number; originalCal: number; originalProt: number; originalCarbs: number; originalFat: number;
    originalSugar?: number; originalFiber?: number; originalSodium?: number; originalIron?: number; originalSatFat?: number; originalTransFat?: number;
  }[]>([]);
  const [capturedUri, setCapturedUri]    = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { addLog, fetchLogs, selectedDate } = useNutritionStore();
  const { profile } = useAuthStore();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const getAutoMeal = (): Meal => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  };

  const resetPhoto = () => {
    setCapturedUri(null);
    setPhotoResult(null);
  };

  const handleBarcode = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading || mode !== 'barcode') return;
    setScanned(true);
    setLoading(true);

    try {
      const food = await getFoodByBarcode(data);
      setLoading(false);

      if (!food) {
        Alert.alert(
          t('scan.productNotFound'),
          `Barcode: ${data}\n\n${t('scan.productNotFoundSub')}`,
          [
            { text: t('scan.tryAgain'), onPress: () => setScanned(false) },
            { text: t('common.cancel'), onPress: () => router.back() },
          ]
        );
        return;
      }

      router.replace({
        pathname: '/modals/food-detail',
        params: { 
          foodJson: JSON.stringify(food),
          meal: initialMeal || getAutoMeal(),
          date: date
        },
      });
    } catch {
      setLoading(false);
      Alert.alert(t('common.error'), t('scan.lookupFailed') || 'Failed to look up barcode. Please try again.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleTakePhoto = async () => {
    if (loading || !cameraRef.current) return;
    setLoading(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.2,
        exif: false,
      });

      setCapturedUri(photo.uri);

      const result = await analyzeFoodPhoto(photo.base64, language);
      setPhotoResult(result);
      
      setEditedFoods(result.foods.map(f => ({
        ...f,
        originalGrams: f.grams,
        originalCal: f.calories,
        originalProt: f.protein,
        originalCarbs: f.carbs,
        originalFat: f.fat,
        originalSugar: f.sugar,
        originalFiber: f.fiber,
        originalSodium: f.sodium,
        originalIron: f.iron,
        originalSatFat: f.saturatedFat,
        originalTransFat: f.transFat,
      })));
    } catch (err: any) {
      console.error('Analysis Error:', err);
      Alert.alert('Analysis Failed', `Could not analyze the food photo.\n\nError: ${err?.message || err}`, [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateGrams = (index: number, newGrams: string) => {
    const val = parseInt(newGrams) || 0;
    setEditedFoods(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const ratio = val / f.originalGrams;
      return {
        ...f,
        grams: val,
        calories: Math.round(f.originalCal * ratio),
        protein:  Math.round(f.originalProt * ratio),
        carbs:    Math.round(f.originalCarbs * ratio),
        fat:      Math.round(f.originalFat * ratio),
        sugar:    f.originalSugar ? Math.round(f.originalSugar * ratio) : undefined,
        fiber:    f.originalFiber ? Math.round(f.originalFiber * ratio) : undefined,
        sodium:   f.originalSodium ? Math.round(f.originalSodium * ratio) : undefined,
        iron:     f.originalIron ? Math.round(f.originalIron * ratio) : undefined,
        saturatedFat: f.originalSatFat ? Math.round(f.originalSatFat * ratio) : undefined,
        transFat:     f.originalTransFat ? Math.round(f.originalTransFat * ratio) : undefined,
      };
    }));
  };

  const handleAddAllFoods = async () => {
    if (!editedFoods.length) return;

    const targetMeal = initialMeal || getAutoMeal();
    const logDate = date || new Date().toLocaleDateString('en-CA');

    editedFoods.forEach((food) => {
      addLog({
        id:       `temp-${Date.now()}-${food.name}`,
        foodItem: {
          id:       `ai-${Date.now()}-${food.name}`,
          name:     food.name,
          calories: Math.round((food.originalCal / food.originalGrams) * 100),
          protein:  Math.round((food.originalProt / food.originalGrams) * 100),
          carbs:    Math.round((food.originalCarbs / food.originalGrams) * 100),
          fat:      Math.round((food.originalFat / food.originalGrams) * 100),
          sugar:    food.originalSugar ? Math.round((food.originalSugar / food.originalGrams) * 100) : undefined,
          fiber:    food.originalFiber ? Math.round((food.originalFiber / food.originalGrams) * 100) : undefined,
          sodium:   food.originalSodium ? Math.round((food.originalSodium / food.originalGrams) * 100) : undefined,
          iron:     food.originalIron ? Math.round((food.originalIron / food.originalGrams) * 100) : undefined,
          saturatedFat: food.originalSatFat ? Math.round((food.originalSatFat / food.originalGrams) * 100) : undefined,
          transFat:     food.originalTransFat ? Math.round((food.originalTransFat / food.originalGrams) * 100) : undefined,
          source:   'custom',
        },
        grams:    food.grams,
        meal:     targetMeal,
        loggedAt: date ? `${date}T${new Date().toISOString().split('T')[1]}` : new Date().toISOString(),
        calories: food.calories,
        protein:  food.protein,
        carbs:    food.carbs,
        fat:      food.fat,
        sugar:    food.sugar,
        fiber:    food.fiber,
        sodium:   food.sodium,
        iron:     food.iron,
        saturatedFat: food.saturatedFat,
        transFat:     food.transFat,
      });
    });

    if (profile?.id) {
      const dbItems = editedFoods.map(food => ({
        user_id: profile.id,
        food_name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        grams: food.grams,
        meal: targetMeal,
        logged_at: logDate,
        sugar: food.sugar,
        fiber: food.fiber,
        sodium: food.sodium,
        iron: food.iron,
        saturated_fat: food.saturatedFat,
        trans_fat: food.transFat,
      }));

      const { error } = await supabase.from('food_logs').insert(dbItems);
      
      if (!error) {
        await fetchLogs(profile.id, selectedDate || logDate);
      }
    }

    setShowSuccess(true);
  };

  let content;
  if (!permission) {
    content = (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  } else if (!permission.granted) {
    content = (
      <View style={s.center}>
        <Text style={s.noPermText}>{t('scan.noPermission')}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.permGrad}>
            <Text style={s.permBtnText}>{t('scan.grantPermission')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  } else if (photoResult && capturedUri) {
    const confidenceColor = photoResult.confidence === 'high' ? colors.success : photoResult.confidence === 'medium' ? colors.warning : colors.error;
    content = (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.resultHeader, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t('scan.analysisTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
          <Image source={{ uri: capturedUri }} style={s.capturedImage} resizeMode="cover" />
          <View style={[s.confidenceBadge, { borderColor: confidenceColor }]}>
            <View style={[s.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={[s.confidenceText, { color: confidenceColor }]}>{photoResult.confidence.toUpperCase()} {t('scan.confidence')}</Text>
          </View>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('scan.detectedFoods')}</Text>
          {editedFoods.map((food, i) => (
            <View key={i} style={[s.foodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.foodCardLeft}>
                <Text style={[s.foodName, { color: colors.textPrimary }]}>{food.name}</Text>
                <View style={s.gramInputRow}>
                  <TextInput
                    style={[s.gramInput, { color: colors.primary, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={String(food.grams)}
                    onChangeText={(v) => updateGrams(i, v)}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={[s.gramLabel, { color: colors.textMuted }]}>g</Text>
                </View>
              </View>
              <View style={s.foodCardRight}>
                <Text style={[s.foodCal, { color: colors.accent }]}>{food.calories} kcal</Text>
                <View style={s.macroRow}>
                  <Text style={[s.macroTag, { color: colors.protein }]}>P {food.protein}g</Text>
                  <Text style={[s.macroTag, { color: colors.carbs }]}>C {food.carbs}g</Text>
                  <Text style={[s.macroTag, { color: colors.fat }]}>F {food.fat}g</Text>
                </View>
              </View>
            </View>
          ))}
          <LinearGradient colors={colors.theme === 'dark' ? ['#7C5CFC15', '#22D3EE11'] : [colors.primary + '10', colors.secondary + '05']} style={[s.totalCard, { borderColor: colors.primary + '33' }]}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>{t('scan.totalCalories')}</Text>
            <Text style={[s.totalValue, { color: colors.accent }]}>{editedFoods.reduce((acc, f) => acc + f.calories, 0)} kcal</Text>
          </LinearGradient>
          {photoResult.notes && <Text style={[s.notesText, { color: colors.textSecondary }]}>💡 {photoResult.notes}</Text>}
        </ScrollView>
        <View style={[s.resultFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.retryBtn, { borderColor: colors.border }]} onPress={resetPhoto}>
            <Text style={[s.retryText, { color: colors.textSecondary }]}>📷 {t('scan.retake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addAllBtn} onPress={handleAddAllFoods} activeOpacity={0.85}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.addAllGrad}>
              <Text style={s.addAllText}>{t('scan.addAll', { meal: t(`tracker.${initialMeal || getAutoMeal()}`) })}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    content = (
      <View style={s.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcode : undefined}
          barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'] } : undefined}
        />
        <View style={s.overlay}>
          <View style={s.header}>
            <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}><Text style={s.closeText}>✕</Text></TouchableOpacity>
            <Text style={s.title}>{mode === 'barcode' ? t('scan.barcodeTitle') : t('scan.photoTitle')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={s.modeRow}>
            <TouchableOpacity style={[s.modePill, mode === 'barcode' && { borderColor: colors.primary, backgroundColor: 'rgba(124,92,252,0.3)' }]} onPress={() => { setMode('barcode'); setScanned(false); }}><Text style={[s.modeText, mode === 'barcode' && s.modeTextActive]}>🔍 {t('scan.barcode')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.modePill, mode === 'photo' && { borderColor: colors.primary, backgroundColor: 'rgba(124,92,252,0.3)' }]} onPress={() => { setMode('photo'); setScanned(false); }}><Text style={[s.modeText, mode === 'photo' && s.modeTextActive]}>📸 {t('scan.photo')}</Text></TouchableOpacity>
          </View>
          <View style={s.viewfinderWrap}>
            {mode === 'barcode' ? (
              <View style={s.viewfinder}>
                <View style={[s.corner, s.tl, { borderColor: colors.primary }]} /><View style={[s.corner, s.tr, { borderColor: colors.primary }]} /><View style={[s.corner, s.bl, { borderColor: colors.primary }]} /><View style={[s.corner, s.br, { borderColor: colors.primary }]} />
              </View>
            ) : (
              <View style={s.photoInstructions}><Text style={s.photoEmoji}>🍽️</Text><Text style={s.photoHint}>{t('scan.photoHint')}</Text><Text style={s.photoHintSub}>{t('scan.photoHintSub')}</Text></View>
            )}
          </View>
          <View style={s.statusWrap}>
            {mode === 'barcode' ? (
              <View style={s.statusPill}>
                {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.statusText}>{scanned ? `✅ ${t('scan.barcodeScanned') || 'Scanned'}` : (t('scan.pointBarcode') || 'Point at barcode')}</Text>}
              </View>
            ) : (
              loading ? <View style={s.statusPill}><ActivityIndicator color={colors.primary} size="small" /><Text style={s.statusText}>{t('scan.analyzing')}</Text></View> : <TouchableOpacity style={s.shutterOuter} onPress={handleTakePhoto} activeOpacity={0.8}><LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.shutterInner}><Text style={s.shutterIcon}>📸</Text></LinearGradient></TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
      <SuccessModal
        visible={showSuccess}
        title={t('common.success')}
        message={`${editedFoods.length} ${t('scan.itemsAdded')} ${t(`tracker.${initialMeal || getAutoMeal()}`)}.`}
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
  noPermText:   { fontSize: 16, textAlign: 'center', marginBottom: 20 },
  permBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  permGrad:     { paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay:      { flex: 1 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12 },
  closeBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closeText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  title:        { fontSize: 18, fontWeight: '700', color: '#fff' },
  modeRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, marginBottom: 8 },
  modePill:     { flex: 1, borderRadius: Radius.full, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  modeText:     { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  modeTextActive:{ color: '#fff' },
  viewfinderWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder:   { width: 260, height: 180 },
  corner:       { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderWidth: CORNER_THICKNESS },
  tl:           { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:           { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:           { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:           { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  photoInstructions: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  photoEmoji:   { fontSize: 48 },
  photoHint:    { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  photoHintSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  statusWrap:   { padding: Spacing.base, paddingBottom: 60, alignItems: 'center' },
  statusPill:   { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  statusText:   { color: '#fff', fontSize: 14, fontWeight: '500' },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  shutterIcon:  { fontSize: 28 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12 },
  capturedImage:{ width: '100%', height: 200, borderRadius: Radius.xl, marginBottom: Spacing.base },
  confidenceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.base },
  confidenceDot:   { width: 8, height: 8, borderRadius: 4 },
  confidenceText:  { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },
  foodCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 8, borderWidth: 1 },
  foodCardLeft:  { flex: 1, marginRight: 12 },
  foodName:      { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  gramInputRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gramInput:     { width: 60, height: 28, borderRadius: 6, borderWidth: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', padding: 0 },
  gramLabel:     { fontSize: 12 },
  foodCardRight: { alignItems: 'flex-end' },
  foodCal:       { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  macroRow:      { flexDirection: 'row', gap: 8 },
  macroTag:      { fontSize: 11, fontWeight: '600' },
  totalCard:     { borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8, borderWidth: 1 },
  totalLabel:    { fontSize: 15, fontWeight: '600' },
  totalValue:    { fontSize: 22, fontWeight: '800' },
  notesText:     { fontSize: 13, marginTop: 8, lineHeight: 20 },
  resultFooter:  { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, paddingBottom: 36 },
  retryBtn:      { flex: 1, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  retryText:     { fontWeight: '600', fontSize: 15 },
  addAllBtn:     { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  addAllGrad:    { paddingVertical: 14, alignItems: 'center' },
  addAllText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
