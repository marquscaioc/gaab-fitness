-- ============================================
-- Migration 006: Social features
-- ============================================

CREATE TABLE public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE public.feed_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type     TEXT NOT NULL CHECK (post_type IN (
    'workout_completed', 'pr_achieved', 'streak_milestone',
    'program_completed', 'challenge_won', 'manual'
  )),
  session_id    UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  pr_id         UUID REFERENCES public.personal_records(id) ON DELETE SET NULL,
  content       TEXT,
  media_url     TEXT,
  visibility    TEXT NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_posts_created ON public.feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_user    ON public.feed_posts(user_id, created_at DESC);

CREATE TABLE public.post_reactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji     TEXT NOT NULL DEFAULT 'fire',
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  challenge_type  TEXT NOT NULL CHECK (challenge_type IN ('volume', 'frequency', 'streak', 'distance', 'custom')),
  target_value    NUMERIC,
  target_unit     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value NUMERIC NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Friendships
CREATE POLICY "Users see own friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own friendships"
  ON public.friendships FOR UPDATE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Feed posts: own + friends' (accepted) + public
CREATE POLICY "Users see own, friends', and public posts"
  ON public.feed_posts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = feed_posts.user_id)
          OR (addressee_id = auth.uid() AND requester_id = feed_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users create own posts"
  ON public.feed_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own posts"
  ON public.feed_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Reactions/Comments: read on visible posts, write own
CREATE POLICY "Read reactions on visible posts"
  ON public.post_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE feed_posts.id = post_reactions.post_id
      AND (
        feed_posts.user_id = auth.uid()
        OR feed_posts.visibility = 'public'
        OR (feed_posts.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = feed_posts.user_id)
            OR (addressee_id = auth.uid() AND requester_id = feed_posts.user_id)
          )
        ))
      )
    )
  );

CREATE POLICY "Users manage own reactions"
  ON public.post_reactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Read comments on visible posts"
  ON public.post_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feed_posts
      WHERE feed_posts.id = post_comments.post_id
      AND (
        feed_posts.user_id = auth.uid()
        OR feed_posts.visibility = 'public'
        OR (feed_posts.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'accepted'
          AND (
            (requester_id = auth.uid() AND addressee_id = feed_posts.user_id)
            OR (addressee_id = auth.uid() AND requester_id = feed_posts.user_id)
          )
        ))
      )
    )
  );

CREATE POLICY "Users create own comments"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own comments"
  ON public.post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Challenges
CREATE POLICY "Anyone can see challenges"
  ON public.challenges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users create own challenges"
  ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators manage own challenges"
  ON public.challenges FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Users see challenge participants"
  ON public.challenge_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users manage own participation"
  ON public.challenge_participants FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
