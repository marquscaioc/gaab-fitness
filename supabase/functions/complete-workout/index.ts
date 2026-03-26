import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { session_id, rating, notes } = await req.json()

    // 1. Update session with rating/notes
    if (rating || notes) {
      await supabase
        .from('workout_sessions')
        .update({ rating, notes })
        .eq('id', session_id)
        .eq('user_id', user.id)
    }

    // 2. Fetch the completed session with sets
    const { data: session } = await supabase
      .from('workout_sessions')
      .select('*, session_exercises(*, exercises(name, target_muscles), exercise_sets(*))')
      .eq('id', session_id)
      .single()

    if (!session) return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 })

    // 3. Auto-detect PRs
    const newPRs: any[] = []
    for (const se of session.session_exercises || []) {
      const exerciseName = se.exercises?.name || 'Unknown'
      for (const set of se.exercise_sets || []) {
        if (!set.completed || !set.weight || !set.reps) continue

        const volume = set.weight * set.reps

        // Check existing PR for this exercise (weight type)
        const { data: existingPR } = await supabase
          .from('personal_records')
          .select('*, pr_values(*)')
          .eq('user_id', user.id)
          .eq('exercise_id', se.exercise_id)
          .eq('record_type', 'weight')
          .maybeSingle()

        if (existingPR) {
          const maxValue = Math.max(...(existingPR.pr_values || []).map((v: any) => v.value))
          if (set.weight > maxValue) {
            await supabase.from('pr_values').insert({
              pr_id: existingPR.id,
              value: set.weight,
              unit: set.weight_unit || 'kg',
            })
            newPRs.push({ name: `${exerciseName} 1RM`, value: set.weight, unit: set.weight_unit })
          }
        } else {
          // Create new PR
          const { data: newPR } = await supabase
            .from('personal_records')
            .insert({
              user_id: user.id,
              exercise_id: se.exercise_id,
              name: `${exerciseName} Max Weight`,
              record_type: 'weight',
            })
            .select()
            .single()

          if (newPR) {
            await supabase.from('pr_values').insert({
              pr_id: newPR.id,
              value: set.weight,
              unit: set.weight_unit || 'kg',
            })
            newPRs.push({ name: newPR.name, value: set.weight, unit: set.weight_unit })
          }
        }
      }
    }

    // 4. Update streak
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_count, longest_streak')
      .eq('id', user.id)
      .single()

    // Check if yesterday had a workout
    const { count: yesterdayCount } = await supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('started_at', `${yesterday}T00:00:00`)
      .lt('started_at', `${today}T00:00:00`)

    let newStreak = 1
    if (yesterdayCount && yesterdayCount > 0) {
      newStreak = (profile?.streak_count || 0) + 1
    }

    const longestStreak = Math.max(newStreak, profile?.longest_streak || 0)

    await supabase
      .from('profiles')
      .update({ streak_count: newStreak, longest_streak: longestStreak })
      .eq('id', user.id)

    // 5. Create feed post
    const muscles = [...new Set(
      (session.session_exercises || []).flatMap((se: any) => se.exercises?.target_muscles || [])
    )]

    const content = `Completed ${session.name || 'a workout'} - ${session.session_exercises?.length || 0} exercises, ${muscles.join(', ')}`

    const { data: feedPost } = await supabase
      .from('feed_posts')
      .insert({
        user_id: user.id,
        post_type: 'workout_completed',
        session_id: session_id,
        content,
        visibility: 'friends',
      })
      .select()
      .single()

    // Create PR posts
    for (const pr of newPRs) {
      await supabase.from('feed_posts').insert({
        user_id: user.id,
        post_type: 'pr_achieved',
        content: `New PR: ${pr.name} - ${pr.value} ${pr.unit}`,
        visibility: 'friends',
      })
    }

    return new Response(
      JSON.stringify({
        session,
        new_prs: newPRs,
        feed_post_id: feedPost?.id,
        streak_count: newStreak,
        longest_streak: longestStreak,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
