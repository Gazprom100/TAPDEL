import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Transaction, LeaderboardEntry, Gear } from '../types';
import { 
  EngineMark, 
  GearboxLevel, 
  BatteryLevel, 
  HyperdriveLevel, 
  PowerGridLevel,
  GameState as GameStateBase,
  COMPONENTS,
  GAME_MECHANICS
} from '../types/game';

interface ExtendedGameState extends GameStateBase {
  profile: UserProfile | null;
  transactions: Transaction[];
  leaderboard: LeaderboardEntry[];
}

interface GameActions {
  // Действия с токенами
  addTokens: (amount: number) => void;
  spendTokens: (amount: number) => Promise<boolean>;
  withdrawTokens: (amount: number) => Promise<boolean>;
  depositTokens: (amount: number) => Promise<boolean>;
  
  // Действия с компонентами
  upgradeEngine: (level: EngineMark) => void;
  upgradeGearbox: (level: GearboxLevel) => void;
  upgradeBattery: (level: BatteryLevel) => void;
  upgradeHyperdrive: (level: HyperdriveLevel) => void;
  upgradePowerGrid: (level: PowerGridLevel) => void;
  
  // Действия с энергией
  setFuelLevel: (level: number) => void;
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

type GameStore = ExtendedGameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Начальные значения
      tokens: 0,
      highScore: 0,
      engineLevel: COMPONENTS.ENGINES[0].level as EngineMark,
      gearboxLevel: COMPONENTS.GEARBOXES[0].level as GearboxLevel,
      batteryLevel: COMPONENTS.BATTERIES[0].level as BatteryLevel,
      hyperdriveLevel: COMPONENTS.HYPERDRIVES[0].level as HyperdriveLevel,
      powerGridLevel: COMPONENTS.POWER_GRIDS[0].level as PowerGridLevel,
      enginePower: 0,
      currentGear: 'N',
      temperature: GAME_MECHANICS.TEMPERATURE.MIN,
      fuelLevel: GAME_MECHANICS.ENERGY.MAX_LEVEL,
      powerLevel: 0,
      isOverheated: false,
      coolingTimer: 0,
      lastTapTimestamp: 0,
      tapRate: 0,
      hyperdriveActive: false,
      profile: null,
      transactions: [],
      leaderboard: [],

      // Действия с токенами
      addTokens: (amount) => set((state) => {
        console.log('Adding tokens:', {
          currentTokens: state.tokens,
          amountToAdd: amount,
          newTotal: state.tokens + amount
        });
        return {
          tokens: state.tokens + amount,
          highScore: Math.max(state.highScore, state.tokens + amount)
        };
      }),

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

      // Действия с компонентами
      upgradeEngine: (level) => set({ engineLevel: level }),
      upgradeGearbox: (level) => set({ gearboxLevel: level }),
      upgradeBattery: (level) => set({ batteryLevel: level }),
      upgradeHyperdrive: (level) => set({ hyperdriveLevel: level }),
      upgradePowerGrid: (level) => set({ powerGridLevel: level }),

      // Действия с энергией
      setFuelLevel: (level) => set({ fuelLevel: level }),
      
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
      setGear: (gear: Gear) => set({ currentGear: gear }),
      
      upgradeMaxGear: (gear: Gear) => set((state) => ({
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

      // Новые действия
      setTemperature: (temp) => set({ temperature: temp }),
      setPowerLevel: (level) => set({ powerLevel: level }),
      setIsOverheated: (state) => set({ isOverheated: state }),
      setCoolingTimer: (time) => set({ coolingTimer: time }),
      setHyperdriveActive: (state) => set({ hyperdriveActive: state })
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