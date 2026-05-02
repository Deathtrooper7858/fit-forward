import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { getFoodByBarcode } from '../../services/foodDatabase';
import { analyzeFoodPhoto } from '../../services/groq';
import { useNutritionStore, useSettingsStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';

type ScanMode = 'barcode' | 'photo';

export default function ScanModal() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [mode, setMode]                 = useState<ScanMode>('barcode');
  const [photoResult, setPhotoResult]   = useState<{
    foods: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }[];
    totalCalories: number;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  } | null>(null);
  const [capturedUri, setCapturedUri]    = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { addLog } = useNutritionStore();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  // ─── Barcode handler ─────────────────────────────────────────────────────────
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

      // Navigate to food detail to confirm and add
      router.replace({
        pathname: '/modals/food-detail',
        params: { foodJson: JSON.stringify(food) },
      });
    } catch {
      setLoading(false);
      Alert.alert(t('common.error'), t('scan.lookupFailed') || 'Failed to look up barcode. Please try again.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  // ─── Photo capture handler ──────────────────────────────────────────────────
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
    } catch (err: any) {
      console.error('Analysis Error:', err);
      Alert.alert('Analysis Failed', `Could not analyze the food photo.\n\nError: ${err?.message || err}`, [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Add all detected foods to tracker ──────────────────────────────────────
  const handleAddAllFoods = () => {
    if (!photoResult) return;

    photoResult.foods.forEach((food) => {
      addLog({
        id:       `${Date.now()}-${food.name}`,
        foodItem: {
          id:       `ai-${Date.now()}-${food.name}`,
          name:     food.name,
          calories: Math.round((food.calories / food.grams) * 100),
          protein:  Math.round((food.protein / food.grams) * 100),
          carbs:    Math.round((food.carbs / food.grams) * 100),
          fat:      Math.round((food.fat / food.grams) * 100),
          source:   'custom',
        },
        grams:    food.grams,
        meal:     getAutoMeal(),
        loggedAt: new Date().toISOString(),
        calories: food.calories,
        protein:  food.protein,
        carbs:    food.carbs,
        fat:      food.fat,
      });
    });

    Alert.alert(
      t('common.success') + ' ✅',
      `${photoResult.foods.length} ${t('scan.itemsAdded')} ${t(`tracker.${getAutoMeal()}`)}.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const getAutoMeal = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
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

  // ─── Permission screens ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.noPermText}>{t('scan.noPermission')}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.permGrad}>
            <Text style={s.permBtnText}>{t('scan.grantPermission')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Photo result screen ────────────────────────────────────────────────────
  if (photoResult && capturedUri) {
    const confidenceColor = photoResult.confidence === 'high'
      ? colors.success
      : photoResult.confidence === 'medium'
        ? colors.warning
        : colors.error;

    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.resultHeader, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t('scan.analysisTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
          {/* Captured image */}
          <Image source={{ uri: capturedUri }} style={s.capturedImage} resizeMode="cover" />

          {/* Confidence badge */}
          <View style={[s.confidenceBadge, { borderColor: confidenceColor }]}>
            <View style={[s.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={[s.confidenceText, { color: confidenceColor }]}>
              {photoResult.confidence.toUpperCase()} {t('scan.confidence')}
            </Text>
          </View>

          {/* Detected foods */}
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('scan.detectedFoods')}</Text>
          {photoResult.foods.map((food, i) => (
            <View key={i} style={[s.foodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.foodCardLeft}>
                <Text style={[s.foodName, { color: colors.textPrimary }]}>{food.name}</Text>
                <Text style={[s.foodGrams, { color: colors.textMuted }]}>{food.grams}g</Text>
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

          {/* Total */}
          <LinearGradient colors={colors.theme === 'dark' ? ['#7C5CFC15', '#22D3EE11'] : [colors.primary + '10', colors.secondary + '05']} style={[s.totalCard, { borderColor: colors.primary + '33' }]}>
            <Text style={[s.totalLabel, { color: colors.textSecondary }]}>{t('scan.totalCalories')}</Text>
            <Text style={[s.totalValue, { color: colors.accent }]}>{photoResult.totalCalories} kcal</Text>
          </LinearGradient>

          {/* Notes */}
          {photoResult.notes && (
            <Text style={[s.notesText, { color: colors.textSecondary }]}>💡 {photoResult.notes}</Text>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={[s.resultFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[s.retryBtn, { borderColor: colors.border }]} onPress={resetPhoto}>
            <Text style={[s.retryText, { color: colors.textSecondary }]}>📷 {t('scan.retake')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addAllBtn} onPress={handleAddAllFoods} activeOpacity={0.85}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.addAllGrad}>
              <Text style={s.addAllText}>{t('scan.addAll', { meal: t(`tracker.${getAutoMeal()}`) })}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Camera view ────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcode : undefined}
        barcodeScannerSettings={mode === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'] } : undefined}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>{mode === 'barcode' ? t('scan.barcodeTitle') : t('scan.photoTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          <TouchableOpacity
            style={[s.modePill, mode === 'barcode' && { borderColor: colors.primary, backgroundColor: 'rgba(124,92,252,0.3)' }]}
            onPress={() => { setMode('barcode'); setScanned(false); }}
          >
            <Text style={[s.modeText, mode === 'barcode' && s.modeTextActive]}>🔍 {t('scan.barcode')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modePill, mode === 'photo' && { borderColor: colors.primary, backgroundColor: 'rgba(124,92,252,0.3)' }]}
            onPress={() => { setMode('photo'); setScanned(false); }}
          >
            <Text style={[s.modeText, mode === 'photo' && s.modeTextActive]}>📸 {t('scan.photo')}</Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder (barcode mode) or instructions (photo mode) */}
        <View style={s.viewfinderWrap}>
          {mode === 'barcode' ? (
            <View style={s.viewfinder}>
              <View style={[s.corner, s.tl, { borderColor: colors.primary }]} />
              <View style={[s.corner, s.tr, { borderColor: colors.primary }]} />
              <View style={[s.corner, s.bl, { borderColor: colors.primary }]} />
              <View style={[s.corner, s.br, { borderColor: colors.primary }]} />
            </View>
          ) : (
            <View style={s.photoInstructions}>
              <Text style={s.photoEmoji}>🍽️</Text>
              <Text style={s.photoHint}>{t('scan.photoHint')}</Text>
              <Text style={s.photoHintSub}>{t('scan.photoHintSub')}</Text>
            </View>
          )}
        </View>

        {/* Status / shutter button */}
        <View style={s.statusWrap}>
          {mode === 'barcode' ? (
            <>
              {loading ? (
                <View style={s.statusPill}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={s.statusText}>{t('scan.lookingUp')}</Text>
                </View>
              ) : scanned ? (
                <View style={s.statusPill}>
                  <Text style={s.statusText}>✅ {t('scan.barcodeScanned') || 'Scanned'}</Text>
                </View>
              ) : (
                <View style={s.statusPill}>
                  <Text style={s.statusText}>{t('scan.pointBarcode') || 'Point at barcode'}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {loading ? (
                <View style={s.statusPill}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={s.statusText}>{t('scan.analyzing')}</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.shutterOuter} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.shutterInner}>
                    <Text style={s.shutterIcon}>📸</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
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

  // Mode toggle
  modeRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.base, marginBottom: 8 },
  modePill:     { flex: 1, borderRadius: Radius.full, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  modeText:     { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  modeTextActive:{ color: '#fff' },

  // Viewfinder
  viewfinderWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder:   { width: 260, height: 180 },
  corner:       { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderWidth: CORNER_THICKNESS },
  tl:           { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr:           { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl:           { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  br:           { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  // Photo mode instructions
  photoInstructions: { alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  photoEmoji:   { fontSize: 48 },
  photoHint:    { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  photoHintSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  // Bottom area
  statusWrap:   { padding: Spacing.base, paddingBottom: 60, alignItems: 'center' },
  statusPill:   { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  statusText:   { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Shutter button
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  shutterIcon:  { fontSize: 28 },

  // ── Result screen ──────────────────────────────────────────────────────────
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 56, paddingBottom: 12 },
  capturedImage:{ width: '100%', height: 200, borderRadius: Radius.xl, marginBottom: Spacing.base },

  confidenceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.base },
  confidenceDot:   { width: 8, height: 8, borderRadius: 4 },
  confidenceText:  { fontSize: 12, fontWeight: '700' },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.md },

  foodCard:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 8, borderWidth: 1 },
  foodCardLeft:  { flex: 1, marginRight: 12 },
  foodName:      { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  foodGrams:     { fontSize: 12 },
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
