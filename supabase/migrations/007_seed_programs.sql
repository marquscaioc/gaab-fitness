-- ============================================
-- Migration 007: Seed starter programs
-- ============================================

-- Note: These programs use a system author_id.
-- In production, replace with an actual admin user ID after first signup.
-- For now, we use a function to create them on-demand.

CREATE OR REPLACE FUNCTION public.seed_starter_programs(admin_user_id UUID)
RETURNS void AS $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  p3_id UUID;
  w1_id UUID;
  w2_id UUID;
  w3_id UUID;
  w4_id UUID;
  w5_id UUID;
  w6_id UUID;
BEGIN
  -- Program 1: Beginner Full Body (4 weeks, 3x/week)
  INSERT INTO public.programs (author_id, name, description, category, level, duration_weeks, sessions_per_week, equipment_needed, is_published, participant_count)
  VALUES (admin_user_id, 'Beginner Full Body', 'Perfect for those just starting their fitness journey. Full body workouts 3 times per week with progressive overload.', 'strength', 'beginner', 4, 3, ARRAY['dumbbell', 'body weight'], true, 0)
  RETURNING id INTO p1_id;

  INSERT INTO public.program_weeks (program_id, week_number, name, description) VALUES
    (p1_id, 1, 'Foundation', 'Learn the movements, focus on form'),
    (p1_id, 2, 'Building', 'Increase volume slightly'),
    (p1_id, 3, 'Progression', 'Add weight or reps'),
    (p1_id, 4, 'Peak', 'Test your new strength');

  -- Week 1 sessions
  SELECT id INTO w1_id FROM public.program_weeks WHERE program_id = p1_id AND week_number = 1;
  INSERT INTO public.program_sessions (week_id, session_number, name, estimated_min) VALUES
    (w1_id, 1, 'Full Body A', 45),
    (w1_id, 2, 'Full Body B', 45),
    (w1_id, 3, 'Full Body C', 45);

  -- Program 2: Push/Pull/Legs (8 weeks, 6x/week)
  INSERT INTO public.programs (author_id, name, description, category, level, duration_weeks, sessions_per_week, equipment_needed, is_published, participant_count)
  VALUES (admin_user_id, 'Push/Pull/Legs', 'Classic PPL split for intermediate lifters. Each muscle group hit twice per week for maximum hypertrophy.', 'hypertrophy', 'intermediate', 8, 6, ARRAY['barbell', 'dumbbell', 'cable', 'body weight'], true, 0)
  RETURNING id INTO p2_id;

  INSERT INTO public.program_weeks (program_id, week_number, name) VALUES
    (p2_id, 1, 'Week 1'), (p2_id, 2, 'Week 2'), (p2_id, 3, 'Week 3'), (p2_id, 4, 'Week 4'),
    (p2_id, 5, 'Week 5'), (p2_id, 6, 'Week 6'), (p2_id, 7, 'Week 7'), (p2_id, 8, 'Week 8');

  SELECT id INTO w2_id FROM public.program_weeks WHERE program_id = p2_id AND week_number = 1;
  INSERT INTO public.program_sessions (week_id, session_number, name, estimated_min) VALUES
    (w2_id, 1, 'Push (Chest/Shoulders/Triceps)', 60),
    (w2_id, 2, 'Pull (Back/Biceps)', 60),
    (w2_id, 3, 'Legs (Quads/Hams/Glutes)', 60),
    (w2_id, 4, 'Push B', 55),
    (w2_id, 5, 'Pull B', 55),
    (w2_id, 6, 'Legs B', 55);

  -- Program 3: 5x5 Strength (12 weeks, 3x/week)
  INSERT INTO public.programs (author_id, name, description, category, level, duration_weeks, sessions_per_week, equipment_needed, is_published, participant_count)
  VALUES (admin_user_id, '5x5 Strength', 'Classic 5x5 strength program. Squat, bench, deadlift, overhead press, and barbell row. Add weight every session.', 'strength', 'intermediate', 12, 3, ARRAY['barbell', 'body weight'], true, 0)
  RETURNING id INTO p3_id;

  INSERT INTO public.program_weeks (program_id, week_number, name) VALUES
    (p3_id, 1, 'Week 1'), (p3_id, 2, 'Week 2'), (p3_id, 3, 'Week 3'), (p3_id, 4, 'Week 4'),
    (p3_id, 5, 'Week 5'), (p3_id, 6, 'Week 6'), (p3_id, 7, 'Week 7'), (p3_id, 8, 'Week 8'),
    (p3_id, 9, 'Week 9'), (p3_id, 10, 'Week 10'), (p3_id, 11, 'Week 11'), (p3_id, 12, 'Week 12');

  SELECT id INTO w3_id FROM public.program_weeks WHERE program_id = p3_id AND week_number = 1;
  INSERT INTO public.program_sessions (week_id, session_number, name, estimated_min) VALUES
    (w3_id, 1, 'Workout A (Squat/Bench/Row)', 50),
    (w3_id, 2, 'Workout B (Squat/OHP/Deadlift)', 50),
    (w3_id, 3, 'Workout A (Squat/Bench/Row)', 50);

END;
$$ LANGUAGE plpgsql;
