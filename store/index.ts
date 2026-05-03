/**
 * FitGO Global State — Zustand stores with AsyncStorage persistence
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem } from '../services/foodDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'en' | 'es' | 'fr' | 'pt' | 'it' | 'de' | 'ru';

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
  role:            'user' | 'admin' | 'super_admin';
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
  sugar?:     number;
  fiber?:     number;
  sodium?:    number;
  iron?:      number;
  saturatedFat?: number;
  transFat?:     number;
}

export interface ActivityLog {
  id:         string;
  name:       string;
  icon:       string;
  calories:   number;
  duration:   number;   // minutes
  loggedAt:   string;   // ISO date string
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
  dailyWater:    Record<string, number>; // date -> ml
  dailySteps:    Record<string, number>; // date -> steps
  dailySleep:    Record<string, number>; // date -> hours
  activityCals:  number;
  activityLogs: ActivityLog[];
  addLog:       (log: FoodLog) => void;
  removeLog:    (id: string) => void;
  updateLog:    (id: string, updates: Partial<FoodLog>) => void;
  setLogs:      (logs: FoodLog[]) => void;
  setWater:     (ml: number) => void;
  addWater:     (ml: number) => void;
  setDate:      (date: string) => void;
  setStreak:    (days: number) => void;
  setSteps:     (steps: number) => void;
  addSteps:     (steps: number) => void;
  setSleep:     (hours: number) => void;
  setActivity:  (cals: number) => void;
  addActivityLog: (activity: ActivityLog) => void;
  removeActivityLog: (id: string) => void;
  updateActivityLog: (id: string, updates: Partial<ActivityLog>) => void;
  setActivityLogs: (activities: ActivityLog[]) => void;
  dailyNeat:     Record<string, string>;
  dailyExercise: Record<string, string>;
  setNeat:      (level: string) => void;
  setExerciseLevel: (level: string) => void;
  addFavorite:  (food: FoodItem) => void;
  removeFavorite: (id: string) => void;
  totals: () => { 
    calories: number; protein: number; carbs: number; fat: number;
    sugar: number; fiber: number; sodium: number; iron: number; saturatedFat: number; transFat: number;
  };
  fetchLogs: (userId: string, date: string) => Promise<void>;
  reset: () => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      todayLogs:    [],
      waterIntake:  0,
      selectedDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
      streakDays:   0,
      dailyWater:   {},
      dailySteps:   {},
      dailySleep:   {},
      activityCals: 0,
      dailyNeat:     {},
      dailyExercise: {},
      activityLogs: [],
      favoriteFoods: [],

      addLog:    (log) => set((s) => ({ todayLogs: [...s.todayLogs, log] })),
      removeLog: (id)  => set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) })),
      updateLog: (id, updates) => set((s) => ({
        todayLogs: s.todayLogs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      })),
      setLogs:   (logs) => set({ todayLogs: logs }),
      setWater:  (ml) => set((s) => ({ dailyWater: { ...s.dailyWater, [s.selectedDate]: ml } })),
      addWater:  (ml) => set((s) => ({ 
        dailyWater: { ...s.dailyWater, [s.selectedDate]: (s.dailyWater[s.selectedDate] || 0) + ml } 
      })),
      setDate:   (date) => set({ selectedDate: date }),
      setStreak: (streakDays) => set({ streakDays }),
      setSteps:  (steps) => set((s) => ({ dailySteps: { ...s.dailySteps, [s.selectedDate]: steps } })),
      addSteps:  (steps) => set((s) => ({ 
        dailySteps: { ...s.dailySteps, [s.selectedDate]: Math.max(0, (s.dailySteps[s.selectedDate] || 0) + steps) } 
      })),
      setSleep:  (hours) => set((s) => ({ dailySleep: { ...s.dailySleep, [s.selectedDate]: hours } })),
      setActivity: (activityCals) => set({ activityCals }),
      addActivityLog: (activity) => set((s) => ({ activityLogs: [...s.activityLogs, activity] })),
      removeActivityLog: (id) => set((s) => ({ activityLogs: s.activityLogs.filter(a => a.id !== id) })),
      updateActivityLog: (id, updates) => set((s) => ({
        activityLogs: s.activityLogs.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      setActivityLogs: (activityLogs) => set({ activityLogs }),
      setNeat:     (level) => set((s) => ({ dailyNeat: { ...s.dailyNeat, [s.selectedDate]: level } })),
      setExerciseLevel: (level) => set((s) => ({ dailyExercise: { ...s.dailyExercise, [s.selectedDate]: level } })),
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
            sugar:    acc.sugar    + (l.sugar || 0),
            fiber:    acc.fiber    + (l.fiber || 0),
            sodium:   acc.sodium   + (l.sodium || 0),
            iron:     acc.iron     + (l.iron || 0),
            saturatedFat: acc.saturatedFat + (l.saturatedFat || 0),
            transFat:     acc.transFat     + (l.transFat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0, iron: 0, saturatedFat: 0, transFat: 0 }
        );
      },

      fetchLogs: async (userId, date) => {
        const { supabase } = await import('../services/supabase');
        const { data, error } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('logged_at', date);

      if (data && !error) {
        const formattedLogs = data.map((d: any) => ({
          id:        d.id,
          foodItem:  {
            id:       d.food_id ?? d.id,
            name:     d.food_name,
            calories: d.grams > 0 ? Math.round((d.calories / d.grams) * 100) : d.calories,
            protein:  d.grams > 0 ? Math.round((d.protein  / d.grams) * 100) : d.protein,
            carbs:    d.grams > 0 ? Math.round((d.carbs    / d.grams) * 100) : d.carbs,
            fat:      d.grams > 0 ? Math.round((d.fat      / d.grams) * 100) : d.fat,
            sugar:    d.grams > 0 ? Math.round((d.sugar    / d.grams) * 100) : d.sugar,
            fiber:    d.grams > 0 ? Math.round((d.fiber    / d.grams) * 100) : d.fiber,
            sodium:   d.grams > 0 ? Math.round((d.sodium   / d.grams) * 100) : d.sodium,
            iron:     d.grams > 0 ? Math.round((d.iron     / d.grams) * 100) : d.iron,
            saturatedFat: d.grams > 0 ? Math.round((d.saturated_fat / d.grams) * 100) : d.saturated_fat,
            transFat:     d.grams > 0 ? Math.round((d.trans_fat     / d.grams) * 100) : d.trans_fat,
            source:   'custom',
          },
          grams:    d.grams,
          meal:     d.meal,
          loggedAt: d.created_at || d.logged_at,
          calories: d.calories,
          protein:  d.protein,
          carbs:    d.carbs,
          fat:      d.fat,
          sugar:    d.sugar,
          fiber:    d.fiber,
          sodium:   d.sodium,
          iron:     d.iron,
          saturatedFat: d.saturated_fat,
          transFat:     d.trans_fat,
        }));
        set({ todayLogs: formattedLogs as any });
      }
      },
      reset: () => set({
        todayLogs: [],
        waterIntake: 0,
        streakDays: 0,
        dailyWater: {},
        dailySteps: {},
        dailySleep: {},
        activityCals: 0,
        dailyNeat: {},
        dailyExercise: {},
        activityLogs: [],
        favoriteFoods: [],
      }),
    }),
    {
      name: 'ff-nutrition',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        streakDays:    s.streakDays,
        dailyWater:    s.dailyWater,
        dailySteps:    s.dailySteps,
        dailySleep:    s.dailySleep,
        activityCals:  s.activityCals,
        dailyNeat:     s.dailyNeat,
        dailyExercise: s.dailyExercise,
        activityLogs:  s.activityLogs,
        favoriteFoods: s.favoriteFoods,
        // todayLogs: intentionally NOT persisted — reloaded from Supabase on mount
      }),
    }
  )
);

// ─── Coach store ──────────────────────────────────────────────────────────────
interface CoachSession {
  id: string;
  title: string;
  created_at: string;
}

interface CoachState {
  nutritionistMessages: CoachMessage[];
  trainerMessages:      CoachMessage[];
  nutritionistSessions: CoachSession[];
  trainerSessions:      CoachSession[];
  currentNutritionistSessionId: string | null;
  currentTrainerSessionId:      string | null;
  isTyping:    boolean;
  msgCount:    number;
  lastResetDate: string;
  setMessages: (msgs: CoachMessage[], type: 'nutritionist' | 'trainer') => void;
  addMessage:  (msg: CoachMessage, type: 'nutritionist' | 'trainer') => void;
  setSessions: (sessions: CoachSession[], type: 'nutritionist' | 'trainer') => void;
  setCurrentSessionId: (id: string | null, type: 'nutritionist' | 'trainer') => void;
  setTyping:   (v: boolean) => void;
  incrementCount: () => void;
  resetMessages:  (type: 'nutritionist' | 'trainer') => void;
  checkAndResetDaily: () => void;
  resetAll: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      nutritionistMessages: [],
      trainerMessages:      [],
      nutritionistSessions: [],
      trainerSessions:      [],
      currentNutritionistSessionId: null,
      currentTrainerSessionId:      null,
      isTyping:      false,
      msgCount:      0,
      lastResetDate: new Date().toISOString().split('T')[0],

      setMessages: (messages, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: messages
      })),
      addMessage: (msg, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: [
          ...(type === 'nutritionist' ? s.nutritionistMessages : s.trainerMessages),
          msg
        ]
      })),
      setSessions: (sessions, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistSessions' : 'trainerSessions']: sessions
      })),
      setCurrentSessionId: (id, type) => set((s) => ({
        [type === 'nutritionist' ? 'currentNutritionistSessionId' : 'currentTrainerSessionId']: id
      })),
      setTyping:      (isTyping) => set({ isTyping }),
      incrementCount: () => set((s) => ({ msgCount: s.msgCount + 1 })),
      resetMessages: (type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: []
      })),
      checkAndResetDaily: () => {
        const today = new Date().toISOString().split('T')[0];
        if (get().lastResetDate !== today) {
          set({ msgCount: 0, lastResetDate: today });
        }
      },
      resetAll: () => set({
        nutritionistMessages: [],
        trainerMessages: [],
        nutritionistSessions: [],
        trainerSessions: [],
        currentNutritionistSessionId: null,
        currentTrainerSessionId: null,
        msgCount: 0,
      }),
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
  reset:          () => void;
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
      reset: () => set({ measurements: [] }),
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
  reset:       () => void;
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
      reset: () => set({ recipes: [], favorites: [] }),
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
  reset:      () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      photos:   [],
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      setPhotos:(photos) => set({ photos }),
      reset: () => set({ photos: [] }),
    }),
    {
      name: 'ff-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Settings store ───────────────────────────────────────────────────────────
interface SettingsState {
  theme: ThemeMode;
  language: AppLanguage;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'ff-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
