import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadow } from '../../constants';
import { useAuthStore, useRecipesStore, Recipe } from '../../store';
import { generateRecipes } from '../../services/groq';

export default function RecipesModal() {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuthStore();
  const { recipes, favorites, setRecipes, toggleFav } = useRecipesStore();
  const isPro = profile?.isPro ?? false;

  const loadRecipes = async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const newRecipes = await generateRecipes(profile?.goal ?? 'maintain');
      setRecipes(newRecipes);
    } catch (err) {
      console.error('Failed to load recipes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recipes.length === 0 && isPro) {
      loadRecipes();
    }
  }, [isPro]);

  if (!isPro) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.paywallContainer}>
          <Text style={s.paywallEmoji}>🔒</Text>
          <Text style={s.paywallTitle}>Recipes are a Pro Feature</Text>
          <Text style={s.paywallSub}>Unlock personalized AI-generated recipes to hit your macros perfectly.</Text>
          <TouchableOpacity style={s.proBtn} onPress={() => router.push('/modals/paywall')}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={s.proGrad}>
              <Text style={s.proText}>Unlock Pro Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>AI Recipes</Text>
        <TouchableOpacity onPress={loadRecipes} disabled={loading}>
          <Text style={[s.refresh, loading && { opacity: 0.5 }]}>Refresh ✨</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>Creating personalized recipes...</Text>
          </View>
        ) : (
          <View style={s.list}>
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFav={favorites.includes(recipe.id)}
                onFav={() => toggleFav(recipe.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecipeCard({ recipe, isFav, onFav }: { recipe: Recipe; isFav: boolean; onFav: () => void }) {
  return (
    <View style={rc.card}>
      <View style={rc.info}>
        <View style={rc.headerRow}>
          <Text style={rc.name}>{recipe.name}</Text>
          <TouchableOpacity onPress={onFav}>
            <Text style={rc.favEmoji}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={rc.desc}>{recipe.description}</Text>
        
        <View style={rc.stats}>
          <Text style={rc.statItem}>🕒 {recipe.prepTime} min</Text>
          <Text style={rc.statItem}>🔥 {recipe.calories} kcal</Text>
        </View>

        <View style={rc.macros}>
          <View style={[rc.macroPill, { backgroundColor: Colors.protein + '22' }]}>
            <Text style={[rc.macroText, { color: Colors.protein }]}>P {recipe.protein}g</Text>
          </View>
          <View style={[rc.macroPill, { backgroundColor: Colors.carbs + '22' }]}>
            <Text style={[rc.macroText, { color: Colors.carbs }]}>C {recipe.carbs}g</Text>
          </View>
          <View style={[rc.macroPill, { backgroundColor: Colors.fat + '22' }]}>
            <Text style={[rc.macroText, { color: Colors.fat }]}>F {recipe.fat}g</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  info:      { padding: Spacing.base },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name:      { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  favEmoji:  { fontSize: 20 },
  desc:      { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  stats:     { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statItem:  { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  macros:    { flexDirection: 'row', gap: 8 },
  macroPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  macroText: { fontSize: 12, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  title:            { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  refresh:          { color: Colors.primary, fontWeight: '600' },
  scroll:           { flex: 1 },
  list:             { padding: Spacing.base },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  loadingText:      { marginTop: 16, color: Colors.textSecondary, fontSize: 15 },
  paywallContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  paywallEmoji:     { fontSize: 64, marginBottom: 20 },
  paywallTitle:     { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  paywallSub:       { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  proBtn:           { width: '100%', borderRadius: Radius.md, overflow: 'hidden' },
  proGrad:          { padding: 16, alignItems: 'center' },
  proText:          { color: '#fff', fontWeight: '700', fontSize: 16 },
});
