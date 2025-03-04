
import React from 'react';
import { cn } from '@/lib/utils';
import { Dice as DiceType } from '@/types/game';

interface DiceProps {
  dice: DiceType;
  isRolling?: boolean;
  isRevealed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Dice: React.FC<DiceProps> = ({
  dice,
  isRolling = false,
  isRevealed = true,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const renderDots = () => {
    const dots = [];
    
    // Configuration for dot positions based on dice value
    switch (dice.value) {
      case 1:
        dots.push(<div key="center" className={`dice-dot ${dotSizeClasses[size]} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />);
        break;
      case 2:
        dots.push(<div key="top-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] right-[25%]`} />);
        dots.push(<div key="bottom-left" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] left-[25%]`} />);
        break;
      case 3:
        dots.push(<div key="top-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] right-[25%]`} />);
        dots.push(<div key="center" className={`dice-dot ${dotSizeClasses[size]} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />);
        dots.push(<div key="bottom-left" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] left-[25%]`} />);
        break;
      case 4:
        dots.push(<div key="top-left" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] left-[25%]`} />);
        dots.push(<div key="top-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] right-[25%]`} />);
        dots.push(<div key="bottom-left" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] left-[25%]`} />);
        dots.push(<div key="bottom-right" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] right-[25%]`} />);
        break;
      case 5:
        dots.push(<div key="top-left" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] left-[25%]`} />);
        dots.push(<div key="top-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] right-[25%]`} />);
        dots.push(<div key="center" className={`dice-dot ${dotSizeClasses[size]} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />);
        dots.push(<div key="bottom-left" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] left-[25%]`} />);
        dots.push(<div key="bottom-right" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] right-[25%]`} />);
        break;
      case 6:
        dots.push(<div key="top-left" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] left-[25%]`} />);
        dots.push(<div key="middle-left" className={`dice-dot ${dotSizeClasses[size]} absolute top-1/2 left-[25%] -translate-y-1/2`} />);
        dots.push(<div key="bottom-left" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] left-[25%]`} />);
        dots.push(<div key="top-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-[25%] right-[25%]`} />);
        dots.push(<div key="middle-right" className={`dice-dot ${dotSizeClasses[size]} absolute top-1/2 right-[25%] -translate-y-1/2`} />);
        dots.push(<div key="bottom-right" className={`dice-dot ${dotSizeClasses[size]} absolute bottom-[25%] right-[25%]`} />);
        break;
      default:
        break;
    }
    
    return dots;
  };

  return (
    <div className={cn("dice-container relative", className)}>
      <div 
        className={cn(
          "dice-3d relative",
          sizeClasses[size],
          "rounded-lg bg-white shadow-md border border-gray-100",
          "flex items-center justify-center", 
          isRolling && "animate-dice-roll",
          !isRevealed && "bg-gray-200",
          "transition-all duration-300"
        )}
      >
        {isRevealed ? renderDots() : (
          <div className="text-gray-400 font-medium">?</div>
        )}
      </div>
    </div>
  );
};

export default Dice;
