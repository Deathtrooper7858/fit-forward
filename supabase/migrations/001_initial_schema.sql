-- ============================================================
-- FitGO — Supabase Database Schema
-- Migration 001: Initial schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  name             TEXT,
  avatar_url       TEXT,
  sex              TEXT CHECK (sex IN ('male', 'female')),
  age              INTEGER,
  weight           NUMERIC(5,2),     -- kg
  height           NUMERIC(5,1),     -- cm
  activity_level   TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             TEXT CHECK (goal IN ('lose','maintain','gain')),
  tdee             INTEGER,
  target_calories  INTEGER,
  macros           JSONB DEFAULT '{"protein":0,"carbs":0,"fat":0}'::jsonb,
  restrictions     TEXT[] DEFAULT '{}',
  preferences      TEXT[] DEFAULT '{}',
  is_pro           BOOLEAN DEFAULT FALSE,
  onboarding_done  BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Foods cache ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.foods (
  id          TEXT PRIMARY KEY,        -- barcode or API ID
  name        TEXT NOT NULL,
  brand       TEXT,
  calories    NUMERIC(8,2),            -- per 100g
  protein     NUMERIC(8,2),
  carbs       NUMERIC(8,2),
  fat         NUMERIC(8,2),
  fiber       NUMERIC(8,2),
  sugar       NUMERIC(8,2),
  sodium      NUMERIC(8,2),
  image_url   TEXT,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Food logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.food_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  food_id     TEXT REFERENCES public.foods(id),
  food_name   TEXT NOT NULL,
  meal        TEXT CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  grams       NUMERIC(8,2) NOT NULL,
  calories    NUMERIC(8,2) NOT NULL,
  protein     NUMERIC(8,2) NOT NULL,
  carbs       NUMERIC(8,2) NOT NULL,
  fat         NUMERIC(8,2) NOT NULL,
  logged_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Body measurements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight          NUMERIC(5,2),         -- kg
  body_fat_pct    NUMERIC(4,1),
  waist_cm        NUMERIC(5,1),
  hip_cm          NUMERIC(5,1),
  chest_cm        NUMERIC(5,1),
  arms_cm         NUMERIC(5,1),
  legs_cm         NUMERIC(5,1),
  neck_cm         NUMERIC(5,1),
  measured_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Meal plans ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  week_start    DATE NOT NULL,
  generated_by  TEXT DEFAULT 'ai',
  raw_ai_text   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id       UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_of_week   TEXT CHECK (day_of_week IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  meal          TEXT CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  name          TEXT NOT NULL,
  calories      INTEGER,
  protein       NUMERIC(6,1),
  carbs         NUMERIC(6,1),
  fat           NUMERIC(6,1),
  notes         TEXT
);

-- ─── Coach conversations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coach_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('user','model')),
  content     TEXT NOT NULL,
  msg_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User subscriptions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  revenuecat_user   TEXT,
  product_id        TEXT,
  status            TEXT CHECK (status IN ('active','cancelled','expired','grace_period')),
  started_at        TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Progress photos ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,
  taken_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Recipes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- NULL = system recipe
  title         TEXT NOT NULL,
  description   TEXT,
  ingredients   JSONB,
  instructions  TEXT[],
  calories      INTEGER,
  protein       NUMERIC(6,1),
  carbs         NUMERIC(6,1),
  fat           NUMERIC(6,1),
  prep_minutes  INTEGER,
  cook_minutes  INTEGER,
  servings      INTEGER DEFAULT 1,
  tags          TEXT[],
  is_pro        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods               ENABLE ROW LEVEL SECURITY;

-- Users: own data only
CREATE POLICY "users_own"       ON public.users               USING (auth.uid() = id);
CREATE POLICY "food_logs_own"   ON public.food_logs           USING (auth.uid() = user_id);
CREATE POLICY "body_meas_own"   ON public.body_measurements   USING (auth.uid() = user_id);
CREATE POLICY "plans_own"       ON public.meal_plans          USING (auth.uid() = user_id);
CREATE POLICY "plan_items_own"  ON public.meal_plan_items     USING (
  plan_id IN (SELECT id FROM public.meal_plans WHERE user_id = auth.uid())
);
CREATE POLICY "coach_own"       ON public.coach_conversations USING (auth.uid() = user_id);
CREATE POLICY "subs_own"        ON public.user_subscriptions  USING (auth.uid() = user_id);
CREATE POLICY "photos_own"      ON public.progress_photos     USING (auth.uid() = user_id);

-- Foods: readable by all authenticated users (shared cache)
CREATE POLICY "foods_read"      ON public.foods               FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "foods_insert"    ON public.foods               FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Recipes: system recipes readable by all; personal recipes by owner
CREATE POLICY "recipes_system"  ON public.recipes             FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON public.food_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_meas_user_date ON public.body_measurements (user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user      ON public.meal_plans (user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_coach_user_date      ON public.coach_conversations (user_id, msg_date DESC);

-- ─── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
