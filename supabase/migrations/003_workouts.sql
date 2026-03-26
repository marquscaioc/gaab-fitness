-- ============================================
-- Migration 003: Workout engine
-- ============================================

-- Reusable workout templates
CREATE TABLE public.workout_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER workout_templates_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.workout_template_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL REFERENCES public.exercises(id),
  sort_order    INT NOT NULL DEFAULT 0,
  default_sets  INT DEFAULT 3,
  default_reps  INT DEFAULT 10,
  rest_seconds  INT DEFAULT 90,
  notes         TEXT
);

-- Active/completed workout sessions
CREATE TABLE public.workout_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name        TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  duration_s  INT,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes       TEXT,
  is_synced   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON public.workout_sessions(user_id, started_at DESC);

CREATE TABLE public.session_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL REFERENCES public.exercises(id),
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_sets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_index           SMALLINT NOT NULL,
  set_type            TEXT NOT NULL DEFAULT 'normal'
                        CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure', 'rest_pause')),
  weight              NUMERIC,
  weight_unit         TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  reps                INT,
  duration_s          INT,
  distance_m          NUMERIC,
  completed           BOOLEAN NOT NULL DEFAULT false,
  rpe                 SMALLINT CHECK (rpe BETWEEN 1 AND 10),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for all workout tables
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Templates: own + public readable
CREATE POLICY "Users can read own and public templates"
  ON public.workout_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage own templates"
  ON public.workout_templates FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Template exercises: via template ownership
CREATE POLICY "Users manage template exercises via template"
  ON public.workout_template_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates
      WHERE workout_templates.id = workout_template_exercises.template_id
      AND (workout_templates.user_id = auth.uid() OR workout_templates.is_public = true)
    )
  );

-- Sessions: own only
CREATE POLICY "Users manage own sessions"
  ON public.workout_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Session exercises: via session ownership
CREATE POLICY "Users manage own session exercises"
  ON public.session_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = session_exercises.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Exercise sets: via session ownership (two joins)
CREATE POLICY "Users manage own exercise sets"
  ON public.exercise_sets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_exercises
      JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id
      WHERE session_exercises.id = exercise_sets.session_exercise_id
      AND workout_sessions.user_id = auth.uid()
    )
  );
