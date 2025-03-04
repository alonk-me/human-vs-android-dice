
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
    getPlayerNames
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
            description: "Roll the dice and place your bets!",
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
  }, [gameState.phase, gameState.challengeResult, gameState.winner, gameState.roundWinner, isGameStarted]);
  
  const renderGameControls = () => {
    if (!isGameStarted) {
      return (
        <div className="text-center p-8">
          <h2 className="text-2xl font-medium mb-6">Liar's Dice</h2>
          <p className="text-muted-foreground mb-8">A game of bluffing and strategy</p>
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
    
    if (gameState.phase === 'revealing' || gameState.phase === 'ended') {
      return (
        <div className="text-center p-8 animate-fade-in">
          {gameState.phase === 'revealing' && (
            <>
              <h2 className="text-xl font-medium mb-4">Round Complete</h2>
              <p className="text-muted-foreground mb-6">
                {gameState.roundWinner && `${getPlayerNames()[gameState.roundWinner]} won this round!`}
              </p>
              <Button 
                onClick={nextRound}
                disabled={gameState.phase === 'ended'}
              >
                Next Round
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          
          {gameState.phase === 'ended' && (
            <>
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
            </>
          )}
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
  
  return (
    <div className={cn("relative min-h-screen p-6", className)}>
      <GameRules />
      
      {isGameStarted && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-secondary text-sm">
          Round {gameState.round}
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
          {gameState.players.map((player) => (
            <PlayerInfo
              key={player.id}
              player={player}
              isActive={player.id === gameState.currentPlayerId}
              isWinner={gameState.winner === player.id}
              isLoser={gameState.loser === player.id}
              showDice={gameState.phase === 'revealing' || player.id === 'human'}
            />
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

export default GameBoard;
