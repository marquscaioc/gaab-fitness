# GAAB - Unified Fitness App Architecture

## Executive Summary

This document defines the unified system architecture for the GAAB fitness mobile app,
combining capabilities from five source repositories into a single, scalable product.

| Source Repo | Stack | Reuse Strategy |
|---|---|---|
| **Fitly** (softwave-technology/fitly) | React Native / Expo / Supabase / Clerk | **App shell** -- navigation, auth flow, onboarding, health sensors |
| **Workout.cool** (Snouzy/workout-cool) | Next.js / Prisma / PostgreSQL | **Training engine** -- workout builder, session tracking, programs, set model |
| **ExerciseDB** (bootstrapping-lab/exercisedb-api) | Hono / Bun / JSON flat-file | **Exercise catalog** -- 1,500+ exercises, GIFs, search/filter logic |
| **Workout-Social** (RyanBaker0/workout-social) | *Repo unavailable (404)* | **Design from scratch** -- social feed, challenges, friends |
| **WingFit** (itskovacs/wingfit) | Angular / FastAPI / SQLite | **Analytics & tracking** -- PR tracking, statistics, smartwatch import, data export |

---

## 1. High-Level Architecture

```
+------------------------------------------------------------------+
|                        MOBILE CLIENT                             |
|               React Native / Expo (from Fitly)                   |
|                                                                  |
|  +------------+ +------------+ +----------+ +------------------+ |
|  | Auth &     | | Workout    | | Social   | | Analytics &      | |
|  | Onboarding | | Engine     | | Module   | | Tracking         | |
|  +------+-----+ +-----+------+ +----+-----+ +--------+---------+ |
|         |              |             |                |           |
+---------|--------------|-------------|----------------|----------+
          |              |             |                |
+---------v--------------v-------------v----------------v----------+
|                    SUPABASE PLATFORM                             |
|                                                                  |
|  +------------------+  +------------------+  +-----------------+ |
|  | Auth (Supabase   |  | PostgreSQL       |  | Realtime        | |
|  | Auth + OAuth)    |  | (all tables)     |  | (subscriptions) | |
|  +------------------+  +------------------+  +-----------------+ |
|  +------------------+  +------------------+  +-----------------+ |
|  | Edge Functions   |  | Storage          |  | Row Level       | |
|  | (business logic) |  | (media, avatars) |  | Security (RLS)  | |
|  +------------------+  +------------------+  +-----------------+ |
+------------------------------------------------------------------+
          |
+---------v--------------------+
| EXTERNAL SERVICES            |
| - ExerciseDB CDN (GIFs)     |
| - Push Notifications (Expo) |
| - RevenueCat (billing)      |
+------------------------------+
```

### Design Principles

1. **Supabase-native** -- No custom backend server. All business logic runs as Supabase Edge Functions (Deno) or client-side. PostgreSQL RLS enforces authorization.
2. **Offline-first** -- Active workout sessions persist locally (MMKV/AsyncStorage), sync to Supabase on connectivity. Critical for gym environments with poor signal.
3. **Feature-modular** -- Each domain (auth, workouts, social, analytics) is an isolated module with its own store, types, and API layer.
4. **Mobile-first** -- React Native/Expo is the sole client. No web dashboard in v1.

---

## 2. Database Schema (Supabase / PostgreSQL)

### 2.1 Auth & Users

```sql
-- Managed by Supabase Auth (auth.users)
-- Extended with a public profile table:

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  unit_system   TEXT NOT NULL DEFAULT 'metric'  CHECK (unit_system IN ('metric', 'imperial')),
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  height_cm     NUMERIC,
  weight_kg     NUMERIC,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_premium    BOOLEAN NOT NULL DEFAULT false,
  streak_count  INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can read any profile, update only their own
```

### 2.2 Exercise Catalog (from ExerciseDB)

