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
  
  // Count how many matching dice the AI has (including 1s as wilds)
  const matchingDiceCount = aiDice.filter(die => 
    die.value === currentBet.value || die.value === 1
  ).length;
  
  // Estimated total of specific dice value based on AI's knowledge
  let estimatedTotal = matchingDiceCount;
  
  // Add probabilistic estimation based on remaining dice
  // Consider that ~1/6 of remaining dice might be the target value
  // and ~1/6 might be 1s (which act as wild)
  const remainingDice = totalDiceInGame - aiDice.length;
  const probableMatchingDice = Math.floor(remainingDice / 6 * 2); // Both target values and 1s
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
  
  // Count AI's dice by value, accounting for 1s being wild
  const aiDiceCounts: Record<DiceValue, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  };
  
  // Count actual dice values
  aiDice.forEach(die => {
    aiDiceCounts[die.value]++;
  });
  
  // Create effective counts considering 1s as wilds
  const wildCount = aiDiceCounts[1];
  const effectiveCounts: Record<DiceValue, number> = { ...aiDiceCounts };
  
  // Add the wild count to each non-1 value
  for (let i = 2; i <= 6; i++) {
    effectiveCounts[i as DiceValue] += wildCount;
  }
  
  // Find the most common value in AI's hand (considering wilds)
  let bestValue: DiceValue = 6; // Prefer higher values
  let maxCount = 0;
  
  // Skip 1s since we're treating them as wild for other values
  (Object.entries(effectiveCounts) as [string, number][]).forEach(([value, count]) => {
    const numValue = parseInt(value) as DiceValue;
    if (numValue !== 1 && count >= maxCount) {
      maxCount = count;
      bestValue = numValue;
    }
  });
  
  // If we already have a current bet, we need to raise it based on the new rules
  if (currentBet) {
    // Strategy depends on difficulty
    switch (difficulty) {
      case 'easy':
        // Easy AI tends to bid conservatively
        if (Math.random() > 0.7) {
          // Sometimes keep same quantity but increase value
          return {
            quantity: currentBet.quantity,
            value: getNextValue(currentBet.value)
          };
        } else {
          // Otherwise increase quantity with same or random value
          const randomValue = (1 + Math.floor(Math.random() * 6)) as DiceValue;
          return {
            quantity: currentBet.quantity + 1,
            value: randomValue
          };
        }
        
      case 'hard':
        // Hard AI makes more strategic bets
        
        // If AI has a strong hand of a particular value (including wilds)
        if (effectiveCounts[bestValue] >= 2) {
          // If the current bet is already on our strong value, raise quantity
          if (bestValue === currentBet.value) {
            return {
              quantity: currentBet.quantity + 1,
              value: bestValue
            };
          }
          
          // If our best value is higher than current bet, keep quantity but switch to our value
          if (bestValue > currentBet.value) {
            return {
              quantity: currentBet.quantity,
              value: bestValue
            };
          }
        }
        
        // Fall through to medium difficulty for other cases
        
      case 'medium':
      default:
        // Medium difficulty - balanced approach with new rules
        const shouldRaiseQuantity = Math.random() > 0.5;
        
        if (shouldRaiseQuantity) {
          // Raise quantity and pick a good value
          return {
            quantity: currentBet.quantity + 1,
            value: effectiveCounts[bestValue] > 0 ? bestValue : (2 + Math.floor(Math.random() * 5)) as DiceValue
          };
        } else if (currentBet.value < 6) {
          // Keep quantity and raise value
          return {
            quantity: currentBet.quantity,
            value: getNextValue(currentBet.value)
          };
        } else {
          // If we can't raise value (already at 6), must raise quantity
          return {
            quantity: currentBet.quantity + 1,
            value: (2 + Math.floor(Math.random() * 5)) as DiceValue
          };
        }
    }
  } else {
    // No current bet, start with something based on AI's dice
    const estimatedQuantity = Math.max(
      1,
      Math.floor((totalDiceInGame / 3) * (difficulty === 'easy' ? 0.8 : 1))
    );
    
    // Start with the most common value in AI's hand, or a random one if none stands out
    return {
      quantity: estimatedQuantity,
      value: maxCount > 0 ? bestValue : (2 + Math.floor(Math.random() * 5)) as DiceValue // 2-6 (skip 1)
    };
  }
};

// Helper functions
const getNextValue = (value: DiceValue): DiceValue => {
  if (value === 6) return 2; // Skip 1 since it's wild
  return (value + 1) as DiceValue;
};

const getValueRank = (value: DiceValue): number => {
  return value; // Simple ranking by face value
};

const canBidValue = (currentBet: Bet | null, newValue: DiceValue): boolean => {
  if (!currentBet) return true;
  
  // Can always bid current value with higher quantity
  if (newValue === currentBet.value) return true;
  
  // Rules for changing value depend on the game variant
  // In this implementation:
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
