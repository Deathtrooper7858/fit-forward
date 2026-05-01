/**
 * Fit-Forward Global State — Zustand stores with AsyncStorage persistence
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem } from '../services/foodDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id:              string;
  name:            string;
  email:           string;
  avatarUrl?:      string;
  sex:             'male' | 'female';
  age:             number;
  weight:          number;   // kg
  height:          number;   // cm
  activityLevel:   'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal:            'lose' | 'maintain' | 'gain';
  tdee:            number;
  targetCalories:  number;
  macros:          { protein: number; carbs: number; fat: number };
  restrictions?:   string[];
  preferences?:    string[];
  isPro:           boolean;
  onboardingDone:  boolean;
}

export interface FoodLog {
  id:         string;
  foodItem:   FoodItem;
  grams:      number;
  meal:       'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt:   string;  // ISO date string
  calories:   number;
  protein:    number;
  carbs:      number;
  fat:        number;
}

export interface DailyProgress {
  date:          string;  // YYYY-MM-DD
  totalCalories: number;
  totalProtein:  number;
  totalCarbs:    number;
  totalFat:      number;
  logs:          FoodLog[];
}

export interface CoachMessage {
  id:        string;
  role:      'user' | 'model';
  content:   string;
  imageUrl?: string;
  timestamp: string;
}

export interface BodyMeasurement {
  id:          string;
  date:        string;   // YYYY-MM-DD
  weight?:     number;   // kg
  bodyFat?:    number;   // %
  waist?:      number;   // cm
  hips?:       number;   // cm
  chest?:      number;   // cm
  arms?:       number;   // cm
  legs?:       number;   // cm
  neck?:       number;   // cm
  notes?:      string;
}

export interface Recipe {
  id:           string;
  name:         string;
  description:  string;
  calories:     number;
  protein:      number;
  carbs:        number;
  fat:          number;
  ingredients:  string[];
  instructions: string[];
  imageUrl?:    string;
  prepTime:     number; // minutes
  goal:         'lose' | 'maintain' | 'gain';
  isFavorite:   boolean;
}

export interface ProgressPhoto {
  id:        string;
  uri:       string;
  date:      string; // YYYY-MM-DD
  notes?:    string;
}

// ─── Auth store ───────────────────────────────────────────────────────────────
interface AuthState {
  session:     any | null;
  profile:     UserProfile | null;
  isLoading:   boolean;
  setSession:  (session: any | null) => void;
  setProfile:  (profile: UserProfile | null) => void;
  setLoading:  (v: boolean) => void;
  clearAuth:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session:    null,
      profile:    null,
      isLoading:  true,
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth:  () => set({ session: null, profile: null }),
    }),
    {
      name: 'ff-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile }), // only persist profile, not session
    }
  )
);

// ─── Nutrition / tracker store ────────────────────────────────────────────────
interface NutritionState {
  todayLogs:    FoodLog[];
  waterIntake:  number;      // ml
  selectedDate: string;
  streakDays:   number;
  favoriteFoods: FoodItem[];
  addLog:       (log: FoodLog) => void;
  removeLog:    (id: string) => void;
  setLogs:      (logs: FoodLog[]) => void;
  setWater:     (ml: number) => void;
  addWater:     (ml: number) => void;
  setDate:      (date: string) => void;
  setStreak:    (days: number) => void;
  addFavorite:  (food: FoodItem) => void;
  removeFavorite: (id: string) => void;
  totals: () => { calories: number; protein: number; carbs: number; fat: number };
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      todayLogs:    [],
      waterIntake:  0,
      selectedDate: new Date().toISOString().split('T')[0],
      streakDays:   0,
      favoriteFoods: [],

      addLog:    (log) => set((s) => ({ todayLogs: [...s.todayLogs, log] })),
      removeLog: (id)  => set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) })),
      setLogs:   (logs) => set({ todayLogs: logs }),
      setWater:  (waterIntake) => set({ waterIntake }),
      addWater:  (ml) => set((s) => ({ waterIntake: s.waterIntake + ml })),
      setDate:   (date) => set({ selectedDate: date }),
      setStreak: (streakDays) => set({ streakDays }),
      addFavorite: (food) => set((s) => ({
        favoriteFoods: s.favoriteFoods.find(f => f.id === food.id)
          ? s.favoriteFoods
          : [...s.favoriteFoods, food],
      })),
      removeFavorite: (id) => set((s) => ({
        favoriteFoods: s.favoriteFoods.filter(f => f.id !== id),
      })),

      totals: () => {
        const logs = get().todayLogs;
        return logs.reduce(
          (acc, l) => ({
            calories: acc.calories + l.calories,
            protein:  acc.protein  + l.protein,
            carbs:    acc.carbs    + l.carbs,
            fat:      acc.fat      + l.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
      },
    }),
    {
      name: 'ff-nutrition',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        waterIntake:   s.waterIntake,
        streakDays:    s.streakDays,
        favoriteFoods: s.favoriteFoods,
        // todayLogs: intentionally NOT persisted — reloaded from Supabase on mount
      }),
    }
  )
);

// ─── Coach store ──────────────────────────────────────────────────────────────
interface CoachState {
  messages:    CoachMessage[];
  isTyping:    boolean;
  msgCount:    number;
  lastResetDate: string;
  setMessages: (msgs: CoachMessage[]) => void;
  addMessage:  (msg: CoachMessage) => void;
  setTyping:   (v: boolean) => void;
  incrementCount: () => void;
  resetMessages:  () => void;
  checkAndResetDaily: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      messages:      [],
      isTyping:      false,
      msgCount:      0,
      lastResetDate: new Date().toISOString().split('T')[0],

      setMessages:    (messages) => set({ messages }),
      addMessage:     (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setTyping:      (isTyping) => set({ isTyping }),
      incrementCount: () => set((s) => ({ msgCount: s.msgCount + 1 })),
      resetMessages:  () => set({ messages: [], msgCount: 0 }),
      checkAndResetDaily: () => {
        const today = new Date().toISOString().split('T')[0];
        if (get().lastResetDate !== today) {
          set({ msgCount: 0, lastResetDate: today });
        }
      },
    }),
    {
      name: 'ff-coach',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ msgCount: s.msgCount, lastResetDate: s.lastResetDate }),
    }
  )
);

// ─── Body measurements store ──────────────────────────────────────────────────
interface BodyState {
  measurements:   BodyMeasurement[];
  addMeasurement: (m: BodyMeasurement) => void;
  setMeasurements:(ms: BodyMeasurement[]) => void;
  latest:         () => BodyMeasurement | null;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set, get) => ({
      measurements: [],
      addMeasurement: (m) => set((s) => ({
        measurements: [m, ...s.measurements].sort((a, b) => b.date.localeCompare(a.date)),
      })),
      setMeasurements: (measurements) => set({ measurements }),
      latest: () => get().measurements[0] ?? null,
    }),
    {
      name: 'ff-body',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Recipes store ────────────────────────────────────────────────────────────
interface RecipesState {
  recipes:     Recipe[];
  favorites:   string[]; // IDs
  setRecipes:  (recipes: Recipe[]) => void;
  toggleFav:   (id: string) => void;
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set) => ({
      recipes:    [],
      favorites:  [],
      setRecipes: (recipes) => set({ recipes }),
      toggleFav:  (id) => set((s) => ({
        favorites: s.favorites.includes(id)
          ? s.favorites.filter(fid => fid !== id)
          : [...s.favorites, id],
      })),
    }),
    {
      name: 'ff-recipes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Progress photos store ────────────────────────────────────────────────────
interface ProgressState {
  photos:     ProgressPhoto[];
  addPhoto:   (p: ProgressPhoto) => void;
  setPhotos:  (ps: ProgressPhoto[]) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      photos:   [],
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      setPhotos:(photos) => set({ photos }),
    }),
    {
      name: 'ff-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
