import { GameState, Bet, DiceValue, Player } from "../types/game";

const MIN_DELAY = 1000;
const MAX_DELAY = 3000;

// AI difficulty levels for future expansion
type AIDifficulty = 'easy' | 'medium' | 'hard';

export const getAIAction = (
  gameState: GameState,
  aiPlayer: Player,
  difficulty: AIDifficulty = 'medium'
): Promise<{ action: 'bet' | 'challenge', bet?: { quantity: number, value: DiceValue } }> => {
  // Add randomized delay to make it feel more human-like
  const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Decision logic based on game state and AI's dice
      const shouldChallenge = decideToChallengeOrBet(gameState, aiPlayer, difficulty);
      
      if (shouldChallenge) {
        resolve({ action: 'challenge' });
      } else {
        const bet = calculateBet(gameState, aiPlayer, difficulty);
        resolve({ action: 'bet', bet });
      }
    }, delay);
  });
};

const decideToChallengeOrBet = (
  gameState: GameState,
  aiPlayer: Player,
  difficulty: AIDifficulty
): boolean => {
  if (!gameState.currentBet) {
    return false; // Can't challenge if there's no bet
  }
  
  const { currentBet, totalDiceInGame } = gameState;
  const aiDice = aiPlayer.dice;
  
  // Count how many matching dice the AI has
  const matchingDiceCount = aiDice.filter(die => die.value === currentBet.value).length;
  
  // Estimated total of specific dice value based on AI's knowledge
  let estimatedTotal = matchingDiceCount;
  
  // Add probabilistic estimation based on remaining dice
  const remainingDice = totalDiceInGame - aiDice.length;
  const probableMatchingDice = Math.floor(remainingDice / 6 * (currentBet.value === 1 ? 1.2 : 1));
  estimatedTotal += probableMatchingDice;
  
  // Decision threshold varies by difficulty
  let thresholdMultiplier;
  switch (difficulty) {
    case 'easy':
      thresholdMultiplier = 0.8; // More likely to make mistakes
      break;
    case 'medium':
      thresholdMultiplier = 1.0; // Balanced
      break;
    case 'hard':
      thresholdMultiplier = 1.2; // Smarter decisions
      break;
    default:
      thresholdMultiplier = 1.0;
  }
  
  // Challenge if the current bet seems too high based on AI's knowledge
  const challengeThreshold = estimatedTotal * thresholdMultiplier;
  
  // Small random element to make AI less predictable
  const randomFactor = Math.random() * 0.4 - 0.2; // -0.2 to +0.2
  
  return currentBet.quantity > (challengeThreshold + randomFactor);
};

const calculateBet = (
  gameState: GameState,
  aiPlayer: Player,
  difficulty: AIDifficulty
): { quantity: number, value: DiceValue } => {
  const { currentBet, totalDiceInGame } = gameState;
  const aiDice = aiPlayer.dice;
  
  // Count AI's dice by value
  const aiDiceCounts: Record<DiceValue, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  };
  
  aiDice.forEach(die => {
    aiDiceCounts[die.value]++;
  });
  
  // Find the most common value in AI's hand
  let bestValue: DiceValue = 1;
  let maxCount = 0;
  
  (Object.entries(aiDiceCounts) as [string, number][]).forEach(([value, count]) => {
    if (count > maxCount) {
      maxCount = count;
      bestValue = parseInt(value) as DiceValue;
    }
  });
  
  // If we already have a current bet, we need to raise it
  if (currentBet) {
    // Strategy depends on difficulty
    switch (difficulty) {
      case 'easy':
        // Easy AI tends to bid conservatively
        if (aiDiceCounts[currentBet.value] > 0) {
          // If AI has the current bet value, slightly increase quantity
          return {
            quantity: currentBet.quantity + 1,
            value: currentBet.value
          };
        } else {
          // Otherwise, keep the same quantity but increase value
          return {
            quantity: currentBet.quantity,
            value: getNextValue(currentBet.value)
          };
        }
        
      case 'hard':
        // Hard AI makes more strategic bets
        // Consider probability and psychological factors
        // This is a simplified version of what could be more complex
        
        // If AI has a strong hand of a particular value
        if (aiDiceCounts[bestValue] >= 2) {
          // More aggressive betting on strong hands
          if (canBidValue(currentBet, bestValue)) {
            return {
              quantity: Math.max(currentBet.quantity, Math.floor(totalDiceInGame / 4)),
              value: bestValue
            };
          }
        }
        
        // Fall through to medium difficulty for other cases
        
      case 'medium':
      default:
        // Medium difficulty - balanced approach
        if (getValueRank(bestValue) > getValueRank(currentBet.value)) {
          // If AI's best value is higher, bid it with minimal quantity increase
          return {
            quantity: currentBet.quantity,
            value: bestValue
          };
        } else if (aiDiceCounts[currentBet.value] > 0) {
          // If AI has current value, slightly increase quantity
          return {
            quantity: currentBet.quantity + 1,
            value: currentBet.value
          };
        } else {
          // Otherwise make a minimal valid increase
          if (currentBet.value < 6) {
            return {
              quantity: currentBet.quantity,
              value: getNextValue(currentBet.value)
            };
          } else {
            return {
              quantity: currentBet.quantity + 1,
              value: 1
            };
          }
        }
    }
  } else {
    // No current bet, start with something based on AI's dice
    const estimatedQuantity = Math.max(
      1,
      Math.floor((totalDiceInGame / 6) * (difficulty === 'easy' ? 0.8 : 1))
    );
    
    // Start with the most common value in AI's hand, or a random one if none stands out
    return {
      quantity: estimatedQuantity,
      value: maxCount > 0 ? bestValue : Math.ceil(Math.random() * 6) as DiceValue
    };
  }
};

// Helper functions
const getNextValue = (value: DiceValue): DiceValue => {
  return value < 6 ? ((value + 1) as DiceValue) : 1;
};

const getValueRank = (value: DiceValue): number => {
  return value === 1 ? 7 : value; // Consider 1 (aces) the highest value
};

const canBidValue = (currentBet: Bet | null, newValue: DiceValue): boolean => {
  if (!currentBet) return true;
  
  // Can always bid current value with higher quantity
  if (newValue === currentBet.value) return true;
  
  // Rules for changing value depend on the game variant
  // In this implementation we use the standard rule:
  // - Can increase value while keeping same quantity
  // - Can decrease value but must increase quantity
  
  const currentRank = getValueRank(currentBet.value);
  const newRank = getValueRank(newValue);
  
  if (newRank > currentRank) {
    return true; // Higher rank can keep same quantity
  } else {
    return false; // Would need to increase quantity, handled elsewhere
  }
};
