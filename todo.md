# GAAB - Master Task List

> Work top-to-bottom. Do not skip ahead. Check off each item as done.
> Items marked `[PARALLEL]` can run simultaneously with the previous group.
> Items marked `[BLOCKED BY: X]` cannot start until task X is done.

---

## Phase 0: Project Bootstrap

### 0A - Repo Setup
- [ ] **T-001** Fork `softwave-technology/fitly` to GAAB repo
- [ ] **T-002** Remove Clerk: delete `ClerkProvider` from `app/_layout.tsx`
- [ ] **T-003** Remove Clerk: delete `useAuth`, `useSignIn`, `useSignUp`, `useOAuth` calls from all auth screens
- [ ] **T-004** Remove Clerk: delete `utils/cache.ts` (Clerk token cache using expo-secure-store)
- [ ] **T-005** Remove Clerk: `npm uninstall @clerk/clerk-expo`
- [ ] **T-006** Delete `assets/data/preWorkouts.json`
- [ ] **T-007** Delete `assets/data/exerciseVideos.json`
- [ ] **T-008** Delete `components/DailyQuote.tsx` and remove from Dashboard
- [ ] **T-009** Gut screen files: keep route shells (`export default function Screen() { return null }`) for all screens
- [ ] **T-010** Remove `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from `.env` / `app.json`
- [ ] **T-011** Run `npx expo install --fix` to resolve broken deps
- [ ] **T-012** Verify app compiles and launches blank on iOS simulator
- [ ] **T-013** Verify app compiles and launches blank on Android emulator

### 0B - Dependencies [BLOCKED BY: T-011]
- [ ] **T-014** `npx expo install @supabase/supabase-js`
- [ ] **T-015** `npx expo install react-native-mmkv`
- [ ] **T-016** `npx expo install @tanstack/react-query`
- [ ] **T-017** `npx expo install expo-image`
- [ ] **T-018** `npm install zustand` (if not already from Fitly)
- [ ] **T-019** `npx expo install @react-native-community/netinfo` (for offline detection)
- [ ] **T-020** Verify all deps resolve: `npx expo doctor`

### 0C - Supabase Project [PARALLEL with 0B]
- [ ] **T-021** Create Supabase project at app.supabase.com
- [ ] **T-022** Enable `pg_trgm` extension: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- [ ] **T-023** Save project URL + anon key to `.env`
- [ ] **T-024** Install Supabase CLI locally: `npm install -D supabase`
- [ ] **T-025** Run `npx supabase init` in project root
- [ ] **T-026** Run `npx supabase link --project-ref <ref>`

### 0D - Client Infrastructure [BLOCKED BY: T-020, T-026]
- [ ] **T-027** Create `src/shared/lib/mmkv.ts` -- MMKV instance + Supabase storage adapter
- [ ] **T-028** Create `src/shared/lib/supabase.ts` -- Supabase client with MMKV adapter
- [ ] **T-029** Create `src/shared/lib/query-client.ts` -- TanStack Query client with defaults
- [ ] **T-030** Update `app/_layout.tsx` -- wrap app in `QueryClientProvider`
- [ ] **T-031** Verify Supabase connection: call `supabase.auth.getSession()` on app launch, log result
- [ ] **T-032** Verify MMKV: write and read a test key/value pair

---

## Phase 1: Auth & Profiles

### 1A - Database [BLOCKED BY: T-026]
- [ ] **T-033** Write `supabase/migrations/001_profiles.sql`:
  - `profiles` table with all columns from ARCHITECTURE.md 2.1
  - `handle_new_user()` trigger function
  - `on_auth_user_created` trigger on `auth.users`
  - RLS: SELECT any, UPDATE own, no direct INSERT
- [ ] **T-034** Run `npx supabase db push` to apply migration
- [ ] **T-035** Run `npx supabase gen types typescript --local > src/shared/types/database.ts`
- [ ] **T-036** Verify in Supabase dashboard: `profiles` table exists with correct columns

### 1B - Auth Providers [PARALLEL with 1A]
- [ ] **T-037** Enable email/password auth in Supabase dashboard
- [ ] **T-038** Configure Google OAuth provider (create OAuth app, set client ID/secret in Supabase)
- [ ] **T-039** Configure Apple OAuth provider (configure in Apple Developer + Supabase)
- [ ] **T-040** Set OAuth redirect URLs for Expo deep links

### 1C - Auth Module [BLOCKED BY: T-035, T-037]
- [ ] **T-041** Create `src/modules/auth/hooks/useSession.ts` -- `onAuthStateChange` listener, reactive session
- [ ] **T-042** Create `src/modules/auth/hooks/useAuth.ts` -- `signUp`, `signIn`, `signOut`, `signInWithOAuth`
- [ ] **T-043** Create `src/modules/auth/components/AuthForm.tsx` -- email + password inputs, submit button
- [ ] **T-044** Create `src/modules/auth/components/OAuthButtons.tsx` -- Google + Apple buttons
- [ ] **T-045** Create `src/modules/auth/utils/auth-guard.tsx` -- redirect based on session state

### 1D - Auth Screens [BLOCKED BY: T-043, T-044, T-045]
- [ ] **T-046** Build `app/(auth)/sign-in.tsx` -- AuthForm + OAuthButtons, call `signInWithPassword` / `signInWithOAuth`
- [ ] **T-047** Build `app/(auth)/sign-up.tsx` -- AuthForm with username field, call `signUp` with user metadata
- [ ] **T-048** Build `app/(auth)/onboarding.tsx` -- reuse Fitly swiper, add fitness goal + body metrics steps
- [ ] **T-049** Update `app/_layout.tsx` -- auth guard: redirect to auth or home based on session
- [ ] **T-050** Update `app/(auth)/_layout.tsx` -- redirect signed-in users to home

### 1E - Profile [BLOCKED BY: T-035, T-041]
- [ ] **T-051** Create `src/modules/profile/hooks/useProfile.ts` -- fetch + update own profile
- [ ] **T-052** Create `src/modules/profile/components/ProfileCard.tsx` -- avatar, name, basic stats
- [ ] **T-053** Create `src/modules/profile/components/SettingsForm.tsx` -- unit system, fitness level, body metrics
- [ ] **T-054** Build `app/(tabs)/profile.tsx` -- profile view with settings
- [ ] **T-055** Build `app/settings/body.tsx` -- BMI/BMR calculator (port from Fitly `bmi.tsx`)

### 1F - Verification
- [ ] **T-056** Test: sign up with email -> profile row created automatically
- [ ] **T-057** Test: sign in with Google OAuth -> redirect to home
- [ ] **T-058** Test: sign out -> redirect to sign-in
- [ ] **T-059** Test: update profile (username, unit system) -> persists in DB
- [ ] **T-060** Test: RLS blocks updating another user's profile
- [ ] **T-061** Test: unauthenticated request to profiles -> blocked

---

## Phase 2: Exercise Catalog

### 2A - Database [BLOCKED BY: T-034]
- [ ] **T-062** Write `supabase/migrations/002_exercises.sql`:
  - `exercises` table with all columns from ARCHITECTURE.md 2.2
  - GIN indexes on `target_muscles`, `equipment`, `body_parts`
  - `pg_trgm` index on `name`
  - RLS: SELECT all catalog + own custom, INSERT/UPDATE/DELETE own custom only
- [ ] **T-063** Run `npx supabase db push`
- [ ] **T-064** Regenerate types: `npx supabase gen types typescript --local > src/shared/types/database.ts`

### 2B - Seed Data [BLOCKED BY: T-063]
- [ ] **T-065** Download `exercises.json` from `bootstrapping-lab/exercisedb-api` repo
- [ ] **T-066** Write seed script: map ExerciseDB fields -> GAAB schema (`exerciseId`->`id`, `equipments`->`equipment`, etc.)
- [ ] **T-067** Write `supabase/seed.sql` (or Node seed script) to insert all ~1,500 exercises
- [ ] **T-068** Run seed: verify `SELECT count(*) FROM exercises` returns ~1,500
- [ ] **T-069** Create trimmed `assets/data/seed-exercises.json` (id, name, target_muscles only) for offline fallback

### 2C - Constants [PARALLEL with 2B]
- [ ] **T-070** Create `src/shared/constants/muscles.ts` -- 49 muscle names as typed array
- [ ] **T-071** Create `src/shared/constants/equipment.ts` -- 28 equipment types as typed array
- [ ] **T-072** Create `src/shared/constants/bodyParts.ts` -- 10 body parts as typed array

### 2D - Exercise Module [BLOCKED BY: T-064, T-068]
- [ ] **T-073** Create `src/modules/exercises/api/exercises.ts`:
  - `getExercises(filters)` with array containment operators (`@>`)
  - `searchExercises(query)` with `ilike` or trigram similarity
  - `getExerciseById(id)`
  - `createCustomExercise(data)`
- [ ] **T-074** Create `src/modules/exercises/hooks/useExercises.ts` -- TanStack Query wrapper, pagination
- [ ] **T-075** Create `src/modules/exercises/hooks/useExerciseSearch.ts` -- debounced search (300ms)
- [ ] **T-076** Create `src/modules/exercises/store/exerciseFilterStore.ts` -- Zustand: selected muscles, equipment, body parts
- [ ] **T-077** Create `src/modules/exercises/components/ExerciseCard.tsx` -- GIF thumbnail (expo-image), name, muscle tags
- [ ] **T-078** Create `src/modules/exercises/components/ExerciseDetail.tsx` -- full GIF, instructions list, all tags
- [ ] **T-079** Create `src/modules/exercises/components/ExerciseFilter.tsx` -- multi-select chip rows
- [ ] **T-080** Create `src/modules/exercises/components/ExerciseSearch.tsx` -- search bar with instant results dropdown

### 2E - Screens [BLOCKED BY: T-077, T-078]
- [ ] **T-081** Build `app/exercise/[id].tsx` -- exercise detail screen
- [ ] **T-082** Add exercise library (list + search + filter) accessible from workout tab

### 2F - Verification
- [ ] **T-083** Test: browse exercises with pagination (20 per page, infinite scroll)
- [ ] **T-084** Test: filter by "chest" muscle -> only chest exercises shown
- [ ] **T-085** Test: filter by "dumbbell" equipment -> correct results
- [ ] **T-086** Test: combined filter (chest + dumbbell) -> intersection
- [ ] **T-087** Test: search "bench press" -> relevant results (including typo: "bech press")
- [ ] **T-088** Test: exercise detail shows GIF, instructions, muscles, equipment
- [ ] **T-089** Test: GIF caches locally (second load is instant, works offline)
- [ ] **T-090** Test: create custom exercise -> appears in user's list only

---

## Phase 3: Workout Engine

### 3A - Database [BLOCKED BY: T-063]
- [ ] **T-091** Write `supabase/migrations/003_workouts.sql`:
  - `workout_templates` + `workout_template_exercises`
  - `workout_sessions` + `session_exercises` + `exercise_sets`
  - All FK constraints, indexes, CHECK constraints
  - RLS for all 5 tables (including nested join-based policies)
- [ ] **T-092** Run `npx supabase db push`
- [ ] **T-093** Regenerate types

### 3B - Templates [BLOCKED BY: T-093, T-073]
- [ ] **T-094** Create `src/modules/workouts/api/templates.ts` -- CRUD templates with exercises
- [ ] **T-095** Create `src/modules/workouts/hooks/useTemplates.ts` -- TanStack Query CRUD
- [ ] **T-096** Create `src/modules/workouts/components/TemplateCard.tsx` -- name, category, exercise count
- [ ] **T-097** Create `src/modules/workouts/components/TemplateForm.tsx` -- create/edit with exercise picker

### 3C - Workout Builder [BLOCKED BY: T-073, T-076]
- [ ] **T-098** Create `src/modules/workouts/utils/workout-generator.ts`:
  - Weighted randomization: 70% primary, 30% secondary muscles
  - Fisher-Yates shuffle
  - Equipment filtering
  - Configurable exercises per muscle (default 3)
- [ ] **T-099** Build `app/workout/builder.tsx`:
  - Step 1: equipment multi-select
  - Step 2: muscle multi-select
  - Step 3: generated exercise list with shuffle/replace per exercise
  - Actions: "Save as Template" or "Start Workout"

### 3D - Session Store [BLOCKED BY: T-027]
- [ ] **T-100** Create `src/modules/workouts/store/workoutSessionStore.ts`:
  - Zustand store with MMKV persistence middleware
  - Full state shape: activeSession, timer state, all actions
  - `startSession(template?)` -- init session with exercises and default sets
  - `addSet(exerciseId)`, `updateSet(...)`, `completeSet(...)`
  - `addExercise(exerciseId)`, `removeExercise(exerciseId)`, `reorderExercises(...)`
  - `finishSession()` -- stop timer, call Edge Function
  - `discardSession()` -- clear session state
- [ ] **T-101** Create `src/modules/workouts/utils/volume-calc.ts` -- `totalVolume(sets)`, `exerciseVolume(sets)`
- [ ] **T-102** Create `src/shared/lib/unit-conversion.ts` -- `kgToLbs()`, `lbsToKg()`, `kmToMi()`, `miToKm()`

### 3E - Session UI [BLOCKED BY: T-100]
- [ ] **T-103** Create `src/modules/workouts/components/SetRow.tsx` -- weight/reps/duration/RPE inline inputs
- [ ] **T-104** Create `src/modules/workouts/components/ExerciseSetList.tsx` -- list of SetRows with add/remove
- [ ] **T-105** Create `src/modules/workouts/components/SessionTimer.tsx` -- elapsed time counter (MM:SS)
- [ ] **T-106** Create `src/modules/workouts/components/RestTimer.tsx` -- countdown between sets, vibration on done
- [ ] **T-107** Build `app/workout/session/[id].tsx`:
  - Horizontal swipe between exercises
  - Set list per exercise
  - Timer in header
  - Rest timer overlay
  - "Finish Workout" -> rating modal -> submit

### 3F - Edge Function: complete-workout [BLOCKED BY: T-092]
- [ ] **T-108** Create `supabase/functions/complete-workout/index.ts`:
  - Validate session data
  - Insert workout_sessions row
  - Insert session_exercises rows
  - Insert exercise_sets rows
  - Auto-detect PRs (compare weight*reps against existing PR values)
  - Update streak on profiles (count consecutive days with sessions)
  - Create feed_posts row (auto-post)
  - Return: session summary, new PRs list, streak info

### 3G - Offline Sync [BLOCKED BY: T-100, T-019]
- [ ] **T-109** Create `src/shared/lib/offline-queue.ts`:
  - MMKV-backed queue for failed mutations
  - NetInfo listener for connectivity changes
  - `enqueue(mutation)`, `flush()`, `getQueueSize()`
  - Automatic flush on connectivity restored
- [ ] **T-110** Create `supabase/functions/sync-workout-session/index.ts`:
  - Accept array of offline sessions
  - Upsert each session (ON CONFLICT by id)
  - Return sync report (synced IDs, conflicts)
- [ ] **T-111** Integrate offline queue into `finishSession()`:
  - Try Edge Function call
  - On network error: queue to offline queue
  - Show toast: "Workout saved locally, will sync when online"

### 3H - History [BLOCKED BY: T-092]
- [ ] **T-112** Create `src/modules/workouts/api/sessions.ts` -- fetch sessions with exercises and sets
- [ ] **T-113** Create `src/modules/workouts/hooks/useWorkoutHistory.ts` -- infinite scroll TanStack Query
- [ ] **T-114** Create `src/modules/workouts/components/SessionCard.tsx` -- date, name, duration, exercises, volume
- [ ] **T-115** Build `app/workout/history.tsx` -- paginated list of past sessions

### 3I - Workout Hub Screen [BLOCKED BY: T-096, T-099, T-115]
- [ ] **T-116** Build `app/(tabs)/workout.tsx`:
  - "Quick Start" button (empty session)
  - "Build Workout" button -> builder wizard
  - Recent templates section
  - Recent sessions section
  - Resume in-progress session banner (if any)

### 3J - Verification
- [ ] **T-117** Test: create template with 4 exercises -> persists in Supabase
- [ ] **T-118** Test: workout builder generates exercises matching selected muscles + equipment
- [ ] **T-119** Test: start session from template -> exercises + default sets loaded
- [ ] **T-120** Test: log weight + reps on a set -> store updates
- [ ] **T-121** Test: kill app mid-session -> reopen -> session resumes from MMKV
- [ ] **T-122** Test: finish session -> data appears in Supabase tables
- [ ] **T-123** Test: PR auto-detected when set exceeds previous best
- [ ] **T-124** Test: streak increments on consecutive daily workouts
- [ ] **T-125** Test: airplane mode -> complete workout -> reconnect -> session syncs via offline queue
- [ ] **T-126** Test: workout history loads with correct data

---

## Phase 4: Programs [BLOCKED BY: Phase 3]

### 4A - Database
- [ ] **T-127** Write `supabase/migrations/004_programs.sql`:
  - `programs`, `program_weeks`, `program_sessions`, `program_enrollments`
  - RLS: published programs readable by all, CRUD own, enrollments own
- [ ] **T-128** Run `npx supabase db push`
- [ ] **T-129** Regenerate types
- [ ] **T-130** Write `supabase/migrations/004b_seed_programs.sql`:
  - "Beginner Full Body" (3d/wk, 4 wks)
  - "Push/Pull/Legs" (6d/wk, 8 wks)
  - "5x5 Strength" (3d/wk, 12 wks)
  - Each with weeks, sessions, and linked exercises

### 4B - Module [BLOCKED BY: T-129]
- [ ] **T-131** Create `src/modules/programs/api/programs.ts` -- CRUD programs, weeks, sessions
- [ ] **T-132** Create `src/modules/programs/hooks/usePrograms.ts` -- list/search programs
- [ ] **T-133** Create `src/modules/programs/hooks/useEnrollment.ts` -- enroll, progress, complete
- [ ] **T-134** Create `src/modules/programs/components/ProgramCard.tsx` -- cover, name, level, duration
- [ ] **T-135** Create `src/modules/programs/components/WeekView.tsx` -- expandable week with sessions
- [ ] **T-136** Create `src/modules/programs/components/ProgressBar.tsx` -- weeks/sessions progress

### 4C - Edge Function [BLOCKED BY: T-128]
- [ ] **T-137** Create `supabase/functions/program-progress/index.ts`:
  - Increment `completed_sessions` on enrollment
  - Advance `current_week` / `current_session`
  - Detect program completion -> set `completed_at`, create feed post
  - Return next session info

### 4D - Screens [BLOCKED BY: T-134]
- [ ] **T-138** Build `app/program/[id].tsx` -- program detail, week/session breakdown, enroll button
- [ ] **T-139** Build `app/program/session/[id].tsx` -- starts workout session pre-loaded with program exercises
- [ ] **T-140** Add programs section to `app/(tabs)/workout.tsx`

### 4E - Verification
- [ ] **T-141** Test: browse programs -> see seeded programs
- [ ] **T-142** Test: enroll in program -> enrollment created
- [ ] **T-143** Test: start program session -> workout pre-loaded
- [ ] **T-144** Test: complete session -> enrollment advances to next session
- [ ] **T-145** Test: complete all sessions -> program marked complete

---

## Phase 5: Tracking & PRs [PARALLEL -- can start after Phase 1]

### 5A - Database [BLOCKED BY: T-034]
- [ ] **T-146** Write `supabase/migrations/005_tracking.sql`:
  - `daily_metrics` table (UNIQUE on user_id + date)
  - `meals` table
  - `personal_records` + `pr_values` tables
  - RLS: all scoped to own data
- [ ] **T-147** Run `npx supabase db push`
- [ ] **T-148** Regenerate types

### 5B - Daily Tracking Module [BLOCKED BY: T-148]
- [ ] **T-149** Create `src/modules/tracking/api/daily-metrics.ts` -- upsert today, fetch date range
- [ ] **T-150** Create `src/modules/tracking/hooks/useDailyMetrics.ts` -- today's metrics, update field
- [ ] **T-151** Create `src/modules/tracking/store/dailyMetricsStore.ts` -- Zustand for optimistic local updates
- [ ] **T-152** Create `src/modules/tracking/components/WaterTracker.tsx`:
  - Rewrite Fitly's WaterIntake: increment buttons (200ml), progress ring, daily goal
  - Write to `daily_metrics.water_ml` instead of AsyncStorage
- [ ] **T-153** Create `src/modules/tracking/components/StepCounter.tsx`:
  - Reuse Fitly's HealthKit (iOS) / Pedometer (Android) logic
  - Write to `daily_metrics.steps` instead of local-only
- [ ] **T-154** Create `src/modules/tracking/components/BodyMetrics.tsx` -- weight/body-fat entry

### 5C - Nutrition [BLOCKED BY: T-148]
- [ ] **T-155** Create `src/modules/tracking/api/meals.ts` -- CRUD meals, daily summary
- [ ] **T-156** Create `src/modules/tracking/hooks/useMeals.ts` -- today's meals, add/delete
- [ ] **T-157** Create `src/modules/tracking/components/NutritionLog.tsx`:
  - Rewrite Fitly's NutritionTrack: add meal form, calorie/macro display
  - Write to `meals` table instead of AsyncStorage
  - Daily total from `SUM(calories) WHERE logged_at::date = today`
- [ ] **T-158** Build `app/settings/nutrition.tsx` -- calorie goal, meal history

### 5D - Personal Records [BLOCKED BY: T-148]
- [ ] **T-159** Create `src/modules/analytics/api/personal-records.ts` -- CRUD PRs + values
- [ ] **T-160** Create `src/modules/analytics/hooks/usePRs.ts` -- list PRs with latest value
- [ ] **T-161** Create `src/modules/analytics/hooks/usePRHistory.ts` -- time series for one PR
- [ ] **T-162** Create `src/modules/analytics/components/PRCard.tsx` -- name, current value, trend arrow
- [ ] **T-163** Create `src/modules/analytics/components/PRChart.tsx` -- line chart of PR values
- [ ] **T-164** Create `src/modules/analytics/components/AddPRModal.tsx` -- create PR linked to exercise

### 5E - Dashboard Integration [BLOCKED BY: T-152, T-153, T-157]
- [ ] **T-165** Build `app/(tabs)/index.tsx` (Dashboard):
  - Today's steps (progress ring)
  - Today's water (progress ring)
  - Today's calories (progress bar)
  - Current streak
  - Quick action buttons (start workout, log water, log meal)

### 5F - Verification
- [ ] **T-166** Test: log water 5x200ml -> daily_metrics.water_ml = 1000
- [ ] **T-167** Test: add meal "Chicken Breast 300cal" -> appears in meals table
- [ ] **T-168** Test: step counter reads from health API and writes to daily_metrics
- [ ] **T-169** Test: create PR "Squat 1RM" -> add value 100kg -> add value 110kg -> chart shows progression
- [ ] **T-170** Test: dashboard shows all today's metrics correctly
- [ ] **T-171** Test: next day -> water/calories reset, steps reset

---

## Phase 6: Analytics [BLOCKED BY: Phase 3 + Phase 5]

### 6A - Edge Function [BLOCKED BY: T-092, T-147]
- [ ] **T-172** Create `supabase/functions/calculate-statistics/index.ts`:
  - Volume over time: `SUM(weight * reps)` per day
  - Workout frequency: session count per weekday
  - Category duration split: `SUM(duration_s)` by template category
  - Muscle heatmap: set count per target muscle
  - PR timeline: all pr_values for user
- [ ] **T-173** Test Edge Function directly with curl / Supabase dashboard

### 6B - Charts [BLOCKED BY: T-172]
- [ ] **T-174** Install charting library: `npm install victory-native` (or `react-native-chart-kit`)
- [ ] **T-175** Create `src/modules/analytics/api/statistics.ts` -- call Edge Function
- [ ] **T-176** Create `src/modules/analytics/hooks/useStats.ts` -- TanStack Query with period param
- [ ] **T-177** Create `src/modules/analytics/components/VolumeChart.tsx` -- line/bar chart
- [ ] **T-178** Create `src/modules/analytics/components/FrequencyChart.tsx` -- weekday bar chart
- [ ] **T-179** Create `src/modules/analytics/components/MuscleHeatmap.tsx` -- body muscle visualization
- [ ] **T-180** Create `src/modules/analytics/components/PRTimeline.tsx` -- multi-line PR chart
- [ ] **T-181** Create `src/modules/analytics/components/WorkoutStreak.tsx` -- calendar heatmap

### 6C - Health Import [BLOCKED BY: T-147]
- [ ] **T-182** Create `supabase/functions/import-health-data/index.ts`:
  - Apple Health XML parser (port from WingFit's Python `watchparsers.py`)
  - Whoop CSV parser
  - Upsert into daily_metrics
- [ ] **T-183** Build `app/settings/integrations.tsx` -- file picker + upload + import status

### 6D - Progress Screen [BLOCKED BY: T-177, T-178, T-179, T-180, T-181]
- [ ] **T-184** Build `app/(tabs)/progress.tsx`:
  - Period selector: week / month / quarter / year
  - Volume chart
  - Frequency chart
  - Muscle heatmap
  - PR section with cards + sparklines
  - Streak calendar

### 6E - Verification
- [ ] **T-185** Test: after 5+ sessions, volume chart shows correct data
- [ ] **T-186** Test: switch period -> charts update
- [ ] **T-187** Test: muscle heatmap highlights muscles from recent workouts
- [ ] **T-188** Test: PR timeline matches manual PR entries
- [ ] **T-189** Test: Apple Health import fills daily_metrics correctly

---

## Phase 7: Social [BLOCKED BY: Phase 3]

### 7A - Database [BLOCKED BY: T-092]
- [ ] **T-190** Write `supabase/migrations/007_social.sql`:
  - `friendships` with bidirectional RLS
  - `feed_posts` with visibility-based RLS (own + friends + public)
  - `post_reactions` + `post_comments`
  - `challenges` + `challenge_participants`
  - `notifications` with user-scoped RLS
- [ ] **T-191** Run `npx supabase db push`
- [ ] **T-192** Regenerate types
- [ ] **T-193** Test RLS policies in Supabase SQL editor before building UI

### 7B - Friends [BLOCKED BY: T-192]
- [ ] **T-194** Create `src/modules/social/api/friendships.ts` -- send/accept/reject/block, list friends
- [ ] **T-195** Create `src/modules/social/hooks/useFriends.ts` -- friend list, pending count
- [ ] **T-196** Create user search: query `profiles` with `ilike` on username/display_name
- [ ] **T-197** Build `app/social/friends.tsx` -- friend list, search, pending requests

### 7C - Feed [BLOCKED BY: T-192]
- [ ] **T-198** Create `supabase/functions/social-feed/index.ts`:
  - Fetch friends' + public posts, cursor pagination
  - Enrich with author profile, reaction counts, comment count
  - Include workout summary / PR details based on post_type
- [ ] **T-199** Create `src/modules/social/api/feed.ts` -- call Edge Function
- [ ] **T-200** Create `src/modules/social/hooks/useFeed.ts` -- infinite scroll
- [ ] **T-201** Create `src/modules/social/components/FeedPost.tsx` -- post card (workout summary / PR badge)
- [ ] **T-202** Create `src/modules/social/components/ReactionBar.tsx` -- emoji toggle row
- [ ] **T-203** Create `src/modules/social/components/CommentList.tsx` -- comments with input

### 7D - Challenges [BLOCKED BY: T-192]
- [ ] **T-204** Create `src/modules/social/api/challenges.ts` -- create/join/leave, update progress
- [ ] **T-205** Create `src/modules/social/hooks/useChallenges.ts` -- active challenges with leaderboard
- [ ] **T-206** Create `supabase/functions/update-challenge-progress/index.ts`:
  - Recalculate participant's `current_value` on workout complete
- [ ] **T-207** Create `src/modules/social/components/ChallengeCard.tsx` -- preview with progress bar
- [ ] **T-208** Create `src/modules/social/components/LeaderboardRow.tsx` -- rank, avatar, value

### 7E - Notifications [BLOCKED BY: T-192]
- [ ] **T-209** Create `supabase/functions/send-notification/index.ts`:
  - Insert notification row
  - Send push via Expo Push API
- [ ] **T-210** Create `src/modules/social/store/notificationStore.ts` -- badge count, read state
- [ ] **T-211** Set up Supabase Realtime subscription on `notifications` table for current user
- [ ] **T-212** `npx expo install expo-notifications` + configure push token registration

### 7F - Screens [BLOCKED BY: T-201, T-207]
- [ ] **T-213** Build `app/(tabs)/social.tsx` -- main feed with pull-to-refresh + notification bell
- [ ] **T-214** Build `app/social/post/[id].tsx` -- post detail with full comments
- [ ] **T-215** Build `app/social/challenge/[id].tsx` -- challenge detail with live leaderboard

### 7G - Auto-Posting Integration [BLOCKED BY: T-108, T-198]
- [ ] **T-216** Update `complete-workout` Edge Function to create `feed_posts` entry:
  - `post_type: 'workout_completed'` with session summary
  - `post_type: 'pr_achieved'` if new PRs detected
- [ ] **T-217** Update streak logic to create `post_type: 'streak_milestone'` at 7, 30, 100, 365 days

### 7H - Verification
- [ ] **T-218** Test: send friend request -> recipient sees pending request
- [ ] **T-219** Test: accept request -> both see each other's posts in feed
- [ ] **T-220** Test: complete workout -> auto-post appears in friends' feeds
- [ ] **T-221** Test: react to post -> count updates in realtime
- [ ] **T-222** Test: comment on post -> visible to post owner
- [ ] **T-223** Test: create challenge -> invite friend -> both complete workouts -> leaderboard updates
- [ ] **T-224** Test: push notification arrives on friend request / reaction
- [ ] **T-225** Test: privacy: private post not visible to friends, friends-only not visible to strangers

---

## Phase 8: Polish & Launch

### 8A - Premium [BLOCKED BY: Phase 7]
- [ ] **T-226** `npx expo install react-native-purchases` (RevenueCat)
- [ ] **T-227** Configure RevenueCat: create products (monthly $9.99, yearly $79.99)
- [ ] **T-228** Build paywall screen with feature comparison
- [ ] **T-229** Gate premium features: advanced programs, detailed analytics, unlimited challenges
- [ ] **T-230** Create webhook Edge Function: RevenueCat -> update `profiles.is_premium`

### 8B - Performance
- [ ] **T-231** Audit all FlashList screens: set `estimatedItemSize`, verify no warnings
- [ ] **T-232** Configure `expo-image` caching: `cachePolicy: 'disk'`, 50MB limit
- [ ] **T-233** Lazy-load chart components: only render when progress tab is active
- [ ] **T-234** Profile app with Flipper/React DevTools: identify re-renders, slow queries
- [ ] **T-235** Add skeleton screens for all loading states (exercises, feed, history)

### 8C - Error Handling
- [ ] **T-236** Add global error boundary in `app/_layout.tsx`
- [ ] **T-237** Add toast notifications for: offline queue, sync success/failure, mutation errors
- [ ] **T-238** Add retry UI for failed sync operations
- [ ] **T-239** Integrate crash reporting (Sentry or Bugsnag)

### 8D - Testing
- [ ] **T-240** Unit tests: `workout-generator.ts` (weighted shuffle, Fisher-Yates)
- [ ] **T-241** Unit tests: `volume-calc.ts`, `unit-conversion.ts`
- [ ] **T-242** Unit tests: `offline-queue.ts` (enqueue, flush, dedup)
- [ ] **T-243** Integration tests: all Edge Functions (use Supabase test framework)
- [ ] **T-244** E2E test: sign up -> onboard -> create workout -> complete -> view history
- [ ] **T-245** E2E test: add friend -> complete workout -> see in friend's feed

### 8E - App Store Prep
- [ ] **T-246** Design app icon (1024x1024) + adaptive icon
- [ ] **T-247** Design splash screen
- [ ] **T-248** Capture screenshots (6.7" + 6.1" + 5.5" for iOS, phone + tablet for Android)
- [ ] **T-249** Write App Store description + keywords
- [ ] **T-250** Write Privacy Policy + Terms of Service
- [ ] **T-251** Configure EAS Build: `eas build:configure`
- [ ] **T-252** Configure EAS Update for OTA updates
- [ ] **T-253** Production build iOS: `eas build --platform ios --profile production`
- [ ] **T-254** Production build Android: `eas build --platform android --profile production`
- [ ] **T-255** Submit to App Store Connect
- [ ] **T-256** Submit to Google Play Console

### 8F - Final Verification
- [ ] **T-257** Full journey test on physical iOS device
- [ ] **T-258** Full journey test on physical Android device
- [ ] **T-259** Offline test: airplane mode full workout -> reconnect -> sync
- [ ] **T-260** Performance test: scroll 1000+ exercises with no jank
- [ ] **T-261** Kill test: force-kill app at every screen -> reopen -> no data loss

---

## Summary

| Phase | Tasks | Depends On | Can Parallel With |
|-------|-------|-----------|-------------------|
| **P0: Bootstrap** | T-001 -- T-032 | Nothing | -- |
| **P1: Auth** | T-033 -- T-061 | P0 | -- |
| **P2: Exercises** | T-062 -- T-090 | P1 | -- |
| **P3: Workouts** | T-091 -- T-126 | P2 | P5 |
| **P4: Programs** | T-127 -- T-145 | P3 | P5, P6 |
| **P5: Tracking** | T-146 -- T-171 | P1 | P3, P4 |
| **P6: Analytics** | T-172 -- T-189 | P3 + P5 | P7 |
| **P7: Social** | T-190 -- T-225 | P3 | P6 |
| **P8: Polish** | T-226 -- T-261 | All | -- |

**Total: 261 tasks across 9 phases.**
