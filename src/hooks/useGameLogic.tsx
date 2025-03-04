
import { useState, useEffect, useCallback } from 'react';
import { 
  GameState, 
  GamePhase, 
  Player, 
  Dice, 
  DiceValue, 
  Bet, 
  GameEvent 
} from '@/types/game';
import { getAIAction } from '@/utils/aiPlayer';

const INITIAL_DICE_COUNT = 5;

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerId: '',
    previousPlayerId: null,
    currentBet: null,
    previousBet: null,
    phase: 'starting',
    winner: null,
    loser: null,
    roundWinner: null,
    roundLoser: null,
    diceCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    totalDiceInGame: 0,
    challengeResult: null,
    history: [],
    round: 0,
  });
  
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  // Initialize game
  const startGame = useCallback(() => {
    const humanPlayer: Player = {
      id: 'human',
      name: 'You',
      dice: generateDice(INITIAL_DICE_COUNT, 'human'),
      isAI: false,
      isCurrentPlayer: true,
    };
    
    const aiPlayer: Player = {
      id: 'ai',
      name: 'Android',
      dice: generateDice(INITIAL_DICE_COUNT, 'ai'),
      isAI: true,
      isCurrentPlayer: false,
    };
    
    const firstPlayerId = Math.random() < 0.5 ? 'human' : 'ai';
    
    const totalDiceCount = humanPlayer.dice.length + aiPlayer.dice.length;
    const diceCount = countDice([...humanPlayer.dice, ...aiPlayer.dice]);
    
    setGameState({
      players: [humanPlayer, aiPlayer],
      currentPlayerId: firstPlayerId,
      previousPlayerId: null,
      currentBet: null,
      previousBet: null,
      phase: 'betting',
      winner: null,
      loser: null,
      roundWinner: null,
      roundLoser: null,
      diceCount,
      totalDiceInGame: totalDiceCount,
      challengeResult: null,
      history: [],
      round: 1,
    });
    
    setIsGameStarted(true);
  }, []);
  
  // Place a bet
  const placeBet = useCallback((quantity: number, value: DiceValue) => {
    setGameState((prevState) => {
      // Validate bet
      if (prevState.phase !== 'betting') return prevState;
      
      const currentPlayer = prevState.players.find(p => p.id === prevState.currentPlayerId);
      if (!currentPlayer) return prevState;
      
      // Check if this is a valid bet
      if (prevState.currentBet) {
        const isValidQuantity = quantity > prevState.currentBet.quantity || 
          (quantity === prevState.currentBet.quantity && value > prevState.currentBet.value);
        
        if (!isValidQuantity) return prevState;
      }
      
      // Get the next player
      const nextPlayerIndex = prevState.players.findIndex(p => p.id === prevState.currentPlayerId) + 1;
      const nextPlayer = prevState.players[nextPlayerIndex % prevState.players.length];
      
      // Create the new bet
      const newBet: Bet = {
        playerId: currentPlayer.id,
        quantity,
        value,
      };
      
      // Add event to history
      const newEvent: GameEvent = {
        type: 'bet',
        playerId: currentPlayer.id,
        bet: newBet,
        timestamp: Date.now(),
      };
      
      return {
        ...prevState,
        currentBet: newBet,
        previousBet: prevState.currentBet,
        currentPlayerId: nextPlayer.id,
        previousPlayerId: currentPlayer.id,
        history: [...prevState.history, newEvent],
      };
    });
  }, []);
  
  // Challenge the current bet
  const challenge = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.phase !== 'betting' || !prevState.currentBet) return prevState;
      
      const currentPlayer = prevState.players.find(p => p.id === prevState.currentPlayerId);
      const previousPlayer = prevState.players.find(p => p.id === prevState.previousPlayerId);
      
      if (!currentPlayer || !previousPlayer) return prevState;
      
      // Count the actual dice matching the bet (including 1s as wild)
      const { quantity, value } = prevState.currentBet;
      
      // Get all dice in play
      const allDice = prevState.players.flatMap(player => player.dice);
      
      // Count how many dice match the value directly or are 1s (wild)
      const matchingDice = allDice.filter(die => die.value === value || die.value === 1);
      const actualCount = matchingDice.length;
      
      // Determine if challenge successful (bet was wrong)
      const isSuccessful = actualCount < quantity;
      
      // Determine the winner and loser of this round
      const roundWinner = isSuccessful ? currentPlayer.id : previousPlayer.id;
      const roundLoser = isSuccessful ? previousPlayer.id : currentPlayer.id;
      
      // Create the challenge event
      const challengeEvent: GameEvent = {
        type: 'challenge',
        playerId: currentPlayer.id,
        targetPlayerId: previousPlayer.id,
        timestamp: Date.now(),
      };
      
      // Create the result event
      const resultEvent: GameEvent = {
        type: 'result',
        playerId: currentPlayer.id,
        result: {
          successful: isSuccessful,
          diceCount: actualCount,
        },
        timestamp: Date.now(),
      };
      
      return {
        ...prevState,
        phase: 'revealing',
        challengeResult: isSuccessful,
        roundWinner,
        roundLoser,
        challengedDiceCount: actualCount,
        history: [...prevState.history, challengeEvent, resultEvent],
        players: prevState.players.map(player => ({
          ...player,
          dice: player.dice.map(die => ({
            ...die,
            revealed: true
          }))
        }))
      };
    });
  }, []);
  
  // Move to the next round
  const nextRound = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.phase !== 'revealing') return prevState;
      
      // Remove a die from the loser
      const updatedPlayers = prevState.players.map(player => {
        if (player.id === prevState.roundLoser) {
          const newDice = [...player.dice];
          if (newDice.length > 0) {
            newDice.pop(); // Remove one die
          }
          return {
            ...player,
            dice: newDice,
          };
        }
        return player;
      });
      
      // Check if game is over (one player has no dice)
      const gameOver = updatedPlayers.some(player => player.dice.length === 0);
      
      if (gameOver) {
        const winner = updatedPlayers.find(player => player.dice.length > 0);
        const loser = updatedPlayers.find(player => player.dice.length === 0);
        
        return {
          ...prevState,
          phase: 'ended',
          winner: winner?.id || null,
          loser: loser?.id || null,
          players: updatedPlayers,
        };
      }
      
      // Roll new dice for the next round
      const playersWithNewDice = updatedPlayers.map(player => ({
        ...player,
        dice: generateDice(player.dice.length, player.id),
      }));
      
      // Determine who starts the next round (loser of previous round)
      const startingPlayerId = prevState.roundLoser;
      
      // Count dice for the new round
      const allDice = playersWithNewDice.flatMap(player => player.dice);
      const newDiceCount = countDice(allDice);
      
      return {
        ...prevState,
        players: playersWithNewDice,
        currentPlayerId: startingPlayerId || prevState.players[0].id,
        previousPlayerId: null,
        currentBet: null,
        previousBet: null,
        phase: 'betting',
        roundWinner: null,
        roundLoser: null,
        diceCount: newDiceCount,
        totalDiceInGame: allDice.length,
        challengeResult: null,
        round: prevState.round + 1,
      };
    });
  }, []);
  
  // Restart the entire game
  const restartGame = useCallback(() => {
    setIsGameStarted(false);
    setGameState({
      players: [],
      currentPlayerId: '',
      previousPlayerId: null,
      currentBet: null,
      previousBet: null,
      phase: 'starting',
      winner: null,
      loser: null,
      roundWinner: null,
      roundLoser: null,
      diceCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      totalDiceInGame: 0,
      challengeResult: null,
      history: [],
      round: 0,
    });
    
    // Short delay for better UI experience
    setTimeout(() => {
      startGame();
    }, 500);
  }, [startGame]);
  
  // AI player logic
  useEffect(() => {
    const handleAITurn = async () => {
      const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
      
      // Check if it's the AI's turn and it's betting phase
      if (
        currentPlayer && 
        currentPlayer.isAI && 
        gameState.phase === 'betting' && 
        !gameState.winner
      ) {
        // Add a small delay for better UX
        const aiAction = await getAIAction(
          gameState,
          currentPlayer,
          'medium'
        );
        
        if (aiAction.action === 'challenge') {
          challenge();
        } else if (aiAction.action === 'bet' && aiAction.bet) {
          placeBet(aiAction.bet.quantity, aiAction.bet.value);
        }
      }
    };
    
    const timer = setTimeout(handleAITurn, 1000);
    return () => clearTimeout(timer);
  }, [gameState, challenge, placeBet]);
  
  // Helper to get current player
  const getCurrentPlayer = useCallback(() => {
    return gameState.players.find(player => player.id === gameState.currentPlayerId);
  }, [gameState.players, gameState.currentPlayerId]);
  
  // Helper to get player names
  const getPlayerNames = useCallback(() => {
    const names: Record<string, string> = {};
    gameState.players.forEach(player => {
      names[player.id] = player.name;
    });
    return names;
  }, [gameState.players]);
  
  return {
    gameState,
    isGameStarted,
    startGame,
    placeBet,
    challenge,
    nextRound,
    restartGame,
    getCurrentPlayer,
    getPlayerNames,
  };
};

// Helper function to generate dice
const generateDice = (count: number, playerId: string): Dice[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: parseInt(`${playerId === 'human' ? '1' : '2'}${index}`),
    value: (Math.floor(Math.random() * 6) + 1) as DiceValue,
    revealed: false,
  }));
};

// Helper function to count dice by value
const countDice = (dice: Dice[]): Record<DiceValue, number> => {
  const count: Record<DiceValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  dice.forEach(die => {
    count[die.value]++;
  });
  
  return count;
};