```sql
CREATE TABLE public.exercises (
  id                TEXT PRIMARY KEY,          -- exercisedb ID e.g. "trmte8s"
  name              TEXT NOT NULL,
  gif_url           TEXT,                      -- CDN URL to animated GIF
  instructions      TEXT[],                    -- step-by-step array
  equipment         TEXT[] NOT NULL DEFAULT '{}',
  body_parts        TEXT[] NOT NULL DEFAULT '{}',
  target_muscles    TEXT[] NOT NULL DEFAULT '{}',
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  exercise_type     TEXT,                      -- strength, cardio, stretching, etc.
  mechanics_type    TEXT,                      -- compound, isolation
  is_custom         BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES auth.users(id),  -- NULL for catalog exercises
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for filtering
CREATE INDEX idx_exercises_target_muscles ON exercises USING GIN (target_muscles);
CREATE INDEX idx_exercises_equipment      ON exercises USING GIN (equipment);
CREATE INDEX idx_exercises_body_parts     ON exercises USING GIN (body_parts);
CREATE INDEX idx_exercises_name_trgm      ON exercises USING GIN (name gin_trgm_ops);

-- RLS: everyone reads catalog (is_custom=false), users read own custom exercises
```

### 2.3 Workout Engine (from Workout.cool + Fitly)

```sql
-- Reusable workout templates
CREATE TABLE public.workout_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,                -- push, pull, legs, upper, lower, full_body, custom
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_template_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id     TEXT NOT NULL REFERENCES exercises(id),
  sort_order      INT NOT NULL DEFAULT 0,
  default_sets    INT DEFAULT 3,
  default_reps    INT DEFAULT 10,
  rest_seconds    INT DEFAULT 90,
  notes           TEXT
);

-- Active/completed workout sessions
CREATE TABLE public.workout_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  name        TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  duration_s  INT,                       -- total seconds
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes       TEXT,
  is_synced   BOOLEAN NOT NULL DEFAULT true,  -- false = created offline
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON workout_sessions(user_id, started_at DESC);

CREATE TABLE public.session_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id     TEXT NOT NULL REFERENCES exercises(id),
  sort_order      INT NOT NULL DEFAULT 0
);

-- Flexible set model (from Workout.cool's parallel-array design, normalized)
CREATE TABLE public.exercise_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_index       SMALLINT NOT NULL,
  set_type        TEXT NOT NULL DEFAULT 'normal'
                    CHECK (set_type IN ('normal', 'warmup', 'dropset', 'failure', 'rest_pause')),
  weight          NUMERIC,               -- in user's preferred unit
  weight_unit     TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  reps            INT,
  duration_s      INT,                   -- for timed sets (planks, cardio)
  distance_m      NUMERIC,               -- for distance-based (running, rowing)
  completed       BOOLEAN NOT NULL DEFAULT false,
  rpe             SMALLINT CHECK (rpe BETWEEN 1 AND 10),  -- Rate of Perceived Exertion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.4 Training Programs (from Workout.cool)

```sql
CREATE TABLE public.programs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT,          -- strength, hypertrophy, endurance, mobility, sport
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
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  name        TEXT,
  description TEXT
);

CREATE TABLE public.program_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id         UUID NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
  session_number  INT NOT NULL,
  name            TEXT,
  estimated_min   INT,
  template_id     UUID REFERENCES workout_templates(id) ON DELETE SET NULL
);

-- User enrollment & progress
CREATE TABLE public.program_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  current_week    INT NOT NULL DEFAULT 1,
  current_session INT NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);
```

### 2.5 Personal Records & Body Tracking (from WingFit)

```sql
CREATE TABLE public.personal_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT REFERENCES exercises(id),
  name        TEXT NOT NULL,              -- "Bench Press 1RM", "5K Run", etc.
  record_type TEXT NOT NULL CHECK (record_type IN ('weight', 'reps', 'time', 'distance')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pr_values (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id     UUID NOT NULL REFERENCES personal_records(id) ON DELETE CASCADE,
  value     NUMERIC NOT NULL,
  unit      TEXT,                         -- kg, lbs, sec, m, km
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(pr_id, recorded_at)
);

-- Daily health & body metrics
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

CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);
```

### 2.6 Nutrition Tracking (from Fitly, enhanced)

```sql
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

