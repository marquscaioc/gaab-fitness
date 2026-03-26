-- ============================================
-- Migration 004: Training programs
-- ============================================

CREATE TABLE public.programs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  level             TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  duration_weeks    INT,
  sessions_per_week INT,
  equipment_needed  TEXT[],
  cover_image_url   TEXT,
  is_premium        BOOLEAN NOT NULL DEFAULT false,
  is_published      BOOLEAN NOT NULL DEFAULT false,
  participant_count INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.program_weeks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  name        TEXT,
  description TEXT
);

CREATE TABLE public.program_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id         UUID NOT NULL REFERENCES public.program_weeks(id) ON DELETE CASCADE,
  session_number  INT NOT NULL,
  name            TEXT,
  estimated_min   INT,
  template_id     UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE public.program_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  current_week    INT NOT NULL DEFAULT 1,
  current_session INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);

-- RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published programs"
  ON public.programs FOR SELECT TO authenticated
  USING (is_published = true OR author_id = auth.uid());

CREATE POLICY "Authors manage own programs"
  ON public.programs FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Read program weeks for accessible programs"
  ON public.program_weeks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE programs.id = program_weeks.program_id
      AND (programs.is_published = true OR programs.author_id = auth.uid())
    )
  );

CREATE POLICY "Authors manage program weeks"
  ON public.program_weeks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE programs.id = program_weeks.program_id
      AND programs.author_id = auth.uid()
    )
  );

CREATE POLICY "Read program sessions for accessible programs"
  ON public.program_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_weeks
      JOIN public.programs ON programs.id = program_weeks.program_id
      WHERE program_weeks.id = program_sessions.week_id
      AND (programs.is_published = true OR programs.author_id = auth.uid())
    )
  );

CREATE POLICY "Authors manage program sessions"
  ON public.program_sessions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_weeks
      JOIN public.programs ON programs.id = program_weeks.program_id
      WHERE program_weeks.id = program_sessions.week_id
      AND programs.author_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own enrollments"
  ON public.program_enrollments FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
