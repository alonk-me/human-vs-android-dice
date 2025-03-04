
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const GameRules: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="absolute top-4 right-4">
          <HelpCircle className="h-5 w-5 mr-2" />
          <span>Rules</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto glass-morphism">
        <DialogHeader>
          <DialogTitle className="text-2xl">Liar's Dice Rules</DialogTitle>
          <DialogDescription>
            A game of bluffing and deduction
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <section>
            <h3 className="text-lg font-medium mb-2">The Objective</h3>
            <p>
              The objective of Liar's Dice is to be the last player with dice remaining. Players lose dice by losing challenges.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-medium mb-2">Game Setup</h3>
            <p>
              Each player starts with five dice. All dice are rolled at the beginning of each round, and players can only see their own dice.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-medium mb-2">Gameplay</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Players take turns making bets about the dice on the table.
              </li>
              <li>
                A bet consists of a quantity and a value (e.g., "three 4s").
              </li>
              <li>
                Each bet must be higher than the previous bet. A bet is higher if:
                <ul className="list-disc pl-5 mt-1">
                  <li>It has a higher quantity of any value (e.g., "four 3s" beats "three 5s")</li>
                  <li>It has the same quantity but a higher value (e.g., "three 5s" beats "three 4s")</li>
                </ul>
              </li>
              <li>
                Instead of making a higher bet, a player can challenge the previous bet.
              </li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-lg font-medium mb-2">Challenges</h3>
            <p>
              When a player challenges, all dice are revealed. The challenge is successful if there are fewer dice of the stated value than the quantity bet. Otherwise, the challenge fails.
            </p>
            <p className="mt-2">
              The player who loses the challenge (either the challenger if wrong, or the last bettor if the challenge is successful) loses one die for the next round.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-medium mb-2">Special Rules</h3>
            <p>
              In this version, 1s (aces) are not wild. Each bet refers to the exact face value mentioned.
            </p>
          </section>
          
          <section>
            <h3 className="text-lg font-medium mb-2">Winning</h3>
            <p>
              The game continues until only one player has dice remaining. That player is declared the winner.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameRules;
