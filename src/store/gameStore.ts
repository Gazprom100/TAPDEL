import { create } from 'zustand';

interface GameState {
  tokens: number;
  energy: number;
  highScore: number;
  addTokens: (amount: number) => void;
  setEnergy: (energy: number) => void;
  updateHighScore: (score: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  tokens: 0,
  energy: 100,
  highScore: 0,
  
  addTokens: (amount) => set((state) => ({ 
    tokens: state.tokens + amount,
    highScore: Math.max(state.highScore, state.tokens + amount)
  })),
  
  setEnergy: (energy) => set({ energy }),
  
  updateHighScore: (score) => set((state) => ({
    highScore: Math.max(state.highScore, score)
  })),
})); 