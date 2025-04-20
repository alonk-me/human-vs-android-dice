
import { GameState, Bet, DiceValue, Player } from "../types/game";
import { supabase } from "@/integrations/supabase/client";

// AI difficulty levels for future expansion
type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Calls the Supabase edge function 'ai-bot' to get AI move using OpenAI.
 */
export const getAIAction = async (
  gameState: GameState,
  aiPlayer: Player,
  difficulty: AIDifficulty = 'medium'
): Promise<{ action: 'bet' | 'challenge', bet?: { quantity: number, value: DiceValue } }> => {
  // Prepare compact and relevant game state summary for GPT
  const serializedState = {
    currentPlayerId: gameState.currentPlayerId,
    previousPlayerId: gameState.previousPlayerId,
    currentBet: gameState.currentBet,
    previousBet: gameState.previousBet,
    phase: gameState.phase,
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      diceCount: p.dice.length,
      isAI: p.isAI,
      isCurrentPlayer: p.isCurrentPlayer,
      // only show AI (self) dice values, others hidden
      dice: p.id === aiPlayer.id ? p.dice.map(d => d.value) : [],
    })),
    totalDiceInGame: gameState.totalDiceInGame,
    round: gameState.round,
    difficulty,
  };

  const prompt = `
You are the AI playing Liar's Dice as player "${aiPlayer.name}". Decide your next move based on the game state below.

Rules summary:
- You can either "bet" (make a higher bet) or "challenge" (call bluff).
- A bet must have higher quantity or same quantity but higher value than the last bet.
- 1's are wild and count as any value.
- Respond ONLY with a valid JSON object in the form: 
  {"action": "bet", "bet": {"quantity": X, "value": Y}} 
  or 
  {"action": "challenge"}

Game state:
${JSON.stringify(serializedState, null, 2)}
Your decision:
`;

  const { data, error } = await supabase.functions.invoke("ai-bot", {
    body: {
      messages: [
        {
          role: "system",
          content:
            "You are a Liar's Dice bot. Only respond with the correct JSON response according to user instructions. Never explain or add extra text.",
        },
        { role: "user", content: prompt },
      ],
    },
  });

  if (error) {
    console.error("AI bot error:", error);
    // Fallback: default to challenge on error
    return { action: "challenge" };
  }

  let result = typeof data?.result === "string" ? data.result : "";
  // Extract valid JSON from possibly extra text
  let openAIAction = null;
  try {
    // Some models might pre/postfix, so get first {...}
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      openAIAction = JSON.parse(match[0]);
    } else {
      openAIAction = JSON.parse(result);
    }
  } catch (e) {
    console.error("Failed to parse AI bot response:", result);
    // Fallback: challenge if response can't be parsed
    return { action: "challenge" };
  }

  // Validate and return response
  if (
    openAIAction &&
    (openAIAction.action === "bet" || openAIAction.action === "challenge")
  ) {
    if (
      openAIAction.action === "bet" &&
      openAIAction.bet &&
      typeof openAIAction.bet.quantity === "number" &&
      typeof openAIAction.bet.value === "number"
    ) {
      return {
        action: "bet",
        bet: {
          quantity: openAIAction.bet.quantity,
          value: openAIAction.bet.value as DiceValue,
        },
      };
    }
    if (openAIAction.action === "challenge") {
      return { action: "challenge" };
    }
  }
  // Fallback: challenge
  return { action: "challenge" };
}

// Remove all local logic; all decisions are now made via OpenAI

