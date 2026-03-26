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

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'month'
    const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Calculate date range
    const endDate = new Date(dateParam)
    const startDate = new Date(dateParam)
    if (period === 'week') startDate.setDate(endDate.getDate() - 7)
    else if (period === 'month') startDate.setMonth(endDate.getMonth() - 1)
    else if (period === 'quarter') startDate.setMonth(endDate.getMonth() - 3)
    else if (period === 'year') startDate.setFullYear(endDate.getFullYear() - 1)

    const startStr = startDate.toISOString()
    const endStr = endDate.toISOString()

    // 1. Fetch sessions with sets
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*, session_exercises(*, exercises(target_muscles), exercise_sets(weight, reps, completed, duration_s))')
      .eq('user_id', user.id)
      .gte('started_at', startStr)
      .lte('started_at', endStr)
      .order('started_at', { ascending: true })

    // 2. Volume over time
    const volumeByDate: Record<string, number> = {}
    for (const s of sessions || []) {
      const date = s.started_at.split('T')[0]
      const sessionVolume = (s.session_exercises || []).reduce((sum: number, se: any) => {
        return sum + (se.exercise_sets || []).reduce((setSum: number, set: any) => {
          return setSum + (set.completed && set.weight && set.reps ? set.weight * set.reps : 0)
        }, 0)
      }, 0)
      volumeByDate[date] = (volumeByDate[date] || 0) + sessionVolume
    }
    const volume_over_time = Object.entries(volumeByDate).map(([date, volume]) => ({ date, volume_kg: volume }))

    // 3. Workout frequency by weekday
    const weekdayCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (const s of sessions || []) {
      const day = weekdays[new Date(s.started_at).getDay()]
      weekdayCounts[day]++
    }
    const frequency = Object.entries(weekdayCounts).map(([weekday, count]) => ({ weekday, sessions: count }))

    // 4. Muscle heatmap
    const muscleSets: Record<string, number> = {}
    for (const s of sessions || []) {
      for (const se of s.session_exercises || []) {
        const muscles = se.exercises?.target_muscles || []
        const setCount = (se.exercise_sets || []).filter((set: any) => set.completed).length
        for (const muscle of muscles) {
          muscleSets[muscle] = (muscleSets[muscle] || 0) + setCount
        }
      }
    }
    const muscle_heatmap = Object.entries(muscleSets)
      .map(([muscle, sets]) => ({ muscle, sets }))
      .sort((a, b) => b.sets - a.sets)

    // 5. Category duration split
    const categoryDuration: Record<string, number> = {}
    for (const s of sessions || []) {
      const category = s.name || 'uncategorized'
      categoryDuration[category] = (categoryDuration[category] || 0) + (s.duration_s || 0)
    }
    const category_split = Object.entries(categoryDuration).map(([category, total_seconds]) => ({
      category,
      total_minutes: Math.round(total_seconds / 60),
    }))

    // 6. PR timeline
    const { data: prs } = await supabase
      .from('personal_records')
      .select('name, pr_values(value, unit, recorded_at)')
      .eq('user_id', user.id)

    const pr_timeline = (prs || []).map((pr: any) => ({
      name: pr.name,
      values: (pr.pr_values || [])
        .sort((a: any, b: any) => a.recorded_at.localeCompare(b.recorded_at))
        .map((v: any) => ({ date: v.recorded_at, value: v.value, unit: v.unit })),
    }))

    return new Response(
      JSON.stringify({
        volume_over_time,
        frequency,
        muscle_heatmap,
        category_split,
        pr_timeline,
        total_sessions: sessions?.length || 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