CREATE INDEX idx_meals_user_date ON meals(user_id, logged_at DESC);
```

### 2.7 Social Features (designed from scratch)

```sql
-- Friendships (bidirectional after acceptance)
CREATE TABLE public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Activity feed
CREATE TABLE public.feed_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type     TEXT NOT NULL
                  CHECK (post_type IN ('workout_completed', 'pr_achieved', 'streak_milestone',
                                       'program_completed', 'challenge_won', 'manual')),
  session_id    UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  pr_id         UUID REFERENCES personal_records(id) ON DELETE SET NULL,
  content       TEXT,
  media_url     TEXT,
  visibility    TEXT NOT NULL DEFAULT 'friends'
                  CHECK (visibility IN ('public', 'friends', 'private')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);

CREATE TABLE public.post_reactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji     TEXT NOT NULL DEFAULT 'fire',    -- fire, muscle, clap, heart
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.post_comments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Challenges
CREATE TABLE public.challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  challenge_type TEXT NOT NULL
                  CHECK (challenge_type IN ('volume', 'frequency', 'streak', 'distance', 'custom')),
  target_value  NUMERIC,
  target_unit   TEXT,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value NUMERIC NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
```

### 2.8 Notifications

```sql
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- friend_request, reaction, comment, challenge_invite, pr_beaten, etc.
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,           -- arbitrary payload (post_id, user_id, etc.)
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
```

---

## 3. API Structure (Supabase Edge Functions + Direct Client)

### 3.1 Direct Client Access (via Supabase JS SDK + RLS)

Simple CRUD operations go through the Supabase client SDK directly, protected by Row Level Security:

| Domain | Operations | Access Pattern |
|--------|-----------|---------------|
| **Profiles** | Read/update own profile, search users | `supabase.from('profiles')` |
| **Exercises** | Browse catalog, search, filter | `supabase.from('exercises')` with GIN index queries |
| **Templates** | CRUD own templates | `supabase.from('workout_templates')` |
| **Sessions** | CRUD own sessions + sets | `supabase.from('workout_sessions')` |
| **Meals** | Log/edit/delete meals | `supabase.from('meals')` |
| **Daily Metrics** | Upsert daily tracking data | `supabase.from('daily_metrics')` |
| **PRs** | CRUD personal records | `supabase.from('personal_records')` |
| **Social** | Friend requests, posts, reactions | `supabase.from('feed_posts')` |
| **Notifications** | Read/mark-read | `supabase.from('notifications')` |

### 3.2 Edge Functions (complex business logic)

```
supabase/functions/
├── sync-workout-session/       # Offline session sync (conflict resolution)
├── complete-workout/           # Post-workout: auto-PR detection, feed post, streak update
├── generate-workout/           # AI-powered workout generation (muscles + equipment -> exercises)
├── search-exercises/           # Full-text + fuzzy search with pg_trgm
├── social-feed/                # Aggregated feed query (friends' posts, pagination)
├── update-challenge-progress/  # Recalculate leaderboard on new workout
├── import-health-data/         # Parse Apple Health / Google Fit / Whoop exports
├── calculate-statistics/       # Aggregate stats: volume over time, frequency, PRs chart
├── send-notification/          # Push notification dispatch (Expo Push API)
└── program-progress/           # Advance enrollment, check completion, suggest next session
```

#### Key Edge Function Contracts

**`POST /functions/v1/complete-workout`**
```typescript
// Request
{
  session_id: string
  rating?: number
  notes?: string
}
// Response
{
  session: WorkoutSession
  new_prs: PersonalRecord[]       // auto-detected PRs
  feed_post_id?: string           // auto-created feed post
  streak_updated: boolean
  xp_earned: number
}
```

**`POST /functions/v1/generate-workout`**
```typescript
// Request
{
  target_muscles: string[]        // ["chest", "triceps"]
  equipment: string[]             // ["barbell", "dumbbell"]
  duration_minutes?: number
  exercises_per_muscle?: number   // default 3
}
// Response
{
  exercises: Exercise[]           // shuffled, weighted (70% primary, 30% secondary)
  suggested_sets: SuggestedSet[]
}
```

**`POST /functions/v1/sync-workout-session`**
```typescript
// Request
{
  sessions: LocalSession[]        // array of offline sessions
}
// Response
{
  synced: string[]                // session IDs successfully synced
  conflicts: ConflictReport[]     // sessions needing manual resolution
}
```

**`GET /functions/v1/social-feed`**
```typescript
// Query params: ?cursor=<timestamp>&limit=20
// Response
{
  posts: FeedPost[]               // enriched with user profile, reactions, comment count
  next_cursor?: string
}
```

**`GET /functions/v1/calculate-statistics`**
```typescript
// Query params: ?period=month|quarter|year&date=2026-03-01
// Response
{
  volume_over_time: { date: string, volume_kg: number }[]
  frequency: { weekday: string, avg_sessions: number }[]
  category_split: { category: string, total_minutes: number }[]
  muscle_heatmap: { muscle: string, sets: number }[]
  pr_timeline: { name: string, values: { date: string, value: number }[] }[]
}
```

### 3.3 Realtime Subscriptions

| Channel | Purpose |
|---------|---------|
| `notifications:{user_id}` | Live notification badge updates |
| `challenge:{challenge_id}` | Live leaderboard updates during active challenges |
| `feed:friends` | New post alerts for connected friends |

---

## 4. Integration Map: Reuse vs. Rewrite

### 4.1 From Fitly (App Shell) -- REUSE HEAVILY

| Component | Action | Notes |
|-----------|--------|-------|
| Expo + React Native skeleton | **Reuse as-is** | Foundation of the app |
| expo-router (file-based routing) | **Reuse** | Extend route structure for new modules |
| NativeWind / Tailwind styling | **Reuse** | Consistent dark theme |
| Zustand state management | **Reuse** | One store per domain module |
| Onboarding flow | **Reuse + extend** | Add fitness goal selection, body metrics |
| Step counter (HealthKit/Pedometer) | **Reuse** | Pipe data into `daily_metrics` table |
| BMI/BMR calculator | **Reuse** | Move to a "Body" tab or settings |
| Water intake tracking | **Rewrite** | Move from AsyncStorage to Supabase `daily_metrics` |
| Nutrition tracking | **Rewrite** | Replace AsyncStorage with `meals` table |
| Streak tracking | **Rewrite** | Compute from `workout_sessions` server-side |
| Clerk auth | **Replace** | Switch to Supabase Auth (eliminates a dependency) |
| YouTube videos | **Drop** | Replace with ExerciseDB GIFs + in-app instructions |

### 4.2 From Workout.cool (Training Engine) -- PORT CORE LOGIC

| Component | Action | Notes |
|-----------|--------|-------|
| Workout builder (3-step wizard) | **Port to RN** | Equipment -> Muscles -> Generated exercises. Reuse the weighted randomization algorithm (70/30 primary/secondary) |
| Set data model (parallel arrays) | **Adapt** | Normalize into `exercise_sets` table with explicit columns instead of parallel arrays. Cleaner for SQL queries |
| Workout session store (Zustand) | **Port** | Adapt `workout-session.store.ts` to React Native with MMKV for local persistence |
| Local-first sync pattern | **Port** | Reuse the `workoutSessionLocal` + service layer pattern |
| Training programs (Program/Week/Session) | **Port schema** | Map Prisma models to Supabase tables |
| Program enrollment & progression | **Port server actions** | Convert to Edge Functions |
| Exercise search (Fuse.js) | **Replace** | Use PostgreSQL `pg_trgm` + GIN indexes instead |
| Statistics/heatmap | **Port UI concept** | Rebuild charts with `react-native-chart-kit` or Victory Native |
| Session timer | **Port** | Simple elapsed timer, add rest timer between sets |
| DaisyUI / Radix components | **Drop** | Not compatible with React Native |
| Prisma ORM | **Drop** | Supabase client replaces this |
| Better Auth | **Drop** | Supabase Auth replaces this |
| Stripe / RevenueCat billing | **Reuse RevenueCat** | For mobile IAP; drop Stripe web billing |

### 4.3 From ExerciseDB (Exercise Catalog) -- IMPORT DATA

| Component | Action | Notes |
|-----------|--------|-------|
| 1,500 exercise records (JSON) | **Import into Supabase** | One-time seed migration. Map fields to `exercises` table |
| 1,500 GIF animations | **Reference CDN** | Use `v1.cdn.exercisedb.dev` URLs. Cache locally with expo-image |
| Fuzzy search (Fuse.js) | **Replace** | PostgreSQL `pg_trgm` + GIN index for server-side search |
| Filter logic (muscle/equipment/bodypart) | **Replace** | SQL array containment queries (`@>`, `&&` operators) |
| Hono API server | **Drop** | No need for a separate API -- data lives in Supabase |
| Category taxonomy (10 body parts, 49 muscles, 28 equipment) | **Reuse** | Normalize as reference data or enum constants |

### 4.4 From Workout-Social (Social Features) -- DESIGN FROM SCRATCH

Repo is unavailable (404). Social module designed fresh:

| Feature | Implementation |
|---------|---------------|
| Friend system | `friendships` table + Supabase RLS |
| Activity feed | Auto-generated posts on workout complete, PR, streak milestone |
| Reactions & comments | Simple relational tables with realtime subscriptions |
| Challenges | Time-boxed competitions with auto-updated leaderboards |
| User search | `pg_trgm` on `profiles.username` + `profiles.display_name` |

### 4.5 From WingFit (Analytics & Tracking) -- PORT CONCEPTS

| Component | Action | Notes |
|-----------|--------|-------|
| Personal Records model (PR + PRValue) | **Port** | Map to `personal_records` + `pr_values` tables |
| Category-duration statistics | **Port algorithm** | Reimplement aggregation as Edge Function |
| Weekday duration heatmap | **Port** | Rebuild in React Native charts |
| Apple Watch data import | **Port parser** | Convert Python `watchparsers.py` to TypeScript Edge Function |
| Whoop data import | **Port parser** | Same -- convert to Edge Function |
| HealthWatchData model | **Merge** | Absorbed into `daily_metrics` table |
| Bloc-based workout logging | **Drop** | Replace with structured session/set model from Workout.cool |
| Programs (Program/Step/StepBloc) | **Drop** | Workout.cool's program model is more structured |
| FastAPI backend | **Drop** | Supabase replaces this entirely |
| SQLite database | **Drop** | PostgreSQL replaces this |
| Admin panel | **Defer** | Not needed for mobile v1 |
| MFA / API tokens | **Defer** | Supabase Auth handles MFA natively |

---

## 5. Conflict Resolution

### 5.1 Authentication: Clerk vs Better Auth vs JWT vs Supabase Auth

| Repo | Auth System |
|------|------------|
| Fitly | Clerk (external SaaS) |
| Workout.cool | Better Auth (self-hosted) |
| WingFit | Custom JWT + Argon2 |

**Resolution:** Use **Supabase Auth** exclusively.
- Eliminates Clerk dependency ($$$) and custom JWT code
- Native support for email/password, Google OAuth, Apple OAuth
- Session management built into Supabase client SDK
- RLS policies use `auth.uid()` -- zero custom middleware needed
- MFA available out of the box

**Migration path:** Replace Clerk hooks (`useAuth`, `useUser`, `useSignIn`) with Supabase equivalents (`useSession`, `useUser` from `@supabase/auth-helpers-react`).

### 5.2 Data Models: Exercise Representation

| Repo | Exercise Model |
|------|---------------|
| Fitly | `{ name, sets (string), instructions, description }` -- minimal |
| Workout.cool | EAV pattern with `ExerciseAttribute` junction table -- flexible but complex |
| ExerciseDB | `{ name, equipment[], bodyParts[], targetMuscles[], secondaryMuscles[], instructions[] }` -- rich arrays |

**Resolution:** Use **ExerciseDB's array-based model** stored in PostgreSQL.
- Arrays are queryable with GIN indexes (fast filtering)
- Simpler than Workout.cool's EAV pattern
- Richer than Fitly's flat model
- PostgreSQL array operators (`@>`, `&&`) replace the need for junction tables

### 5.3 Set Tracking: String vs Parallel Arrays vs Structured

| Repo | Set Model |
|------|-----------|
| Fitly | `sets: string` -- just a text field ("3x10") |
| Workout.cool | Parallel arrays: `types[], valuesInt[], valuesSec[], units[]` |
| WingFit | `BlocResult { key: kg/rep/time, value, comment }` -- single value |

**Resolution:** Use **normalized columns** in `exercise_sets` table.
- Explicit `weight`, `reps`, `duration_s`, `distance_m` columns
- Clearer than parallel arrays for SQL aggregation queries
- Supports all set types: weighted, bodyweight, timed, distance
- `set_type` enum distinguishes warmup, dropset, failure, etc.
- Easier to compute volume (`weight * reps`), PRs, and trends

### 5.4 Workout Structure: Templates vs Programs

| Repo | Concept |
|------|---------|
| Fitly | Static JSON presets + user-created workouts |
| Workout.cool | Workout builder (dynamic) + Programs (Week/Session structure) |
| WingFit | Programs (Program/Step/StepBloc) + free-form Blocs |

**Resolution:** Two-tier system:
1. **Templates** -- Reusable workout blueprints (quick-start). Replaces Fitly's presets and WingFit's blocs.
2. **Programs** -- Multi-week periodized plans (Week/Session hierarchy from Workout.cool). Replaces WingFit's simpler Program/Step model.

### 5.5 Local Storage: AsyncStorage vs localStorage vs SQLite

| Repo | Local Storage |
|------|--------------|
| Fitly | AsyncStorage (water, nutrition, streaks) |
| Workout.cool | Browser localStorage (active sessions) |
| WingFit | SQLite (everything) |

**Resolution:**
- **MMKV** for hot data (active workout session, user preferences) -- 30x faster than AsyncStorage
- **Supabase** for all persisted data (no local-only data that can't sync)
- Active sessions write to MMKV during workout, sync to Supabase on completion
- Offline queue pattern: failed writes are queued in MMKV and retried on connectivity

### 5.6 Search: Fuse.js vs pg_trgm

| Repo | Search |
|------|--------|
| Workout.cool | Fuse.js (client-side fuzzy) |
| ExerciseDB | Fuse.js (server-side fuzzy) |

**Resolution:** **PostgreSQL `pg_trgm`** extension with GIN indexes.
- Server-side, no client computation
- Works with Supabase's `.textSearch()` and `.ilike()` methods
- Trigram similarity handles typos and partial matches
- Combined with array containment for multi-criteria filtering

---

## 6. Module Architecture

```
src/
├── app/                              # Expo Router (file-based)
│   ├── _layout.tsx                   # Root: AuthProvider > QueryProvider
│   ├── index.tsx                     # Entry redirect
│   ├── (auth)/                       # Auth screens
│   │   ├── onboarding.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/                       # Main tab navigator
│   │   ├── _layout.tsx               # Bottom tabs
│   │   ├── index.tsx                 # Dashboard / Home
│   │   ├── workout.tsx               # Workout hub
│   │   ├── social.tsx                # Feed
│   │   ├── progress.tsx              # Stats & PRs
│   │   └── profile.tsx               # Settings & profile
│   ├── workout/
│   │   ├── builder.tsx               # 3-step workout generator
│   │   ├── session/[id].tsx          # Active workout session
│   │   ├── template/[id].tsx         # Template detail/edit
│   │   └── history.tsx               # Past sessions
│   ├── program/
│   │   ├── [id].tsx                  # Program detail
│   │   └── session/[id].tsx          # Active program session
│   ├── exercise/[id].tsx             # Exercise detail (GIF, instructions)
│   ├── social/
│   │   ├── friends.tsx
│   │   ├── post/[id].tsx
│   │   └── challenge/[id].tsx
│   └── settings/
│       ├── body.tsx                  # Body metrics, BMI/BMR
│       ├── nutrition.tsx             # Calorie goal, meal log
│       └── integrations.tsx          # Health app connections
│
├── modules/                          # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── hooks/                    # useAuth, useSession
│   │   ├── components/               # AuthForm, OAuthButtons
│   │   └── utils/                    # Token helpers
│   │
│   ├── exercises/
│   │   ├── hooks/                    # useExercises, useExerciseSearch
│   │   ├── components/               # ExerciseCard, ExerciseFilter, ExerciseDetail
│   │   ├── store/                    # exerciseFilterStore (Zustand)
│   │   └── api/                      # Supabase queries
│   │
│   ├── workouts/
│   │   ├── hooks/                    # useWorkoutSession, useTemplates
│   │   ├── components/               # SetRow, ExerciseSetList, Timer, RestTimer
│   │   ├── store/                    # workoutSessionStore (Zustand + MMKV)
│   │   ├── api/                      # Supabase queries + Edge Function calls
│   │   └── utils/                    # Volume calc, unit conversion, offline sync
│   │
│   ├── programs/
│   │   ├── hooks/                    # useProgram, useEnrollment
│   │   ├── components/               # ProgramCard, WeekView, ProgressBar
│   │   └── api/
│   │
│   ├── tracking/
│   │   ├── hooks/                    # useDailyMetrics, useSteps, useWater
│   │   ├── components/               # WaterTracker, NutritionLog, StepCounter
│   │   ├── store/                    # dailyMetricsStore
│   │   └── api/
│   │
│   ├── social/
│   │   ├── hooks/                    # useFeed, useFriends, useChallenges
│   │   ├── components/               # FeedPost, ReactionBar, ChallengeCard
│   │   ├── store/                    # feedStore, notificationStore
│   │   └── api/
│   │
│   ├── analytics/
│   │   ├── hooks/                    # useStats, usePRChart, useVolumeChart
│   │   ├── components/               # VolumeChart, MuscleHeatmap, PRTimeline
│   │   └── api/
│   │
│   └── profile/
│       ├── hooks/                    # useProfile, useStreak
│       ├── components/               # ProfileCard, StreakBadge, SettingsForm
│       └── api/
│
├── shared/
│   ├── components/                   # Button, Card, Modal, ProgressCircle, etc.
│   ├── hooks/                        # useSupabase, useOfflineQueue, useHealthKit
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client init
│   │   ├── mmkv.ts                  # MMKV storage init
│   │   ├── offline-queue.ts         # Retry queue for failed mutations
│   │   └── unit-conversion.ts       # kg<->lbs, km<->mi
│   ├── types/                        # Global TypeScript types
│   └── constants/                    # Muscles, equipment, body parts enums
│
├── assets/
│   └── data/
│       └── seed-exercises.json       # ExerciseDB data for offline fallback
│
└── supabase/
    ├── migrations/                   # SQL migration files
    ├── functions/                    # Edge Functions (Deno/TypeScript)
    │   ├── complete-workout/
    │   ├── generate-workout/
    │   ├── sync-workout-session/
    │   ├── social-feed/
    │   ├── calculate-statistics/
    │   ├── import-health-data/
    │   ├── update-challenge-progress/
    │   ├── send-notification/
    │   └── program-progress/
    └── seed.sql                      # Exercise catalog seed data
