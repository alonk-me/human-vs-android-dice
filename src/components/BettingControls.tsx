
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DiceValue, Bet } from '@/types/game';
import { cn } from '@/lib/utils';
import Dice from './Dice';

interface BettingControlsProps {
  currentBet: Bet | null;
  totalDice: number;
  onPlaceBet: (quantity: number, value: DiceValue) => void;
  onChallenge: () => void;
  isActive: boolean;
}

const BettingControls: React.FC<BettingControlsProps> = ({
  currentBet,
  totalDice,
  onPlaceBet,
  onChallenge,
  isActive
}) => {
  const [quantity, setQuantity] = useState<number>(currentBet ? currentBet.quantity : 1);
  const [diceValue, setDiceValue] = useState<DiceValue>(currentBet ? currentBet.value : 1);
  
  // Update local state when current bet changes
  useEffect(() => {
    if (currentBet) {
      setQuantity(currentBet.quantity);
      setDiceValue(currentBet.value);
    } else {
      setQuantity(1);
      setDiceValue(1);
    }
  }, [currentBet]);
  
  // Generate valid quantity options
  const getQuantityOptions = () => {
    const options = [];
    const minQuantity = currentBet 
      ? (currentBet.value === diceValue ? currentBet.quantity + 1 : currentBet.quantity) 
      : 1;
    
    for (let i = minQuantity; i <= totalDice; i++) {
      options.push(
        <SelectItem key={`quantity-${i}`} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    
    return options;
  };
  
  // Generate dice value options
  const getDiceValueOptions = () => {
    const options = [];
    const values: DiceValue[] = [1, 2, 3, 4, 5, 6];
    
    for (const value of values) {
      const isValidOption = !currentBet || 
        value > currentBet.value || 
        (value === currentBet.value && quantity > currentBet.quantity);
      
      options.push(
        <SelectItem 
          key={`value-${value}`} 
          value={value.toString()}
          disabled={!isValidOption}
        >
          {value}
        </SelectItem>
      );
    }
    
    return options;
  };
  
  const handlePlaceBet = () => {
    onPlaceBet(quantity, diceValue);
  };
  
  return (
    <div className={cn(
      "p-6 rounded-xl glass-morphism",
      "transition-all duration-300 transform",
      isActive ? "opacity-100 translate-y-0" : "opacity-50 translate-y-4 pointer-events-none"
    )}>
      <h3 className="text-xl font-medium mb-4">Place Your Bet</h3>
      
      {currentBet && (
        <div className="mb-6 p-3 bg-secondary/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Current Bet</p>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl font-medium">{currentBet.quantity}</span>
            <span className="mx-1 text-muted-foreground">×</span>
            <Dice dice={{ id: 0, value: currentBet.value, revealed: true }} size="sm" />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <Select 
            value={quantity.toString()} 
            onValueChange={(value) => setQuantity(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select quantity" />
            </SelectTrigger>
            <SelectContent>
              {getQuantityOptions()}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dice Value</label>
          <Select 
            value={diceValue.toString()} 
            onValueChange={(value) => setDiceValue(parseInt(value) as DiceValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {getDiceValueOptions()}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="default"
          onClick={handlePlaceBet}
          className="w-full"
          disabled={!isActive}
        >
          Place Bet
        </Button>
        
        <Button
          variant="secondary"
          onClick={onChallenge}
          className="w-full"
          disabled={!currentBet || !isActive}
        >
          Challenge
        </Button>
      </div>
    </div>
  );
};

export default BettingControls;
