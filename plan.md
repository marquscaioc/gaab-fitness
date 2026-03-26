# GAAB - Implementation Plan

> Zero-conflict execution order. Every step lists its dependencies explicitly.
> Nothing starts until its prerequisites are marked done.

---

## Guiding Rules

1. **Never work on two modules that touch the same table simultaneously.** If two tasks write migrations for the same table, they must be sequential.
2. **Schema first, RLS second, Edge Functions third, UI last.** This order prevents runtime errors from missing tables or unauthorized access.
3. **One migration file per table group.** Don't put `exercises` and `friendships` in the same migration -- they're unrelated and will cause merge conflicts if worked on in parallel.
4. **Types are generated, not handwritten.** After every migration, run `supabase gen types typescript` to produce `src/shared/types/database.ts`. All modules import from this single source of truth.
5. **Feature branches per phase.** Each phase gets its own branch off `main`. Merge only when all tests in that phase pass.

---

## Phase 0: Project Bootstrap

**Goal:** Empty Expo app running on device, connected to a live Supabase project.
**Dependencies:** None.
**Conflict risk:** None -- greenfield.

### Steps

#### 0.1 Fork & Strip Fitly
- Fork `softwave-technology/fitly` into the GAAB org/repo
- Delete all Clerk-related code: `ClerkProvider`, `useAuth`, `useSignIn`, `useSignUp`, `useOAuth`, `utils/cache.ts` (Clerk token cache)
- Delete all screen content (keep empty screen shells for routing structure)
- Delete `assets/data/preWorkouts.json`, `assets/data/exerciseVideos.json`
- Delete `components/DailyQuote.tsx` (ZenQuotes dependency)
- Keep: `app/` route structure, `tailwind.config.js`, `nativewind` setup, `metro.config.js`, `app.json`
- Run `npx expo install` -- fix any broken deps
- Verify blank app launches on iOS simulator + Android emulator

#### 0.2 Install Core Dependencies
```bash
# Remove
npm uninstall @clerk/clerk-expo

# Add
npx expo install @supabase/supabase-js react-native-mmkv
npx expo install @tanstack/react-query
npx expo install expo-image
npm install zustand
```
- Keep existing: `nativewind`, `@shopify/flash-list`, `react-native-paper`, `expo-router`