```

---

## 7. Data Flow Diagrams

### 7.1 Active Workout Session (offline-first)

```
User taps "Start Workout"
        │
        v
┌─────────────────────┐
│ workoutSessionStore  │  Zustand store (in-memory)
│ + MMKV persistence   │  Survives app kill / crash
└──────────┬──────────┘
           │  User logs sets, completes exercises
           v
┌─────────────────────┐
│ User taps "Finish"  │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐     ┌──────────────────────────┐
│ Edge Function:       │────>│ Auto-detect new PRs      │
│ complete-workout     │     │ Update streak             │
│                      │────>│ Create feed post          │
│                      │     │ Update challenge progress  │
└──────────┬──────────┘     └──────────────────────────┘
           │
           v
┌─────────────────────┐
│ PostgreSQL           │  Session + sets persisted
│ (workout_sessions,   │  PR values created
│  exercise_sets,      │  Feed post visible to friends
│  personal_records)   │
└─────────────────────┘
```

### 7.2 Offline Sync

```
  No connectivity during workout
              │
              v
  ┌──────────────────────┐
  │ MMKV: queue session   │
  │ is_synced = false     │
  └──────────┬───────────┘
             │  App regains connectivity
             v
  ┌──────────────────────┐
  │ offlineQueue.flush()  │  Retries all pending writes
  └──────────┬───────────┘
             │
             v
  ┌──────────────────────┐
  │ Edge Function:        │  Handles dedup via session UUID
  │ sync-workout-session  │  Last-write-wins for conflicts
  └──────────────────────┘
