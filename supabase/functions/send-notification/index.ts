import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, type, title, body, data } = await req.json()

    if (!user_id || !type || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, type, title' }),
        { status: 400 }
      )
    }

    // Insert notification into DB
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        body: body || null,
        data: data || null,
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Send push notification via Expo Push API
    // This requires storing push tokens in a user_push_tokens table
    // and calling https://exp.host/--/api/v2/push/send
    //
    // For now, the notification is stored in the database
    // and will be picked up by the realtime subscription on the client

    return new Response(
      JSON.stringify({ notification }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