#### 0.3 Create Supabase Project
- Create project at `app.supabase.com` (region closest to target users)
- Enable extensions: `pg_trgm` (fuzzy search), `pgcrypto` (UUIDs -- enabled by default)
- Save project URL + anon key to `.env`:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```
- Initialize Supabase CLI locally: `supabase init` (creates `supabase/` directory)
- Link to remote: `supabase link --project-ref <ref>`

#### 0.4 Supabase Client Setup
- Create `src/shared/lib/supabase.ts`:
  - Initialize client with MMKV storage adapter (not AsyncStorage)
  - Enable `autoRefreshToken`, `persistSession`
  - Export singleton `supabase` client
- Create `src/shared/lib/mmkv.ts`:
  - Initialize MMKV instance
  - Create `MMKVStorageAdapter` implementing Supabase's `SupportedStorage` interface

#### 0.5 TanStack Query Setup
- Create `src/shared/lib/query-client.ts` with sensible defaults:
  - `staleTime: 5 * 60 * 1000` (5 min)
  - `gcTime: 30 * 60 * 1000` (30 min)
  - Retry: 2 attempts with exponential backoff
- Wrap app root in `QueryClientProvider` in `app/_layout.tsx`

#### 0.6 Verify
- App launches with no errors
- Supabase client connects (test with `supabase.auth.getSession()`)
- MMKV reads/writes work
- TanStack Query devtools visible in dev mode

**Deliverable:** Clean Expo app skeleton connected to Supabase. No features yet.

---

## Phase 1: Auth & Profiles

**Goal:** Users can sign up, sign in, and have a profile.
**Dependencies:** Phase 0 complete.
**Conflict risk:** LOW -- only touches `profiles` table and auth screens.

### Steps

#### 1.1 Database Migration: Profiles
Create `supabase/migrations/001_profiles.sql`:
- `profiles` table (as defined in ARCHITECTURE.md section 2.1)
- Trigger: auto-create profile row on `auth.users` INSERT
- RLS policies:
  - `SELECT`: any authenticated user can read any profile
  - `UPDATE`: users can only update their own profile (`auth.uid() = id`)
  - `INSERT`: handled by trigger only (no direct inserts)

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- Apply migration: `supabase db push`
- Generate types: `supabase gen types typescript --local > src/shared/types/database.ts`

#### 1.2 Supabase Auth Configuration
- Enable email/password provider in Supabase dashboard
- Enable Google OAuth provider (configure OAuth credentials)
- Enable Apple OAuth provider (configure Sign in with Apple)
- Set redirect URLs for OAuth flows
- Configure email templates (confirmation, password reset)

#### 1.3 Auth Module
Create `src/modules/auth/`:
- `hooks/useAuth.ts` -- wraps `supabase.auth` methods: `signUp`, `signIn`, `signOut`, `signInWithOAuth`, `getSession`, `onAuthStateChange`
- `hooks/useSession.ts` -- reactive session state via `onAuthStateChange` listener
- `components/AuthForm.tsx` -- email/password form (reused for sign-in and sign-up)
- `components/OAuthButtons.tsx` -- Google + Apple sign-in buttons
- `utils/auth-guard.tsx` -- redirect hook: unauthenticated -> sign-in, authenticated -> home

#### 1.4 Auth Screens
Wire up existing Fitly route structure:
- `app/(auth)/sign-in.tsx` -- email/password + OAuth. Replace Clerk calls with `supabase.auth.signInWithPassword()` and `supabase.auth.signInWithOAuth()`
- `app/(auth)/sign-up.tsx` -- email/password + username. Call `supabase.auth.signUp({ email, password, options: { data: { username } } })`
- `app/(auth)/onboarding.tsx` -- keep Fitly's 3-step swiper. After completion, update `profiles.onboarding_completed = true`
- `app/_layout.tsx` -- replace ClerkProvider with session check. Redirect based on auth state.

#### 1.5 Profile Module
Create `src/modules/profile/`:
- `hooks/useProfile.ts` -- fetch/update profile via `supabase.from('profiles')`
- `components/ProfileCard.tsx` -- avatar, name, stats display
- `components/SettingsForm.tsx` -- edit unit system, body metrics, fitness level

#### 1.6 Verify
- Sign up with email/password creates account + profile row
- Sign in with Google OAuth works
- Sign out clears session
- Profile fetches and displays correctly
- Onboarding sets `onboarding_completed = true`
- Unauthenticated users cannot access home tabs
- RLS blocks users from updating other users' profiles

**Deliverable:** Full auth flow with profile management.

---

## Phase 2: Exercise Catalog

**Goal:** 1,500+ exercises browsable, searchable, and filterable.
**Dependencies:** Phase 1 (need auth for custom exercises).
**Conflict risk:** LOW -- only touches `exercises` table. No overlap with auth.

### Steps

#### 2.1 Database Migration: Exercises
Create `supabase/migrations/002_exercises.sql`:
- `exercises` table (ARCHITECTURE.md section 2.2)
- GIN indexes on `target_muscles`, `equipment`, `body_parts`
- Enable `pg_trgm` extension + trigram index on `name`
- RLS:
  - `SELECT`: authenticated users can read all where `is_custom = false` OR `created_by = auth.uid()`
  - `INSERT`: authenticated users can insert where `is_custom = true` AND `created_by = auth.uid()`
  - `UPDATE`/`DELETE`: only own custom exercises

#### 2.2 Seed Exercise Data
- Download `exercises.json` from ExerciseDB repo (`bootstrapping-lab/exercisedb-api/src/data/exercises.json`)
- Write a seed script (`supabase/seed.sql` or a Node script) that:
  - Maps ExerciseDB fields to our schema: `exerciseId` -> `id`, `equipments` -> `equipment`, `bodyParts` -> `body_parts`, `targetMuscles` -> `target_muscles`, `secondaryMuscles` -> `secondary_muscles`, `gifUrl` -> `gif_url`
  - Sets `is_custom = false`, `created_by = NULL` for all catalog exercises
- Run seed: `supabase db seed`
- Verify: `SELECT count(*) FROM exercises` returns ~1,500
- Also save a trimmed version to `assets/data/seed-exercises.json` (name + id + muscles only) for offline fallback

#### 2.3 Exercise Module
Create `src/modules/exercises/`:
- `api/exercises.ts`:
  - `getExercises(filters)` -- query with array containment operators
  - `searchExercises(query)` -- use `ilike` with `%query%` or Supabase `.textSearch()`
  - `getExerciseById(id)` -- single fetch
  - `createCustomExercise(data)` -- insert with `is_custom = true`
- `hooks/useExercises.ts` -- TanStack Query wrapper around `getExercises`
- `hooks/useExerciseSearch.ts` -- debounced search with 300ms delay
- `store/exerciseFilterStore.ts` -- Zustand store for current filter state (selected muscles, equipment, body parts)
- `components/ExerciseCard.tsx` -- card with GIF thumbnail (expo-image with caching), name, muscle tags
- `components/ExerciseDetail.tsx` -- full detail view: animated GIF, instructions, muscles, equipment
- `components/ExerciseFilter.tsx` -- multi-select chips for muscles, equipment, body parts
- `components/ExerciseSearch.tsx` -- search bar with instant results

#### 2.4 Exercise Screen
- `app/exercise/[id].tsx` -- exercise detail screen using `ExerciseDetail` component
- Add exercise browsing to the workout tab or a dedicated exercise library accessible from multiple screens

#### 2.5 Constants
Create `src/shared/constants/`:
- `muscles.ts` -- all 49 muscle names as a typed constant array
- `equipment.ts` -- all 28 equipment types
- `bodyParts.ts` -- all 10 body parts
- These come directly from ExerciseDB's reference data

#### 2.6 Verify
- Exercise list loads with pagination (20 per page)
- Filter by muscle (e.g., "chest") returns correct exercises
- Filter by equipment (e.g., "dumbbell") works
- Combined filters work (chest + dumbbell)
- Search "bench press" returns relevant results with typo tolerance
- Exercise detail shows GIF, instructions, muscle/equipment tags
- GIF images cache locally after first load
- Custom exercise creation works and appears in user's list

**Deliverable:** Full exercise catalog with search, filter, and detail views.

---

## Phase 3: Workout Engine (Core)

**Goal:** Users can create templates, start sessions, log sets, and complete workouts.
**Dependencies:** Phase 2 (need exercises). This is the critical path.
**Conflict risk:** MEDIUM -- touches 4 tables. Keep workout tables in a single migration to avoid FK conflicts.

### Steps

#### 3.1 Database Migration: Workout Tables
Create `supabase/migrations/003_workouts.sql`:
- All 4 tables in one migration (they have FK dependencies on each other):
  - `workout_templates`
  - `workout_template_exercises`
  - `workout_sessions`
  - `session_exercises`
  - `exercise_sets`
- Indexes: `idx_sessions_user_date`
- RLS for all 5 tables:
  - All operations scoped to `auth.uid() = user_id`
  - `workout_template_exercises`: access via template ownership (join check)
  - `session_exercises` + `exercise_sets`: access via session ownership (join check)

**Critical RLS for nested tables:**
```sql
-- session_exercises: user can only access if they own the parent session
CREATE POLICY "Users manage own session exercises"
ON session_exercises FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workout_sessions
    WHERE workout_sessions.id = session_exercises.session_id
    AND workout_sessions.user_id = auth.uid()
  )
);

