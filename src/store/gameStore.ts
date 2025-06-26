import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Transaction, Gear, LeaderboardEntry } from '../types';

interface GameState {
  // Игровые параметры
  energy: number;
  tokens: number;
  highScore: number;
  currentGear: Gear;
  
  // Профиль пользователя
  profile: UserProfile | null;
  transactions: Transaction[];
  leaderboard: LeaderboardEntry[];
  
  // Действия с токенами
  addTokens: (amount: number) => void;
  spendTokens: (amount: number) => Promise<boolean>;
  withdrawTokens: (amount: number) => Promise<boolean>;
  depositTokens: (amount: number) => Promise<boolean>;
  
  // Действия с энергией
  setEnergy: (energy: number) => void;
  upgradeMaxEnergy: (amount: number) => void;
  upgradeEnergyRecovery: (amount: number) => void;
  
  // Действия с передачами
  setGear: (gear: Gear) => void;
  upgradeMaxGear: (gear: Gear) => void;
  
  // Профиль и статистика
  updateProfile: (profile: Partial<UserProfile>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateLeaderboard: (entries: LeaderboardEntry[]) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Начальные значения
      energy: 100,
      tokens: 0,
      highScore: 0,
      currentGear: 'N',
      profile: null,
      transactions: [],
      leaderboard: [],

      // Действия с токенами
      addTokens: (amount) => set((state) => ({
        tokens: state.tokens + amount,
        highScore: Math.max(state.highScore, state.tokens + amount)
      })),

      spendTokens: async (amount) => {
        const state = get();
        if (state.tokens < amount) return false;
        
        set((state) => ({
          tokens: state.tokens - amount,
          transactions: [
            {
              id: Date.now().toString(),
              type: 'purchase',
              amount: -amount,
              timestamp: Date.now(),
              status: 'completed'
            },
            ...state.transactions
          ]
        }));
        return true;
      },

      withdrawTokens: async (amount) => {
        const state = get();
        if (state.tokens < amount) return false;
        
        set((state) => ({
          tokens: state.tokens - amount,
          transactions: [
            {
              id: Date.now().toString(),
              type: 'withdraw',
              amount,
              timestamp: Date.now(),
              status: 'completed'
            },
            ...state.transactions
          ]
        }));
        return true;
      },

      depositTokens: async (amount) => {
        set((state) => ({
          tokens: state.tokens + amount,
          transactions: [
            {
              id: Date.now().toString(),
              type: 'deposit',
              amount,
              timestamp: Date.now(),
              status: 'completed'
            },
            ...state.transactions
          ]
        }));
        return true;
      },

      // Действия с энергией
      setEnergy: (energy) => set({ energy }),
      
      upgradeMaxEnergy: (amount) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          maxEnergy: state.profile.maxEnergy + amount
        } : null
      })),

      upgradeEnergyRecovery: (amount) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          energyRecoveryRate: state.profile.energyRecoveryRate + amount
        } : null
      })),

      // Действия с передачами
      setGear: (gear) => set({ currentGear: gear }),
      
      upgradeMaxGear: (gear) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          maxGear: gear
        } : null
      })),

      // Профиль и статистика
      updateProfile: (profileUpdate) => set((state) => ({
        profile: state.profile ? {
          ...state.profile,
          ...profileUpdate
        } : null
      })),

      addTransaction: (transaction) => set((state) => ({
        transactions: [
          {
            id: Date.now().toString(),
            timestamp: Date.now(),
            ...transaction
          },
          ...state.transactions
        ]
      })),

      updateLeaderboard: (entries) => set({ leaderboard: entries }),
    }),
    {
      name: 'tapdel-storage',
      partialize: (state) => ({
        tokens: state.tokens,
        highScore: state.highScore,
        profile: state.profile,
        transactions: state.transactions
      })
    }
  )
); 