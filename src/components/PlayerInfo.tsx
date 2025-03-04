
import React from 'react';
import { cn } from '@/lib/utils';
import { Player, DiceValue } from '@/types/game';
import Dice from './Dice';
import { User, Bot } from 'lucide-react';

interface PlayerInfoProps {
  player: Player;
  isActive: boolean;
  isWinner?: boolean;
  isLoser?: boolean;
  showDice?: boolean;
  diceCount?: Record<DiceValue, number>;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isActive,
  isWinner = false,
  isLoser = false,
  showDice = true,
  diceCount
}) => {
  return (
    <div 
      className={cn(
        "flex flex-col items-center p-6 rounded-xl transition-all duration-300",
        isActive ? "neo-morphism scale-105" : "glass-morphism opacity-90",
        isWinner && "bg-green-50 border-green-200",
        isLoser && "bg-red-50 border-red-200"
      )}
    >
      <div className="flex items-center justify-center mb-4">
        <div 
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            isActive ? "bg-primary text-white" : "bg-secondary text-primary",
            "transition-all duration-300"
          )}
        >
          {player.isAI ? <Bot size={24} /> : <User size={24} />}
        </div>
      </div>
      
      <h3 className={cn(
        "text-lg font-medium mb-1",
        isActive && "text-primary",
        isWinner && "text-green-600",
        isLoser && "text-red-600"
      )}>
        {player.name}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        {player.dice.length} {player.dice.length === 1 ? 'die' : 'dice'}
      </p>
      
      {showDice && (
        <div className="flex space-x-2 mt-2">
          {player.dice.map((die) => (
            <Dice 
              key={die.id} 
              dice={die} 
              size="sm"
              isRevealed={die.revealed || player.isAI === false}
            />
          ))}
        </div>
      )}
      
      {diceCount && (
        <div className="mt-4 grid grid-cols-6 gap-1 w-full max-w-xs">
          {Object.entries(diceCount).map(([value, count]) => (
            <div key={value} className="flex flex-col items-center">
              <div className={cn(
                "w-6 h-6 flex items-center justify-center rounded",
                "text-xs font-medium",
                parseInt(value) === 1 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
              )}>
                {value}
              </div>
              <span className="text-xs mt-1">{count}</span>
            </div>
          ))}
        </div>
      )}
      
      {isActive && (
        <div className="mt-4 text-xs text-primary animate-pulse-soft">
          Current Turn
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