-- exercise_sets: same pattern, two joins deep
CREATE POLICY "Users manage own sets"
ON exercise_sets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM session_exercises
    JOIN workout_sessions ON workout_sessions.id = session_exercises.session_id
    WHERE session_exercises.id = exercise_sets.session_exercise_id
    AND workout_sessions.user_id = auth.uid()
  )
);
```

#### 3.2 Workout Templates Module
Create `src/modules/workouts/`:
- `api/templates.ts`:
  - `getTemplates()` -- fetch user's templates with exercises
  - `createTemplate(data)` -- insert template + exercises in sequence
  - `updateTemplate(id, data)` -- update metadata + replace exercises
  - `deleteTemplate(id)` -- cascade delete
- `hooks/useTemplates.ts` -- TanStack Query CRUD
- `components/TemplateCard.tsx` -- card showing name, category, exercise count
- `components/TemplateForm.tsx` -- create/edit form with exercise picker

#### 3.3 Workout Builder (from Workout.cool)
Port the 3-step wizard logic:
- **Step 1: Equipment Selection** -- multi-select chips from `equipment` constants
- **Step 2: Muscle Selection** -- multi-select chips from `muscles` constants
- **Step 3: Generated Exercises** -- query exercises matching selected equipment + muscles

Port the weighted randomization algorithm:
```typescript
// From Workout.cool: 70% primary muscle, 30% secondary
function generateExercises(
  muscles: string[],
  equipment: string[],
  perMuscle: number = 3
): Exercise[] {
  const results: Exercise[] = [];
  for (const muscle of muscles) {
    const primary = queryExercises({ target_muscles: [muscle], equipment });
    const secondary = queryExercises({ secondary_muscles: [muscle], equipment });
    const weighted = weightedShuffle(primary, secondary, 0.7, 0.3);
    results.push(...weighted.slice(0, perMuscle));
  }
  return fisherYatesShuffle(results);
}
```

Screens:
- `app/workout/builder.tsx` -- 3-step wizard UI
- After generation, user can save as template or start session immediately

#### 3.4 Workout Session Store (offline-first)
Create `src/modules/workouts/store/workoutSessionStore.ts`:
- Zustand store with MMKV persistence middleware
- State shape:
  ```typescript
  interface WorkoutSessionState {
    activeSession: {
      id: string;              // pre-generated UUID
      templateId?: string;
      name: string;
      startedAt: string;
      exercises: {
        id: string;
        exerciseId: string;
        sortOrder: number;
        sets: {
          id: string;
          setIndex: number;
          setType: string;
          weight?: number;
          weightUnit: string;
          reps?: number;
          durationS?: number;
          completed: boolean;
          rpe?: number;
        }[];
      }[];
    } | null;
    isTimerRunning: boolean;
    elapsedSeconds: number;
    // Actions
    startSession: (template?: WorkoutTemplate) => void;
    addExercise: (exerciseId: string) => void;
    removeExercise: (exerciseId: string) => void;
    addSet: (exerciseId: string) => void;
    updateSet: (exerciseId: string, setIndex: number, data: Partial<Set>) => void;
    completeSet: (exerciseId: string, setIndex: number) => void;
    finishSession: () => Promise<void>;
    discardSession: () => void;
  }
  ```
- `finishSession()` calls the `complete-workout` Edge Function
- On app crash/kill, session persists in MMKV and resumes on next launch

#### 3.5 Active Session UI
- `app/workout/session/[id].tsx`:
  - Horizontal exercise navigator (swipe between exercises)
  - Set list per exercise with inline editing (weight, reps, RPE)
  - Add/remove set buttons
  - Elapsed timer in header
  - Rest timer between sets (configurable default from template)
  - "Finish Workout" button -> rating modal -> calls Edge Function
- Components:
  - `SetRow.tsx` -- single set row with weight/reps/duration inputs
  - `ExerciseSetList.tsx` -- list of sets for one exercise
  - `SessionTimer.tsx` -- elapsed time counter
  - `RestTimer.tsx` -- countdown timer between sets (with notification when done)

#### 3.6 Edge Function: complete-workout
Create `supabase/functions/complete-workout/index.ts`:
1. Receive session data from client
2. Insert `workout_sessions` row
3. Insert `session_exercises` rows
4. Insert `exercise_sets` rows
5. Auto-detect PRs: for each exercise, check if any set exceeds the user's existing PR for that exercise
6. Update streak: count consecutive days with sessions, update `profiles.streak_count`
7. Create feed post (if user hasn't disabled auto-posting)
8. Return: session summary, new PRs, streak info

#### 3.7 Offline Sync
Create `src/shared/lib/offline-queue.ts`:
- Queue failed mutations in MMKV with key `offline_queue`
- Listen to network state via `@react-native-community/netinfo`
- On connectivity restored, flush queue sequentially
- Dedup by session UUID (idempotent upserts)

Create Edge Function `supabase/functions/sync-workout-session/index.ts`:
- Accept array of sessions
- Upsert each (ON CONFLICT on session id)
- Return sync results

#### 3.8 Workout History
- `app/workout/history.tsx` -- paginated list of past sessions
- `hooks/useWorkoutHistory.ts` -- infinite scroll query
- Each history item shows: date, name, duration, exercise count, volume

#### 3.9 Verify
- Create template with 4 exercises -> saved to Supabase
- Start session from template -> sets pre-populated
- Log sets (weight + reps) -> data persists in store
- Kill app mid-session -> reopen -> session resumes from MMKV
- Complete session -> data in Supabase, PR detected if applicable
- View workout history -> shows all past sessions
- Airplane mode: complete workout -> reconnect -> session syncs

**Deliverable:** Full workout lifecycle from builder to completion with offline support.

---

## Phase 4: Programs & Enrollment

**Goal:** Multi-week training programs with progression tracking.
**Dependencies:** Phase 3 (needs workout templates and sessions).
**Conflict risk:** LOW -- new tables only, references existing ones via FK.

### Steps

#### 4.1 Database Migration: Programs
Create `supabase/migrations/004_programs.sql`:
- `programs`, `program_weeks`, `program_sessions`, `program_enrollments` (ARCHITECTURE.md section 2.4)
- RLS:
  - Published programs readable by all authenticated users
  - Authors can CRUD their own programs
  - Enrollments scoped to `auth.uid()`

#### 4.2 Programs Module
Create `src/modules/programs/`:
- `api/programs.ts` -- CRUD for programs, weeks, sessions
- `hooks/usePrograms.ts` -- list/filter programs
- `hooks/useEnrollment.ts` -- enrollment state, advance progress
- `components/ProgramCard.tsx` -- cover image, name, level, duration, participants
- `components/WeekView.tsx` -- expandable week with session list
- `components/ProgressBar.tsx` -- enrollment progress visualization

#### 4.3 Edge Function: program-progress
Create `supabase/functions/program-progress/index.ts`:
- On session completion linked to a program session:
  - Increment `completed_sessions` count on enrollment
  - Advance `current_session` (or `current_week` if week complete)
  - Check if program complete -> mark `completed_at`, create feed post
- Return next suggested session

#### 4.4 Screens
- `app/program/[id].tsx` -- program detail with week/session breakdown, enroll button
- `app/program/session/[id].tsx` -- starts a workout session pre-loaded with program exercises

#### 4.5 Seed Programs
Create 3-5 starter programs:
- "Beginner Full Body" (3 days/week, 4 weeks)
- "Push/Pull/Legs" (6 days/week, 8 weeks)
- "5x5 Strength" (3 days/week, 12 weeks)
- Seed via `supabase/migrations/004b_seed_programs.sql`

#### 4.6 Verify
- Browse published programs
- Enroll in program -> enrollment created
- Start program session -> pre-filled workout
- Complete session -> enrollment advances
- Complete all sessions -> program marked complete

**Deliverable:** Training programs with enrollment and progression.

---

## Phase 5: Tracking & Nutrition

**Goal:** Daily health metrics, water, nutrition, step counting, personal records.
**Dependencies:** Phase 1 (profiles). Can run **in parallel with Phase 3-4** since tables are independent.
**Conflict risk:** LOW -- separate tables, no FK to workout tables.

### Steps

#### 5.1 Database Migration: Tracking
Create `supabase/migrations/005_tracking.sql`:
- `daily_metrics` table (ARCHITECTURE.md section 2.5)
- `meals` table (ARCHITECTURE.md section 2.6)
- `personal_records` + `pr_values` tables (ARCHITECTURE.md section 2.5)
- RLS: all scoped to `auth.uid()`

#### 5.2 Tracking Module
Create `src/modules/tracking/`:
- `api/daily-metrics.ts` -- upsert daily metrics (one row per user per day)
- `hooks/useDailyMetrics.ts` -- fetch today's metrics, update individual fields
- `store/dailyMetricsStore.ts` -- Zustand store for quick local updates before sync
- `components/WaterTracker.tsx` -- rewrite Fitly's water tracker (increment buttons, progress ring, bar chart)
- `components/NutritionLog.tsx` -- meal CRUD, daily calorie/macro summary
- `components/StepCounter.tsx` -- reuse Fitly's HealthKit/Pedometer logic, pipe into `daily_metrics.steps`
- `components/BodyMetrics.tsx` -- weight, body fat entry

#### 5.3 Personal Records Module
Create within `src/modules/analytics/`:
- `api/personal-records.ts` -- CRUD PRs and PR values
- `hooks/usePRs.ts` -- list PRs with latest value
- `hooks/usePRHistory.ts` -- time series for a single PR
- `components/PRCard.tsx` -- PR name, current value, trend arrow
- `components/PRChart.tsx` -- line chart of PR values over time
- `components/AddPRModal.tsx` -- create new PR linked to exercise

#### 5.4 Screens
- Dashboard (`app/(tabs)/index.tsx`) -- show today's metrics: steps, water, calories, streak
- `app/settings/nutrition.tsx` -- calorie goal, meal log
- `app/settings/body.tsx` -- BMI/BMR calculator (reuse Fitly's logic), weight log

#### 5.5 Verify
- Log water -> daily_metrics.water_ml updates
- Log meal -> appears in meals table, calories reflected in daily_metrics
- Step count reads from HealthKit/Pedometer and writes to daily_metrics
- Create PR "Bench Press 1RM" -> add values -> chart shows progression
- Dashboard shows all today's metrics

**Deliverable:** Complete daily tracking and personal records.

---

## Phase 6: Analytics & Statistics

**Goal:** Charts and insights from workout history.
**Dependencies:** Phase 3 (workout sessions), Phase 5 (PRs, metrics).
**Conflict risk:** LOW -- read-only aggregation over existing tables.

### Steps

#### 6.1 Edge Function: calculate-statistics
Create `supabase/functions/calculate-statistics/index.ts`:
- Input: `user_id`, `period` (month/quarter/year), `date`
- Queries:
  - Volume over time: `SUM(weight * reps)` per day from `exercise_sets`
  - Workout frequency: `COUNT(DISTINCT date)` per weekday from `workout_sessions`
  - Category duration: `SUM(duration_s)` grouped by template category
  - Muscle heatmap: `COUNT(*)` of sets grouped by exercise's `target_muscles`
  - PR timeline: all `pr_values` ordered by date
- Return aggregated data ready for charting

#### 6.2 Analytics Module
Create `src/modules/analytics/`:
- `api/statistics.ts` -- call Edge Function
- `hooks/useStats.ts` -- TanStack Query wrapper with period/date params
- `components/VolumeChart.tsx` -- line/bar chart of total volume over time
- `components/FrequencyChart.tsx` -- weekday heatmap/bar chart
- `components/MuscleHeatmap.tsx` -- body outline with colored muscle groups
- `components/PRTimeline.tsx` -- multi-line chart of PR progression
- `components/WorkoutStreak.tsx` -- rewrite Fitly's calendar streak (from Supabase data)

#### 6.3 Health Data Import
Create `supabase/functions/import-health-data/index.ts`:
- Port WingFit's `watchparsers.py` to TypeScript:
  - Apple Health XML parser -> extract steps, HR, HRV, sleep
  - Whoop CSV parser -> extract strain, recovery, sleep score
- Upsert into `daily_metrics` table
- Client: `app/settings/integrations.tsx` -- file picker + upload

#### 6.4 Progress Screen
- `app/(tabs)/progress.tsx` -- tab showing:
  - Period selector (week/month/quarter/year)
  - Volume chart
  - Frequency chart
  - Muscle heatmap
  - PR cards with mini sparklines
  - Streak calendar

#### 6.5 Verify
- After 5+ workout sessions, charts populate correctly
- Period switching updates all charts
- PR timeline shows correct progression
- Apple Health import fills daily_metrics
- Muscle heatmap highlights correct muscles

**Deliverable:** Rich analytics dashboard with charts and health data import.

---

## Phase 7: Social Features

**Goal:** Friends, feed, reactions, challenges.
**Dependencies:** Phase 3 (workout sessions for feed posts), Phase 5 (PRs for auto-posts).
**Conflict risk:** MEDIUM -- new tables reference `workout_sessions` and `personal_records`. Must ensure those migrations already ran.

### Steps

#### 7.1 Database Migration: Social
Create `supabase/migrations/007_social.sql`:
- All social tables in one migration:
  - `friendships`
  - `feed_posts`
  - `post_reactions`
  - `post_comments`
  - `challenges`
  - `challenge_participants`
  - `notifications`
- RLS policies (complex):
  - `feed_posts` SELECT: user can see own posts + friends' posts where `visibility != 'private'` + public posts
  - `friendships`: users can see/modify their own friendships
  - `notifications`: users can only read their own
  - `challenges`: participants can read, creator can update
  - `post_reactions`/`post_comments`: authenticated users can read all on visible posts, write their own

**Critical RLS for feed visibility:**
```sql
CREATE POLICY "Users see own + friends' + public posts"
ON feed_posts FOR SELECT USING (
  user_id = auth.uid()                    -- own posts
  OR visibility = 'public'                -- public posts
  OR (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = feed_posts.user_id)
        OR (addressee_id = auth.uid() AND requester_id = feed_posts.user_id)
      )
    )
  )
);
```

#### 7.2 Social Module
Create `src/modules/social/`:
- `api/friendships.ts` -- send/accept/reject/block friend requests
- `api/feed.ts` -- fetch feed (cursor-based pagination via Edge Function)
- `api/reactions.ts` -- toggle reaction on post
- `api/comments.ts` -- CRUD comments
- `api/challenges.ts` -- create/join/leave challenges
- `hooks/useFeed.ts` -- infinite scroll feed
- `hooks/useFriends.ts` -- friend list, pending requests count
- `hooks/useChallenges.ts` -- active challenges with leaderboard
- `store/notificationStore.ts` -- badge count, read state

#### 7.3 Edge Function: social-feed
Create `supabase/functions/social-feed/index.ts`:
- Fetch posts from friends + public, ordered by `created_at DESC`
- Enrich each post with:
  - Author profile (username, avatar)
  - Reaction counts + whether current user reacted
  - Comment count
  - Workout summary (if `post_type = 'workout_completed'`)
  - PR details (if `post_type = 'pr_achieved'`)
- Cursor-based pagination (use `created_at` as cursor)

#### 7.4 Edge Functions: Challenges & Notifications
Create `supabase/functions/update-challenge-progress/index.ts`:
- Called by `complete-workout` when user is in active challenges
- Recalculate user's `current_value` based on challenge type
- Update leaderboard

Create `supabase/functions/send-notification/index.ts`:
- Insert into `notifications` table
- Send push notification via Expo Push API
- Triggered by: friend request, reaction, comment, challenge invite, PR beaten by friend

#### 7.5 Realtime Subscriptions
- Subscribe to `notifications` table changes for current user
- Subscribe to `challenge_participants` for active challenge leaderboard updates
- Manage subscriptions in a global `useRealtimeSubscriptions` hook (subscribe on mount, unsubscribe on unmount)

#### 7.6 Screens
- `app/(tabs)/social.tsx` -- main feed with pull-to-refresh
- `app/social/friends.tsx` -- friend list, search users, pending requests
- `app/social/post/[id].tsx` -- post detail with comments
- `app/social/challenge/[id].tsx` -- challenge detail with leaderboard
- Components:
  - `FeedPost.tsx` -- post card with workout summary / PR badge
  - `ReactionBar.tsx` -- emoji reaction row
  - `CommentList.tsx` -- threaded comments
  - `ChallengeCard.tsx` -- challenge preview with progress bar
  - `LeaderboardRow.tsx` -- rank, avatar, name, value

#### 7.7 Verify
- Send friend request -> recipient sees notification
- Accept friend request -> both users see each other's posts
- Complete workout -> auto-post appears in friends' feeds
- Tap reaction -> count updates in realtime
- Comment on post -> appears for all viewers
- Create challenge -> invite friends -> complete workouts -> leaderboard updates
- Push notification arrives on device

**Deliverable:** Complete social layer with feed, friends, challenges, and notifications.

---

## Phase 8: Polish & Launch

**Goal:** Production-ready app.
**Dependencies:** All prior phases.
**Conflict risk:** LOW -- mostly configuration and optimization.

### Steps

#### 8.1 Premium / Billing
- Integrate RevenueCat SDK
- Define products: monthly/yearly subscription
- Gate premium features: advanced programs, detailed analytics, challenge creation
- Update `profiles.is_premium` via RevenueCat webhook -> Supabase Edge Function

#### 8.2 Performance
- Audit all list screens: ensure FlashList with proper `estimatedItemSize`
- Exercise GIFs: use `expo-image` with `cachePolicy: 'disk'`, show skeleton placeholder
- Lazy load charts: only render when tab is active
- Preload workout session data on template tap (before session screen)

#### 8.3 Error Handling
- Global error boundary in `app/_layout.tsx`
- Toast notifications for failed mutations (via offline queue)
- Retry UI for failed sync operations
- Sentry or Bugsnag integration for crash reporting

#### 8.4 Testing
- Unit tests: utility functions (volume calc, unit conversion, weighted shuffle)
- Integration tests: Supabase Edge Functions (use Supabase test helpers)
- E2E tests: critical flows (sign up, create workout, complete session, view feed) with Detox or Maestro

#### 8.5 App Store Prep
- App icons and splash screen
- Screenshots for App Store / Play Store
- Privacy policy + terms of service
- App Store review guidelines compliance check
- EAS Build configuration for production builds
- OTA update strategy (EAS Update)

#### 8.6 Verify
- Full user journey: sign up -> onboard -> create workout -> complete session -> view stats -> add friend -> see feed
- Offline: airplane mode workout -> reconnect -> everything syncs
- Performance: no jank on exercise list scroll, session timer accurate
- Crash-free: kill app at any point -> state recovers

**Deliverable:** Production-ready GAAB app.

---

## Parallel Execution Map

```
Week   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17
       ┌───────────┐
