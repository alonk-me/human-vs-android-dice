
import React from 'react';
import { cn } from '@/lib/utils';
import { GameEvent, Bet } from '@/types/game';
import { ScrollArea } from '@/components/ui/scroll-area';
import Dice from './Dice';

interface GameHistoryProps {
  events: GameEvent[];
  playerNames: Record<string, string>;
  className?: string;
}

const GameHistory: React.FC<GameHistoryProps> = ({
  events,
  playerNames,
  className
}) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const renderEventContent = (event: GameEvent) => {
    const playerName = playerNames[event.playerId] || 'Unknown Player';
    
    switch (event.type) {
      case 'bet':
        if (!event.bet) return null;
        return (
          <div className="flex items-center">
            <span className="font-medium">{playerName}</span>
            <span className="mx-1">bet</span>
            <span className="font-medium">{event.bet.quantity}</span>
            <span className="mx-1">×</span>
            <Dice 
              dice={{ id: 0, value: event.bet.value, revealed: true }} 
              size="sm" 
              className="inline-block"
            />
          </div>
        );
        
      case 'challenge':
        const targetName = event.targetPlayerId ? playerNames[event.targetPlayerId] : 'previous bet';
        return (
          <div>
            <span className="font-medium">{playerName}</span>
            <span className="mx-1">challenged</span>
            <span className="font-medium">{targetName}</span>
          </div>
        );
        
      case 'result':
        if (!event.result) return null;
        return (
          <div>
            <span className="font-medium">{playerName}</span>
            <span className="mx-1">{event.result.successful ? 'won' : 'lost'} the challenge.</span>
            <span className="text-sm text-muted-foreground ml-1">
              ({event.result.diceCount} dice matched)
            </span>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={cn("glass-morphism rounded-xl p-4", className)}>
      <h3 className="text-lg font-medium mb-3">Game History</h3>
      
      <ScrollArea className="h-[200px] w-full pr-3">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Game events will appear here
          </div>
        ) : (
          <ul className="space-y-2">
            {events.slice().reverse().map((event, index) => (
              <li 
                key={`event-${index}`}
                className="p-2 text-sm rounded-lg bg-white/50 border border-gray-100"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(event.timestamp)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {event.type}
                  </span>
                </div>
                {renderEventContent(event)}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
};

export default GameHistory;
