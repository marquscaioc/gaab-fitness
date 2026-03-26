-- ============================================
-- Migration 002: Exercise catalog
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.exercises (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  gif_url           TEXT,
  instructions      TEXT[],
  equipment         TEXT[] NOT NULL DEFAULT '{}',
  body_parts        TEXT[] NOT NULL DEFAULT '{}',
  target_muscles    TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  exercise_type     TEXT,
  mechanics_type    TEXT,
  is_custom         BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GIN indexes for array containment queries
CREATE INDEX idx_exercises_target_muscles ON public.exercises USING GIN (target_muscles);
CREATE INDEX idx_exercises_equipment      ON public.exercises USING GIN (equipment);
CREATE INDEX idx_exercises_body_parts     ON public.exercises USING GIN (body_parts);
CREATE INDEX idx_exercises_secondary      ON public.exercises USING GIN (secondary_muscles);

-- Trigram index for fuzzy name search
CREATE INDEX idx_exercises_name_trgm ON public.exercises USING GIN (name gin_trgm_ops);

-- RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read catalog exercises"
  ON public.exercises FOR SELECT
  TO authenticated
  USING (
    is_custom = false
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create custom exercises"
  ON public.exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    is_custom = true
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own custom exercises"
  ON public.exercises FOR UPDATE
  TO authenticated
  USING (is_custom = true AND created_by = auth.uid())
  WITH CHECK (is_custom = true AND created_by = auth.uid());

CREATE POLICY "Users can delete own custom exercises"
  ON public.exercises FOR DELETE
  TO authenticated
  USING (is_custom = true AND created_by = auth.uid());
