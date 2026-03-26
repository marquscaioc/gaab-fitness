-- GAAB: Create all tables (no drops)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  unit_system TEXT NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric', 'imperial')),
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_premium BOOLEAN NOT NULL DEFAULT false,
  streak_count INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTR(NEW.id::text, 1, 4)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gif_url TEXT,
  instructions TEXT[],
  equipment TEXT[] NOT NULL DEFAULT '{}',
  body_parts TEXT[] NOT NULL DEFAULT '{}',
  target_muscles TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  exercise_type TEXT,
  mechanics_type TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_target_muscles ON public.exercises USING GIN (target_muscles);
CREATE INDEX idx_exercises_equipment ON public.exercises USING GIN (equipment);
CREATE INDEX idx_exercises_body_parts ON public.exercises USING GIN (body_parts);
CREATE INDEX idx_exercises_secondary ON public.exercises USING GIN (secondary_muscles);
CREATE INDEX idx_exercises_name_trgm ON public.exercises USING GIN (name gin_trgm_ops);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read catalog exercises" ON public.exercises FOR SELECT TO authenticated USING (is_custom = false OR created_by = auth.uid());
CREATE POLICY "Users can create custom exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (is_custom = true AND created_by = auth.uid());
CREATE POLICY "Users can update own custom exercises" ON public.exercises FOR UPDATE TO authenticated USING (is_custom = true AND created_by = auth.uid()) WITH CHECK (is_custom = true AND created_by = auth.uid());
CREATE POLICY "Users can delete own custom exercises" ON public.exercises FOR DELETE TO authenticated USING (is_custom = true AND created_by = auth.uid());

CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER workout_templates_updated_at BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id),
  sort_order INT NOT NULL DEFAULT 0,
  default_sets INT DEFAULT 3,
  default_reps INT DEFAULT 10,
  rest_seconds INT DEFAULT 90,
  notes TEXT
);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_s INT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  is_synced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON public.workout_sessions(user_id, started_at DESC);

CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES public.exercises(id),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_index SMALLINT NOT NULL,
  set_type TEXT NOT NULL DEFAULT 'normal' CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure', 'rest_pause')),
  weight NUMERIC,
  weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  reps INT,
  duration_s INT,
  distance_m NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  rpe SMALLINT CHECK (rpe BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own and public templates" ON public.workout_templates FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users can manage own templates" ON public.workout_templates FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage template exercises" ON public.workout_template_exercises FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.workout_templates WHERE workout_templates.id = workout_template_exercises.template_id AND (workout_templates.user_id = auth.uid() OR workout_templates.is_public = true)));
CREATE POLICY "Users manage own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own session exercises" ON public.session_exercises FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.workout_sessions WHERE workout_sessions.id = session_exercises.session_id AND workout_sessions.user_id = auth.uid()));
CREATE POLICY "Users manage own exercise sets" ON public.exercise_sets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.session_exercises JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id WHERE session_exercises.id = exercise_sets.session_exercise_id AND workout_sessions.user_id = auth.uid()));

CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  duration_weeks INT,
  sessions_per_week INT,
  equipment_needed TEXT[],
  cover_image_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  participant_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.program_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  name TEXT,
  description TEXT
);

CREATE TABLE public.program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.program_weeks(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  name TEXT,
  estimated_min INT,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL
);

CREATE TABLE public.program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  current_week INT NOT NULL DEFAULT 1,
  current_session INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published programs" ON public.programs FOR SELECT TO authenticated USING (is_published = true OR author_id = auth.uid());
CREATE POLICY "Authors manage own programs" ON public.programs FOR ALL TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Read program weeks" ON public.program_weeks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.programs WHERE programs.id = program_weeks.program_id AND (programs.is_published = true OR programs.author_id = auth.uid())));
CREATE POLICY "Authors manage program weeks" ON public.program_weeks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.programs WHERE programs.id = program_weeks.program_id AND programs.author_id = auth.uid()));
CREATE POLICY "Read program sessions" ON public.program_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.program_weeks JOIN public.programs ON programs.id = program_weeks.program_id WHERE program_weeks.id = program_sessions.week_id AND (programs.is_published = true OR programs.author_id = auth.uid())));
CREATE POLICY "Authors manage program sessions" ON public.program_sessions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.program_weeks JOIN public.programs ON programs.id = program_weeks.program_id WHERE program_weeks.id = program_sessions.week_id AND programs.author_id = auth.uid()));
CREATE POLICY "Users manage own enrollments" ON public.program_enrollments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INT, water_ml INT, calories_in INT, calories_burned INT,
  weight_kg NUMERIC, body_fat_pct NUMERIC, sleep_minutes INT, hr_resting INT, hrv INT, notes TEXT,
  UNIQUE(user_id, date)
);
CREATE INDEX idx_daily_metrics_user_date ON public.daily_metrics(user_id, date DESC);

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, calories INT, protein_g NUMERIC, carbs_g NUMERIC, fat_g NUMERIC,
  category TEXT CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meals_user_date ON public.meals(user_id, logged_at DESC);

CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES public.exercises(id),
  name TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('weight', 'reps', 'time', 'distance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pr_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES public.personal_records(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL, unit TEXT,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(pr_id, recorded_at)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily metrics" ON public.daily_metrics FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own meals" ON public.meals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own PRs" ON public.personal_records FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own PR values" ON public.pr_values FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.personal_records WHERE personal_records.id = pr_values.pr_id AND personal_records.user_id = auth.uid()));

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('workout_completed', 'pr_achieved', 'streak_milestone', 'program_completed', 'challenge_won', 'manual')),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  pr_id UUID REFERENCES public.personal_records(id) ON DELETE SET NULL,
  content TEXT, media_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feed_posts_created ON public.feed_posts(created_at DESC);

CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT 'fire',
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('volume', 'frequency', 'streak', 'distance', 'custom')),
  target_value NUMERIC, target_unit TEXT,
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own friendships" ON public.friendships FOR SELECT TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users send friend requests" ON public.friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Users update own friendships" ON public.friendships FOR UPDATE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users delete own friendships" ON public.friendships FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users see visible posts" ON public.feed_posts FOR SELECT TO authenticated USING (user_id = auth.uid() OR visibility = 'public' OR (visibility = 'friends' AND EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted' AND ((requester_id = auth.uid() AND addressee_id = feed_posts.user_id) OR (addressee_id = auth.uid() AND requester_id = feed_posts.user_id)))));
CREATE POLICY "Users create own posts" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own posts" ON public.feed_posts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Read reactions" ON public.post_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own reactions" ON public.post_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Read comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone sees challenges" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage challenges" ON public.challenges FOR UPDATE TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Anyone sees participants" ON public.challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage participation" ON public.challenge_participants FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
