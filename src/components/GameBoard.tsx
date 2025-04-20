import React, { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DiceValue, Player, Bet, GamePhase } from '@/types/game';
import { useGameLogic } from '@/hooks/useGameLogic';
import PlayerInfo from './PlayerInfo';
import BettingControls from './BettingControls';
import GameHistory from './GameHistory';
import { Button } from '@/components/ui/button';
import { Dices, RotateCcw, ChevronRight } from 'lucide-react';
import GameRules from './GameRules';
import { BotMessageSquare } from 'lucide-react';

interface GameBoardProps {
  className?: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ className }) => {
  const {
    gameState,
    placeBet,
    challenge,
    startGame,
    nextRound,
    restartGame,
    isGameStarted,
    getCurrentPlayer,
    getPlayerNames,
    botMessage
  } = useGameLogic();

  const currentPlayer = getCurrentPlayer();
  const isHumanTurn = currentPlayer && !currentPlayer.isAI;

  useEffect(() => {
    // Game phase announcements
    switch (gameState.phase) {
      case 'starting':
        if (isGameStarted) {
          toast({
            title: "New Round",
            description: "Roll the dice and place your bets! Remember, 1s are wild!",
            duration: 3000,
          });
        }
        break;
      case 'revealing':
        if (gameState.challengeResult !== null) {
          const result = gameState.challengeResult ? "successful" : "failed";
          const message = `Challenge ${result}! ${gameState.roundWinner ? getPlayerNames()[gameState.roundWinner] : 'Someone'} won the round.`;
          
          toast({
            title: "Challenge Result",
            description: message,
            duration: 3000,
          });
        }
        break;
      case 'ended':
        if (gameState.winner) {
          toast({
            title: "Game Over",
            description: `${getPlayerNames()[gameState.winner]} has won the game!`,
            duration: 5000,
          });
        }
        break;
    }
  }, [gameState.phase, gameState.challengeResult, gameState.winner, gameState.roundWinner, isGameStarted, getPlayerNames]);

  const renderGameControls = () => {
    if (!isGameStarted) {
      return (
        <div className="text-center p-8">
          <h2 className="text-2xl font-medium mb-6">Liar's Dice</h2>
          <p className="text-muted-foreground mb-4">A game of bluffing and strategy</p>
          <p className="text-primary font-medium mb-8">1s are wild!</p>
          <Button 
            size="lg" 
            onClick={startGame}
            className="animate-pulse-soft"
          >
            <Dices className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        </div>
      );
    }
    
    if (gameState.phase === 'revealing') {
      return (
        <div className="text-center p-8 animate-fade-in">
          <h2 className="text-xl font-medium mb-4">Round Complete</h2>
          <p className="text-muted-foreground mb-6">
            {gameState.roundWinner && `${getPlayerNames()[gameState.roundWinner]} won this round!`}
          </p>
          
          {gameState.currentBet && (
            <div className="mb-6 p-4 glass-morphism rounded-lg">
              <p className="text-sm mb-2">Challenge Results:</p>
              <div className="flex items-center justify-center space-x-2">
                <span className="font-medium">{gameState.currentBet.quantity}</span>
                <span>×</span>
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-md font-medium">
                  {gameState.currentBet.value}
                </span>
                <span>were bet</span>
              </div>
              
              <div className="mt-3 font-medium">
                <span className={gameState.challengedDiceCount !== undefined ? 
                  (gameState.challengedDiceCount >= gameState.currentBet.quantity ? "text-red-500" : "text-green-500") 
                  : ""
                }>
                  {gameState.challengedDiceCount !== undefined ? 
                    `${gameState.challengedDiceCount} actually existed` 
                    : ""}
                </span>
              </div>
            </div>
          )}
          
          <Button 
            onClick={nextRound}
          >
            Next Round
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }
    
    if (gameState.phase === 'ended') {
      return (
        <div className="text-center p-8 animate-fade-in">
          <h2 className="text-xl font-medium mb-4">Game Over</h2>
          <p className="text-muted-foreground mb-6">
            {gameState.winner && `${getPlayerNames()[gameState.winner]} has won the game!`}
          </p>
          <Button 
            onClick={restartGame}
            className="animate-pulse-soft"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Play Again
          </Button>
        </div>
      );
    }
    
    return (
      <BettingControls
        currentBet={gameState.currentBet}
        totalDice={gameState.totalDiceInGame}
        onPlaceBet={(quantity, value) => placeBet(quantity, value)}
        onChallenge={challenge}
        isActive={isHumanTurn && gameState.phase === 'betting'}
      />
    );
  };

  const aiPlayer = gameState.players.find((pl) => pl.isAI);
  const showBotBubble = aiPlayer && gameState.currentPlayerId === aiPlayer.id && botMessage;

  return (
    <div className={cn("relative min-h-screen p-6", className)}>
      <GameRules />

      {isGameStarted && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-secondary text-sm flex items-center">
          <span className="mr-2">Round {gameState.round}</span>
          <span className="text-xs text-primary font-medium">(1s are wild!)</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
          {gameState.players.map((player) => (
            <div key={player.id} className="relative">
              <PlayerInfo
                player={player}
                isActive={player.id === gameState.currentPlayerId}
                isWinner={gameState.winner === player.id}
                isLoser={gameState.loser === player.id}
                showDice={gameState.phase === 'revealing' || player.id === 'human'}
                diceCount={gameState.phase === 'revealing' ? gameState.diceCount : (player.id === 'human' ? countPlayerDice(player) : undefined)}
              />
              {player.isAI && showBotBubble && (
                <div className="absolute left-full top-1/3 ml-4 p-2 px-4 bg-primary text-white rounded-xl flex items-center shadow-lg animate-fade-in">
                  <BotMessageSquare className="mr-2 h-5 w-5 text-yellow-300" />
                  <span className="text-base">{botMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="animate-slide-up">{renderGameControls()}</div>

          <GameHistory 
            events={gameState.history}
            playerNames={getPlayerNames()}
            className="animate-slide-up"
          />
        </div>
      </div>
    </div>
  );
};

const countPlayerDice = (player: Player): Record<DiceValue, number> => {
  const count: Record<DiceValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  player.dice.forEach(die => {
    count[die.value]++;
  });
  
  return count;
};

export default GameBoard;
