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

    const { session_id } = await req.json()

    // Get all active challenges the user is participating in
    const { data: participations } = await supabase
      .from('challenge_participants')
      .select('*, challenges(*)')
      .eq('user_id', user.id)

    const activeChallenges = (participations || []).filter((p: any) => {
      const challenge = p.challenges
      return challenge && new Date(challenge.ends_at) > new Date()
    })

    const updates: any[] = []

    for (const participation of activeChallenges) {
      const challenge = participation.challenges
      let newValue = participation.current_value

      switch (challenge.challenge_type) {
        case 'frequency': {
          // Count total sessions during challenge period
          const { count } = await supabase
            .from('workout_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('started_at', challenge.starts_at)
            .lte('started_at', challenge.ends_at)

          newValue = count || 0
          break
        }

        case 'volume': {
          // Sum total volume during challenge period
          const { data: sessions } = await supabase
            .from('workout_sessions')
            .select('session_exercises(exercise_sets(weight, reps, completed))')
            .eq('user_id', user.id)
            .gte('started_at', challenge.starts_at)
            .lte('started_at', challenge.ends_at)

          let totalVolume = 0
          for (const s of sessions || []) {
            for (const se of (s as any).session_exercises || []) {
              for (const set of se.exercise_sets || []) {
                if (set.completed && set.weight && set.reps) {
                  totalVolume += set.weight * set.reps
                }
              }
            }
          }
          newValue = totalVolume
          break
        }

        case 'streak': {
          // Get user's current streak
          const { data: profile } = await supabase
            .from('profiles')
            .select('streak_count')
            .eq('id', user.id)
            .single()

          newValue = profile?.streak_count || 0
          break
        }

        default:
          // Custom type - just increment
          newValue = participation.current_value + 1
      }

      // Update participant value
      await supabase
        .from('challenge_participants')
        .update({ current_value: newValue })
        .eq('id', participation.id)

      updates.push({
        challenge_id: challenge.id,
        challenge_name: challenge.name,
        new_value: newValue,
      })
    }

    return new Response(
      JSON.stringify({ updated: updates }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