```

---

## 8. Tech Stack Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Mobile Framework** | Expo SDK 52 + React Native 0.76 | From Fitly -- battle-tested, OTA updates |
| **Routing** | expo-router v4 | File-based, type-safe, deep linking |
| **Styling** | NativeWind (Tailwind) | From Fitly -- consistent with web mental model |
| **State (client)** | Zustand | Used by both Fitly and Workout.cool |
| **State (server)** | TanStack Query | From Workout.cool -- caching, dedup, background refetch |
| **Local Storage** | MMKV | 30x faster than AsyncStorage, synchronous |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions + Storage) | Unified platform, no custom server |
| **Auth** | Supabase Auth | Replaces Clerk, Better Auth, custom JWT |
| **Charts** | Victory Native / react-native-chart-kit | React Native compatible |
| **Lists** | @shopify/flash-list | From Fitly -- 5x faster than FlatList |
| **Image Loading** | expo-image | CDN caching for exercise GIFs |
| **Health Data** | react-native-health + expo-sensors | From Fitly -- HealthKit (iOS), Health Connect (Android) |
| **Payments** | RevenueCat | From Workout.cool -- handles iOS/Android IAP |
| **Push Notifications** | Expo Notifications | Native to the platform |

---

## 9. Migration & Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
- [ ] Fork Fitly repo as base
- [ ] Replace Clerk with Supabase Auth
- [ ] Set up Supabase project with full schema migration
- [ ] Seed exercise catalog from ExerciseDB JSON
- [ ] Implement MMKV for local persistence
- [ ] Configure TanStack Query

### Phase 2: Workout Engine (Weeks 4-7)
- [ ] Port workout builder from Workout.cool (3-step wizard)
- [ ] Build active session screen with set logging
- [ ] Implement offline-first session store (Zustand + MMKV)
- [ ] Build `complete-workout` Edge Function (PR detection, streak)
- [ ] Port workout templates CRUD
- [ ] Implement exercise search with `pg_trgm`

### Phase 3: Programs & Tracking (Weeks 8-10)
- [ ] Port program model (programs/weeks/sessions)
- [ ] Build enrollment and progression logic
- [ ] Implement daily metrics tracking (water, nutrition, weight, steps)
- [ ] Port nutrition tracking from Fitly (upgrade to Supabase)
- [ ] Port PR tracking from WingFit

### Phase 4: Analytics (Weeks 11-12)
- [ ] Build `calculate-statistics` Edge Function
- [ ] Volume over time charts
- [ ] Muscle group heatmap
- [ ] PR progression timeline
- [ ] Workout frequency analysis
- [ ] Port health data import (Apple Watch, Whoop) from WingFit

### Phase 5: Social (Weeks 13-15)
- [ ] Implement friend system
- [ ] Build activity feed with auto-generated posts
- [ ] Add reactions and comments
- [ ] Implement challenges with realtime leaderboards
- [ ] Push notifications

### Phase 6: Polish (Weeks 16-17)
- [ ] Premium/billing integration (RevenueCat)
- [ ] Onboarding flow refinement
- [ ] Performance optimization (lazy loading, image caching)
- [ ] Accessibility pass
- [ ] App store submission prep

---

## 10. Scalability Considerations

| Concern | Strategy |
|---------|----------|
| **Exercise search latency** | `pg_trgm` GIN index + client-side debounce. Consider Supabase full-text search for >10K exercises |
| **Feed query performance** | Cursor-based pagination. Denormalize reaction counts on `feed_posts`. Consider materialized view for friend-filtered feeds |
| **Offline data growth** | Cap MMKV queue at 50 sessions. Alert user to sync. Auto-sync on WiFi via NetInfo listener |
| **GIF bandwidth** | `expo-image` disk cache (50MB). Lazy load GIFs only on exercise detail view. Use static thumbnails in lists |
| **Realtime connections** | Supabase Realtime channels scoped per user/challenge. Unsubscribe on screen blur |
| **Database growth** | Partition `exercise_sets` by month if >100M rows. Archive sessions older than 2 years to cold storage |
| **Multi-region** | Supabase supports read replicas. Start single-region, add replicas when P95 latency > 200ms |
