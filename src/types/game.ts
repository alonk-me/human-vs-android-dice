
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface Dice {
  id: number;
  value: DiceValue;
  revealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  dice: Dice[];
  isAI: boolean;
  isCurrentPlayer: boolean;
}

export interface Bet {
  playerId: string;
  quantity: number;
  value: DiceValue;
}

export type GamePhase = 'starting' | 'betting' | 'revealing' | 'ended';

export interface GameState {
  players: Player[];
  currentPlayerId: string;
  previousPlayerId: string | null;
  currentBet: Bet | null;
  previousBet: Bet | null;
  phase: GamePhase;
  winner: string | null;
  loser: string | null;
  roundWinner: string | null;
  roundLoser: string | null;
  diceCount: Record<DiceValue, number>;
  totalDiceInGame: number;
  challengeResult: boolean | null;
  challengedDiceCount?: number;
  history: GameEvent[];
  round: number;
  sessionId: string | null;
}

export interface GameEvent {
  type: 'bet' | 'challenge' | 'result';
  playerId: string;
  bet?: Bet;
  targetPlayerId?: string;
  result?: {
    successful: boolean;
    diceCount: number;
  };
  timestamp: number;
}

export interface GameAction {
  type: 'place-bet' | 'challenge' | 'start-game' | 'next-round' | 'restart-game';
  payload?: {
    playerId?: string;
    bet?: {
      quantity: number;
      value: DiceValue;
    };
  };
}
