-- ============================================
-- Migration 005: Tracking, nutrition, PRs
-- ============================================

CREATE TABLE public.daily_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  steps           INT,
  water_ml        INT,
  calories_in     INT,
  calories_burned INT,
  weight_kg       NUMERIC,
  body_fat_pct    NUMERIC,
  sleep_minutes   INT,
  hr_resting      INT,
  hrv             INT,
  notes           TEXT,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_metrics_user_date ON public.daily_metrics(user_id, date DESC);

CREATE TABLE public.meals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  calories    INT,
  protein_g   NUMERIC,
  carbs_g     NUMERIC,
  fat_g       NUMERIC,
  category    TEXT CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meals_user_date ON public.meals(user_id, logged_at DESC);

CREATE TABLE public.personal_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES public.exercises(id),
  name        TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('weight', 'reps', 'time', 'distance')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pr_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id       UUID NOT NULL REFERENCES public.personal_records(id) ON DELETE CASCADE,
  value       NUMERIC NOT NULL,
  unit        TEXT,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(pr_id, recorded_at)
);

-- RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily metrics"
  ON public.daily_metrics FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own meals"
  ON public.meals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own PRs"
  ON public.personal_records FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own PR values"
  ON public.pr_values FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_records
      WHERE personal_records.id = pr_values.pr_id
      AND personal_records.user_id = auth.uid()
    )
  );
