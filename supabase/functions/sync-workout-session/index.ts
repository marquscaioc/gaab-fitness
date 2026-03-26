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

    const { sessions } = await req.json()

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return new Response(JSON.stringify({ synced: [], conflicts: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const synced: string[] = []
    const conflicts: { id: string; reason: string }[] = []

    for (const session of sessions) {
      try {
        // Check if session already exists (dedup by ID)
        const { data: existing } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('id', session.id)
          .maybeSingle()

        if (existing) {
          // Already synced, skip
          synced.push(session.id)
          continue
        }

        // Insert session
        const { error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            id: session.id,
            user_id: user.id,
            template_id: session.templateId || null,
            name: session.name,
            started_at: session.startedAt,
            ended_at: session.endedAt || new Date().toISOString(),
            duration_s: session.durationS || null,
            rating: session.rating || null,
            notes: session.notes || null,
            is_synced: true,
          })

        if (sessionError) {
          conflicts.push({ id: session.id, reason: sessionError.message })
          continue
        }

        // Insert exercises and sets
        for (const exercise of session.exercises || []) {
          const { data: seData, error: seError } = await supabase
            .from('session_exercises')
            .insert({
              session_id: session.id,
              exercise_id: exercise.exerciseId,
              sort_order: exercise.sortOrder || 0,
            })
            .select()
            .single()

          if (seError) continue

          const completedSets = (exercise.sets || []).filter((s: any) => s.completed)
          if (completedSets.length > 0) {
            await supabase.from('exercise_sets').insert(
              completedSets.map((set: any) => ({
                session_exercise_id: seData.id,
                set_index: set.setIndex,
                set_type: set.setType || 'normal',
                weight: set.weight || null,
                weight_unit: set.weightUnit || 'kg',
                reps: set.reps || null,
                duration_s: set.durationS || null,
                distance_m: set.distanceM || null,
                completed: true,
                rpe: set.rpe || null,
              }))
            )
          }
        }

        synced.push(session.id)
      } catch (err: any) {
        conflicts.push({ id: session.id, reason: err.message || 'Unknown error' })
      }
    }

    return new Response(
      JSON.stringify({ synced, conflicts }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
