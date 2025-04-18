import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from '@/components/ui/use-toast';

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
    sessionId: null,
  });
  
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  const startGame = useCallback(async () => {
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
    
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        total_dice_at_start: INITIAL_DICE_COUNT * 2,
        round_count: 1
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating game session:', sessionError);
      return;
    }

    await supabase.from('dice_states').insert([
      {
        session_id: session.id,
        player_id: 'human',
        round: 1,
        dice_values: humanPlayer.dice.map(d => d.value)
      },
      {
        session_id: session.id,
        player_id: 'ai',
        round: 1,
        dice_values: aiPlayer.dice.map(d => d.value)
      }
    ]);

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
      diceCount: countDice([...humanPlayer.dice, ...aiPlayer.dice]),
      totalDiceInGame: INITIAL_DICE_COUNT * 2,
      challengeResult: null,
      history: [],
      round: 1,
      sessionId: session.id
    });
    
    setIsGameStarted(true);
  }, []);
  
  const placeBet = useCallback(async (quantity: number, value: DiceValue) => {
    setGameState((prevState) => {
      if (prevState.phase !== 'betting') return prevState;
      
      const currentPlayer = prevState.players.find(p => p.id === prevState.currentPlayerId);
      if (!currentPlayer) return prevState;
      
      if (prevState.currentBet) {
        const isValidBet = quantity > prevState.currentBet.quantity || 
                          (quantity === prevState.currentBet.quantity && value > prevState.currentBet.value);
        
        if (!isValidBet) return prevState;
      }
      
      const nextPlayerIndex = prevState.players.findIndex(p => p.id === prevState.currentPlayerId) + 1;
      const nextPlayer = prevState.players[nextPlayerIndex % prevState.players.length];
      
      const newBet: Bet = {
        playerId: currentPlayer.id,
        quantity,
        value,
      };
      
      const newEvent: GameEvent = {
        type: 'bet',
        playerId: currentPlayer.id,
        bet: newBet,
        timestamp: Date.now(),
      };
      
      if (gameState.sessionId) {
        await supabase.from('game_events').insert({
          session_id: gameState.sessionId,
          event_type: 'bet',
          player_id: currentPlayer.id,
          round: gameState.round,
          data: { quantity, value }
        });
      }
      
      return {
        ...prevState,
        currentBet: newBet,
        previousBet: prevState.currentBet,
        currentPlayerId: nextPlayer.id,
        previousPlayerId: currentPlayer.id,
        history: [...prevState.history, newEvent],
      };
    });
  }, [gameState]);
  
  const challenge = useCallback(async () => {
    setGameState((prevState) => {
      if (prevState.phase !== 'betting' || !prevState.currentBet) return prevState;
      
      const currentPlayer = prevState.players.find(p => p.id === prevState.currentPlayerId);
      const previousPlayer = prevState.players.find(p => p.id === prevState.previousPlayerId);
      
      if (!currentPlayer || !previousPlayer) return prevState;
      
      const { quantity, value } = prevState.currentBet;
      
      const allDice = prevState.players.flatMap(player => player.dice);
      
      const matchingDice = allDice.filter(die => die.value === value || die.value === 1);
      const actualCount = matchingDice.length;
      
      const isSuccessful = actualCount < quantity;
      
      const roundWinner = isSuccessful ? currentPlayer.id : previousPlayer.id;
      const roundLoser = isSuccessful ? previousPlayer.id : currentPlayer.id;
      
      const challengeEvent: GameEvent = {
        type: 'challenge',
        playerId: currentPlayer.id,
        targetPlayerId: previousPlayer.id,
        timestamp: Date.now(),
      };
      
      const resultEvent: GameEvent = {
        type: 'result',
        playerId: currentPlayer.id,
        result: {
          successful: isSuccessful,
          diceCount: actualCount,
        },
        timestamp: Date.now(),
      };
      
      if (gameState.sessionId) {
        await supabase.from('game_events').insert({
          session_id: gameState.sessionId,
          event_type: 'challenge',
          player_id: currentPlayer.id,
          target_player_id: previousPlayer.id,
          round: gameState.round,
          data: { result: isSuccessful, actual_count: actualCount }
        });

        if (gameOver) {
          await supabase
            .from('game_sessions')
            .update({
              winner_id: winner?.id,
              loser_id: loser?.id,
              round_count: gameState.round
            })
            .eq('id', gameState.sessionId);

          try {
            await supabase.functions.invoke('train-model');
          } catch (error) {
            console.error('Error training model:', error);
          }
        }
      }
      
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
  }, [gameState]);
  
  const nextRound = useCallback(async () => {
    setGameState((prevState) => {
      if (prevState.phase !== 'revealing') return prevState;
      
      const updatedPlayers = prevState.players.map(player => {
        if (player.id === prevState.roundLoser) {
          const newDice = [...player.dice];
          if (newDice.length > 0) {
            newDice.pop();
          }
          return {
            ...player,
            dice: newDice,
          };
        }
        return player;
      });
      
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
      
      const playersWithNewDice = updatedPlayers.map(player => ({
        ...player,
        dice: generateDice(player.dice.length, player.id),
      }));
      
      const allDice = playersWithNewDice.flatMap(player => player.dice);
      const newDiceCount = countDice(allDice);
      
      if (gameState.sessionId) {
        const newDice = playersWithNewDice.map(player => ({
          session_id: gameState.sessionId,
          player_id: player.id,
          round: gameState.round + 1,
          dice_values: player.dice.map(d => d.value)
        }));

        await supabase.from('dice_states').insert(newDice);
      }
      
      return {
        ...prevState,
        players: playersWithNewDice,
        currentPlayerId: prevState.roundLoser || prevState.players[0].id,
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
  }, [gameState]);
  
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
      sessionId: null,
    });
    
    setTimeout(() => {
      startGame();
    }, 500);
  }, [startGame]);
  
  useEffect(() => {
    const handleAITurn = async () => {
      const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
      
      if (
        currentPlayer && 
        currentPlayer.isAI && 
        gameState.phase === 'betting' && 
        !gameState.winner
      ) {
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
  
  const getCurrentPlayer = useCallback(() => {
    return gameState.players.find(player => player.id === gameState.currentPlayerId);
  }, [gameState.players, gameState.currentPlayerId]);
  
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

const generateDice = (count: number, playerId: string): Dice[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: parseInt(`${playerId === 'human' ? '1' : '2'}${index}`),
    value: (Math.floor(Math.random() * 6) + 1) as DiceValue,
    revealed: false,
  }));
};

const countDice = (dice: Dice[]): Record<DiceValue, number> => {
  const count: Record<DiceValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  dice.forEach(die => {
    count[die.value]++;
  });
  
  return count;
};
