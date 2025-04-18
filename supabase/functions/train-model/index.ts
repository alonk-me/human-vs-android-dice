import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as tf from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.12.0/+esm'

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

    // Fetch comprehensive game data with extended history
    const { data: gameData, error: gameError } = await supabaseClient
      .from('game_events')
      .select(`
        *,
        game_sessions (
          winner_id,
          loser_id,
          round_count
        )
      `)
      .order('created_at', { ascending: false })
      .limit(2000)  // Increased from 1000 to capture more game diversity

    if (gameError) throw gameError

    const processedData = processGameData(gameData)

    const model = createModel()
    const { 
      accuracy, 
      loss, 
      valAccuracy, 
      valLoss 
    } = await trainModel(model, processedData)

    const { data: modelData, error: modelError } = await supabaseClient
      .from('ml_models')
      .insert({
        model_name: 'liars_dice_v3',
        win_rate: accuracy,
        version: 3,
        parameters: {
          games_analyzed: processedData.length,
          final_training_loss: loss,
          final_validation_loss: valLoss,
          final_training_accuracy: accuracy,
          final_validation_accuracy: valAccuracy,
          training_features: Object.keys(processedData[0] || {}),
          model_complexity: {
            input_neurons: 4,
            hidden_layer1_neurons: 16,
            hidden_layer2_neurons: 8
          }
        }
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({ 
        success: true, 
        model: modelData,
        accuracy,
        loss
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('ML Training Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Process game events into a format suitable for ML training
function processGameData(gameEvents) {
  const trainingData = []

  gameEvents.forEach(event => {
    // Extract meaningful features from game events
    if (event.event_type === 'bet' || event.event_type === 'challenge') {
      trainingData.push({
        player_id: event.player_id,
        round: event.round,
        bet_quantity: event.data?.quantity || 0,
        bet_value: event.data?.value || 0,
        is_winner: event.game_sessions?.winner_id === event.player_id,
        event_type: event.event_type
      })
    }
  })

  return trainingData
}

// Create a simple neural network model
function createModel() {
  const model = tf.sequential()
  
  // Input layer
  model.add(tf.layers.dense({
    inputShape: [4], // bet_quantity, bet_value, round, event_type
    units: 16,
    activation: 'relu'
  }))
  
  // Hidden layer
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }))
  
  // Output layer (binary classification: winner or loser)
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid'
  }))

  // Compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  })

  return model
}

// Update trainModel to return validation metrics
async function trainModel(model, data) {
  const features = data.map(d => [
    d.bet_quantity,
    d.bet_value,
    d.round,
    d.event_type === 'bet' ? 1 : 0
  ])
  const labels = data.map(d => d.is_winner ? 1 : 0)

  const xs = tf.tensor2d(features)
  const ys = tf.tensor2d(labels, [labels.length, 1])

  const history = await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,  // 20% of data for validation
  })

  return {
    accuracy: history.history.acc[history.history.acc.length - 1],
    loss: history.history.loss[history.history.loss.length - 1],
    valAccuracy: history.history.val_acc[history.history.val_acc.length - 1],
    valLoss: history.history.val_loss[history.history.val_loss.length - 1]
  }
}
