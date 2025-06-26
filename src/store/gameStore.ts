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
import { DatabaseService } from '../services/db';

const db = new DatabaseService();

interface ExtendedGameState extends GameStateBase {
  profile: UserProfile | null;
  transactions: Transaction[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
}

interface GameActions {
  // Системные действия
  initializeUser: (userId: string) => Promise<void>;
  syncGameState: () => Promise<void>;
  
  // Действия с токенами
  addTokens: (amount: number) => Promise<void>;
  spendTokens: (amount: number) => Promise<boolean>;
  withdrawTokens: (amount: number) => Promise<boolean>;
  depositTokens: (amount: number) => Promise<boolean>;
  
  // Действия с компонентами
  upgradeEngine: (level: EngineMark) => Promise<void>;
  upgradeGearbox: (level: GearboxLevel) => Promise<void>;
  upgradeBattery: (level: BatteryLevel) => Promise<void>;
  upgradeHyperdrive: (level: HyperdriveLevel) => Promise<void>;
  upgradePowerGrid: (level: PowerGridLevel) => Promise<void>;
  
  // Действия с энергией
  setFuelLevel: (level: number) => void;
  upgradeMaxEnergy: (amount: number) => void;
  upgradeEnergyRecovery: (amount: number) => void;
  
  // Действия с передачами
  setGear: (gear: Gear) => void;
  upgradeMaxGear: (gear: Gear) => void;
  
  // Профиль и статистика
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  updateLeaderboard: (entries: LeaderboardEntry[]) => Promise<void>;

  // Системные действия
  setTemperature: (temp: number) => void;
  setPowerLevel: (level: number) => void;
  setIsOverheated: (state: boolean) => void;
  setCoolingTimer: (time: number) => void;
  setHyperdriveActive: (state: boolean) => void;
  setError: (error: string | null) => void;
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
      isLoading: false,
      error: null,

      // Системные действия
      setError: (error) => set({ error }),
      
      initializeUser: async (userId) => {
        try {
          set({ isLoading: true, error: null });
          const user = await db.getUser(userId);
          
          if (user) {
            const { gameState, profile, transactions } = user;
            set({
              tokens: gameState.tokens,
              highScore: gameState.highScore,
              engineLevel: gameState.engineLevel as EngineMark,
              gearboxLevel: gameState.gearboxLevel as GearboxLevel,
              batteryLevel: gameState.batteryLevel as BatteryLevel,
              hyperdriveLevel: gameState.hyperdriveLevel as HyperdriveLevel,
              powerGridLevel: gameState.powerGridLevel as PowerGridLevel,
              profile,
              transactions
            });
          }
          
          const dbLeaderboard = await db.getLeaderboard();
          const leaderboard: LeaderboardEntry[] = dbLeaderboard.map(entry => ({
            id: entry._id.toString(),
            userId: entry.userId,
            username: entry.username,
            level: 1, // TODO: Calculate based on score
            score: entry.score,
            tokens: 0, // TODO: Get from user data
            maxGear: 'M' as Gear, // TODO: Get from user data
            rank: entry.rank,
            updatedAt: entry.updatedAt
          }));
          set({ leaderboard });
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      syncGameState: async () => {
        try {
          const state = get();
          if (!state.profile?.userId) return;

          await db.updateGameState(state.profile.userId, {
            tokens: state.tokens,
            highScore: state.highScore,
            engineLevel: state.engineLevel,
            gearboxLevel: state.gearboxLevel,
            batteryLevel: state.batteryLevel,
            hyperdriveLevel: state.hyperdriveLevel,
            powerGridLevel: state.powerGridLevel,
            lastSaved: new Date()
          });

          await db.updateLeaderboard({
            userId: state.profile.userId,
            username: state.profile.username,
            score: state.highScore
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      // Действия с токенами
      addTokens: async (amount) => {
        try {
          const state = get();
          const newTokens = state.tokens + amount;
          const newHighScore = Math.max(state.highScore, newTokens);
          
          set({
            tokens: newTokens,
            highScore: newHighScore
          });

          await get().syncGameState();
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      spendTokens: async (amount) => {
        try {
          const state = get();
          if (state.tokens < amount) return false;
          
          set((state) => ({
            tokens: state.tokens - amount
          }));

          if (state.profile?.userId) {
            await db.addTransaction(state.profile.userId, {
              id: Date.now().toString(),
              type: 'purchase',
              amount: -amount,
              timestamp: Date.now(),
              status: 'completed'
            });
          }

          await get().syncGameState();
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        }
      },

      withdrawTokens: async (amount) => {
        try {
          const state = get();
          if (state.tokens < amount) return false;
          
          set((state) => ({
            tokens: state.tokens - amount
          }));

          if (state.profile?.userId) {
            await db.addTransaction(state.profile.userId, {
              id: Date.now().toString(),
              type: 'withdraw',
              amount,
              timestamp: Date.now(),
              status: 'completed'
            });
          }

          await get().syncGameState();
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        }
      },

      depositTokens: async (amount) => {
        try {
          set((state) => ({
            tokens: state.tokens + amount
          }));

          if (get().profile?.userId) {
            await db.addTransaction(get().profile!.userId, {
              id: Date.now().toString(),
              type: 'deposit',
              amount,
              timestamp: Date.now(),
              status: 'completed'
            });
          }

          await get().syncGameState();
          return true;
        } catch (error) {
          set({ error: (error as Error).message });
          return false;
        }
      },

      // Действия с компонентами
      upgradeEngine: async (level) => {
        set({ engineLevel: level });
        await get().syncGameState();
      },
      
      upgradeGearbox: async (level) => {
        set({ gearboxLevel: level });
        await get().syncGameState();
      },
      
      upgradeBattery: async (level) => {
        set({ batteryLevel: level });
        await get().syncGameState();
      },
      
      upgradeHyperdrive: async (level) => {
        set({ hyperdriveLevel: level });
        await get().syncGameState();
      },
      
      upgradePowerGrid: async (level) => {
        set({ powerGridLevel: level });
        await get().syncGameState();
      },

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
      updateProfile: async (profileUpdate) => {
        try {
          const state = get();
          const newProfile = state.profile ? {
            ...state.profile,
            ...profileUpdate
          } : null;

          set({ profile: newProfile });

          if (newProfile?.userId) {
            await db.updateUser(newProfile.userId, { profile: newProfile });
          }
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      addTransaction: async (transaction) => {
        try {
          const state = get();
          const newTransaction = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            ...transaction
          };

          set((state) => ({
            transactions: [newTransaction, ...state.transactions]
          }));

          if (state.profile?.userId) {
            await db.addTransaction(state.profile.userId, newTransaction);
          }
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      updateLeaderboard: async (entries) => {
        try {
          set({ leaderboard: entries });
          
          const state = get();
          if (state.profile?.userId) {
            await db.updateLeaderboard({
              userId: state.profile.userId,
              username: state.profile.username,
              score: state.highScore
            });
          }
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      // Системные действия
      setTemperature: (temp: number) => set({ temperature: temp }),
      setPowerLevel: (level: number) => set({ powerLevel: level }),
      setIsOverheated: (state: boolean) => set({ isOverheated: state }),
      setCoolingTimer: (time: number) => set({ coolingTimer: time }),
      setHyperdriveActive: (state: boolean) => set({ hyperdriveActive: state })
    }),
    {
      name: 'tapdel-storage',
      partialize: (state) => ({
        tokens: state.tokens,
        highScore: state.highScore,
        profile: state.profile
      })
    }
  )
); 