P0     │ Bootstrap │
       └─────┬─────┘
             │
       ┌─────▼─────┐
P1     │   Auth    │
       └─────┬─────┘
             │
       ┌─────▼─────┐
P2     │ Exercises │
       └─────┬─────┘
             │              ┌─────────────────────┐
       ┌─────▼──────────────▼──┐                  │
P3     │   Workout Engine      │                  │
       └─────┬─────────────────┘                  │
             │                                    │
       ┌─────▼──────────┐  ┌─────▼───────────────┐
P4     │   Programs     │  │ P5: Tracking + PRs  │  (parallel!)
       └─────┬──────────┘  └─────┬───────────────┘
             │                   │
       ┌─────▼───────────────────▼┐
P6     │      Analytics           │
       └─────┬────────────────────┘
             │
       ┌─────▼──────────────────┐
P7     │       Social           │
       └─────┬──────────────────┘
             │
       ┌─────▼─────┐
P8     │  Polish   │
       └───────────┘
```

**Key parallelism:** Phase 5 (Tracking/PRs) can start as soon as Phase 1 (Auth) is done. It runs in parallel with Phases 3-4. This saves ~3 weeks on the critical path.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| ExerciseDB CDN goes down | Bundle `seed-exercises.json` locally as fallback. Cache all viewed GIFs on device. |
| Supabase RLS blocks legitimate queries | Write RLS integration tests for every table before building UI. Use `supabase db test` with pgTAP. |
| MMKV data corruption on crash | Use `MMKV.set()` atomically (single JSON blob per session). Validate on read. |
| OAuth redirect issues on device | Test OAuth on physical iOS + Android devices early (Phase 1). Expo's AuthSession handles deep links. |
| Edge Function cold starts slow | Keep functions small (<50 lines of logic). Use Supabase's always-warm option for `complete-workout`. |
| Social feed RLS query slow at scale | Pre-compute friend lists in a materialized view. Refresh on friend add/remove. |
