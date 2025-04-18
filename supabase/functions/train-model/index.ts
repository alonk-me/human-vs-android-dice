
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch recent game data for training
    const { data: gameData, error: gameError } = await supabaseClient
      .from('game_events')
      .select(`
        *,
        game_sessions (
          winner_id,
          loser_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (gameError) throw gameError

    // Here we would typically:
    // 1. Process the game data into training format
    // 2. Train or update the ML model
    // 3. Save the new model parameters
    
    // For now, we'll just save some basic statistics
    const totalGames = gameData.length
    const winningMoves = gameData.filter(event => 
      event.game_sessions?.winner_id === event.player_id
    )
    
    // Store model update in database
    const { data: modelData, error: modelError } = await supabaseClient
      .from('ml_models')
      .insert({
        model_name: 'liars_dice_v1',
        win_rate: winningMoves.length / totalGames,
        version: 1,
        parameters: {
          games_analyzed: totalGames,
          winning_moves: winningMoves.length
        }
      })
      .select()
      .single()

    if (modelError) throw modelError

    return new Response(
      JSON.stringify({ success: true, model: modelData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
