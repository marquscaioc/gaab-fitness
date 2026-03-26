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

    const { enrollment_id, session_id } = await req.json()

    // Fetch enrollment
    const { data: enrollment } = await supabase
      .from('program_enrollments')
      .select('*, programs(*, program_weeks(*, program_sessions(*)))')
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .single()

    if (!enrollment) {
      return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404 })
    }

    const program = enrollment.programs
    const weeks = (program?.program_weeks || []).sort((a: any, b: any) => a.week_number - b.week_number)

    // Find current position
    let currentWeek = enrollment.current_week
    let currentSession = enrollment.current_session
    let completed = false

    // Advance to next session
    const currentWeekData = weeks.find((w: any) => w.week_number === currentWeek)
    const sessionsInWeek = (currentWeekData?.program_sessions || [])
      .sort((a: any, b: any) => a.session_number - b.session_number)

    if (currentSession >= sessionsInWeek.length) {
      // Move to next week
      if (currentWeek >= weeks.length) {
        // Program complete!
        completed = true
        await supabase
          .from('program_enrollments')
          .update({ is_active: false, completed_at: new Date().toISOString() })
          .eq('id', enrollment_id)

        // Create feed post
        await supabase.from('feed_posts').insert({
          user_id: user.id,
          post_type: 'program_completed',
          content: `Completed the "${program.name}" program!`,
          visibility: 'friends',
        })
      } else {
        currentWeek++
        currentSession = 1
        await supabase
          .from('program_enrollments')
          .update({ current_week: currentWeek, current_session: currentSession })
          .eq('id', enrollment_id)
      }
    } else {
      currentSession++
      await supabase
        .from('program_enrollments')
        .update({ current_session: currentSession })
        .eq('id', enrollment_id)
    }

    // Find next session info
    const nextWeekData = weeks.find((w: any) => w.week_number === currentWeek)
    const nextSessionData = (nextWeekData?.program_sessions || [])
      .find((s: any) => s.session_number === currentSession)

    return new Response(
      JSON.stringify({
        completed,
        current_week: currentWeek,
        current_session: currentSession,
        next_session: nextSessionData || null,
        total_weeks: weeks.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
