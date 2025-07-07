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
import { apiService } from '../services/api';

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
  spendTokens: (amount: number, itemInfo?: { type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid'; level: string }) => Promise<boolean>;
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
  
  // Автоматическая синхронизация
  startAutoSync: () => void;
  stopAutoSync: () => void;
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
          
          // Получаем данные пользователя
          const user = await apiService.getUser(userId);
          
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
          } else {
            // Создаем нового пользователя с Telegram данными если возможно
            const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
            const newProfile: UserProfile = {
              userId,
              username: telegramUser?.username || `Игрок ${userId.slice(-4)}`,
              maxEnergy: 100,
              energyRecoveryRate: 1,
              maxGear: 'M' as Gear,
              level: 1,
              experience: 0,
              createdAt: new Date(),
              lastLogin: new Date(),
              telegramId: telegramUser?.id?.toString(),
              telegramUsername: telegramUser?.username,
              telegramFirstName: telegramUser?.first_name,
              telegramLastName: telegramUser?.last_name
            };
            
            set({ profile: newProfile });
            
            // Сохраняем нового пользователя
            await apiService.updateUser(userId, { 
              profile: newProfile,
              gameState: {
                tokens: 0,
                highScore: 0,
                engineLevel: 'Mk I',
                gearboxLevel: 'L1',
                batteryLevel: 'B1',
                hyperdriveLevel: 'H1',
                powerGridLevel: 'P1'
              }
            });
          }
          
          // Загружаем лидерборд с обработкой ошибок
          try {
            console.log('🏆 Загрузка лидерборда...');
            const dbLeaderboard = await apiService.getLeaderboard();
            
            if (dbLeaderboard && dbLeaderboard.length > 0) {
              const leaderboard: LeaderboardEntry[] = dbLeaderboard.map(entry => ({
                id: entry._id.toString(),
                userId: entry.userId,
                username: entry.telegramFirstName || entry.telegramUsername || entry.username || `Игрок ${entry.userId.slice(-4)}`,
                level: Math.floor((entry.tokens || 0) / 1000) + 1, // Уровень на основе токенов
                score: entry.tokens || 0, // Используем tokens
                tokens: entry.tokens || 0, // Отображаем токены
                maxGear: 'M' as Gear,
                rank: entry.rank,
                updatedAt: entry.updatedAt
              }));
              
              console.log(`✅ Загружен лидерборд: ${leaderboard.length} участников`);
              set({ leaderboard });
            } else {
              console.log('⚠️ Лидерборд пуст, создаём mock данные...');
              // Создаём моковые данные для демонстрации
              const mockLeaderboard: LeaderboardEntry[] = [
                {
                  id: 'mock-1',
                  userId: 'test-user-1',
                  username: 'Никита',
                  level: 16,
                  score: 15420,
                  tokens: 15420,
                  maxGear: 'M' as Gear,
                  rank: 1,
                  updatedAt: new Date(),
                  telegramFirstName: 'Никита',
                  telegramLastName: 'Киберов'
                },
                {
                  id: 'mock-2',
                  userId: 'test-user-2',
                  username: 'Анна',
                  level: 13,
                  score: 12300,
                  tokens: 12300,
                  maxGear: 'M' as Gear,
                  rank: 2,
                  updatedAt: new Date(),
                  telegramFirstName: 'Анна',
                  telegramLastName: 'Токенова'
                },
                {
                  id: 'mock-3',
                  userId: 'test-user-3',
                  username: 'Максим',
                  level: 10,
                  score: 9850,
                  tokens: 9850,
                  maxGear: 'M' as Gear,
                  rank: 3,
                  updatedAt: new Date(),
                  telegramFirstName: 'Максим',
                  telegramLastName: 'Тапперович'
                },
                {
                  id: 'mock-4',
                  userId: 'test-user-4',
                  username: 'Елена',
                  level: 8,
                  score: 7200,
                  tokens: 7200,
                  maxGear: 'M' as Gear,
                  rank: 4,
                  updatedAt: new Date(),
                  telegramFirstName: 'Елена',
                  telegramLastName: 'Киберская'
                },
                {
                  id: 'mock-5',
                  userId: 'test-user-5',
                  username: 'Дмитрий',
                  level: 6,
                  score: 5600,
                  tokens: 5600,
                  maxGear: 'M' as Gear,
                  rank: 5,
                  updatedAt: new Date(),
                  telegramFirstName: 'Дмитрий',
                  telegramLastName: 'Флексов'
                }
              ];
              
              set({ leaderboard: mockLeaderboard });
              console.log('📊 Установлен mock лидерборд');
            }
          } catch (leaderboardError) {
            console.error('❌ Ошибка загрузки лидерборда:', leaderboardError);
            // В случае ошибки используем пустой массив
            set({ leaderboard: [] });
          }
          
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

          // Обновляем состояние игры (автоматически обновит лидерборд через API)
          await apiService.updateGameState(state.profile.userId, {
            tokens: state.tokens,
            highScore: state.highScore,
            engineLevel: state.engineLevel,
            gearboxLevel: state.gearboxLevel,
            batteryLevel: state.batteryLevel,
            hyperdriveLevel: state.hyperdriveLevel,
            powerGridLevel: state.powerGridLevel,
            lastSaved: new Date()
          });

          // Дополнительно обновляем лидерборд с Telegram данными
          await apiService.updateLeaderboard({
            userId: state.profile.userId,
            username: state.profile.telegramFirstName || state.profile.telegramUsername || state.profile.username,
            telegramId: state.profile.telegramId,
            telegramUsername: state.profile.telegramUsername,
            telegramFirstName: state.profile.telegramFirstName,
            telegramLastName: state.profile.telegramLastName,
            tokens: state.tokens // Отправляем токены вместо score
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      // Действия с токенами (с автоматическим обновлением лидерборда)
      addTokens: async (amount) => {
        try {
          const state = get();
          const newTokens = state.tokens + amount;
          const newHighScore = Math.max(state.highScore, newTokens);
          
          set({
            tokens: newTokens,
            highScore: newHighScore
          });

          // Автоматически синхронизируем с сервером и лидербордом
          await get().syncGameState();
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      spendTokens: async (amount, itemInfo?: { type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid'; level: string }) => {
        try {
          const state = get();
          if (state.tokens < amount) return false;
          
          const newTransaction = {
            id: Date.now().toString(),
            type: 'purchase' as const,
            amount: -amount,
            timestamp: Date.now(),
            status: 'completed' as const,
            itemInfo
          };
          
          set((state) => ({
            tokens: state.tokens - amount,
            transactions: [newTransaction, ...state.transactions]
          }));

          if (state.profile?.userId) {
            await apiService.addTransaction(state.profile.userId, {
              type: newTransaction.type,
              amount: newTransaction.amount,
              status: newTransaction.status,
              itemInfo: newTransaction.itemInfo
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
          
          const newTransaction = {
            id: Date.now().toString(),
            type: 'withdraw' as const,
            amount: -amount,
            timestamp: Date.now(),
            status: 'completed' as const
          };
          
          set((state) => ({
            tokens: state.tokens - amount,
            transactions: [newTransaction, ...state.transactions]
          }));

          if (state.profile?.userId) {
            await apiService.addTransaction(state.profile.userId, {
              type: newTransaction.type,
              amount: newTransaction.amount,
              status: newTransaction.status
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
          const newTransaction = {
            id: Date.now().toString(),
            type: 'deposit' as const,
            amount: amount,
            timestamp: Date.now(),
            status: 'completed' as const
          };
          
          set((state) => ({
            tokens: state.tokens + amount,
            transactions: [newTransaction, ...state.transactions]
          }));

          if (get().profile?.userId) {
            await apiService.addTransaction(get().profile!.userId, {
              type: newTransaction.type,
              amount: newTransaction.amount,
              status: newTransaction.status
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
            await apiService.updateUser(newProfile.userId, { profile: newProfile });
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
            await apiService.addTransaction(state.profile.userId, {
              type: newTransaction.type,
              amount: newTransaction.amount,
              status: newTransaction.status
            });
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
            await apiService.updateLeaderboard({
              userId: state.profile.userId,
              username: state.profile.telegramFirstName || state.profile.telegramUsername || state.profile.username,
              telegramId: state.profile.telegramId,
              telegramUsername: state.profile.telegramUsername,
              telegramFirstName: state.profile.telegramFirstName,
              telegramLastName: state.profile.telegramLastName,
              tokens: state.tokens // Используем tokens вместо score
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
      setHyperdriveActive: (state: boolean) => set({ hyperdriveActive: state }),

      // Автоматическая синхронизация каждые 30 секунд
      startAutoSync: () => {
        const interval = setInterval(async () => {
          try {
            const state = get();
            if (state.profile?.userId && state.tokens >= 0) {
              console.log('🔄 Автосинхронизация лидерборда...');
              
              // Синхронизируем состояние игры
              try {
                await get().syncGameState();
              } catch (syncError) {
                console.error('⚠️ Ошибка синхронизации gameState:', syncError);
              }
              
              // Обновляем лидерборд
              try {
                const dbLeaderboard = await apiService.getLeaderboard();
                if (dbLeaderboard && dbLeaderboard.length > 0) {
                  const leaderboard = dbLeaderboard.map(entry => ({
                    id: entry._id.toString(),
                    userId: entry.userId,
                    username: entry.telegramFirstName || entry.telegramUsername || entry.username || `Игрок ${entry.userId.slice(-4)}`,
                    level: Math.floor((entry.tokens || 0) / 1000) + 1,
                    score: entry.tokens || 0,
                    tokens: entry.tokens || 0,
                    maxGear: 'M' as Gear,
                    rank: entry.rank,
                    updatedAt: entry.updatedAt
                  }));
                  set({ leaderboard });
                  console.log(`✅ Автосинхронизация: обновлён лидерборд (${leaderboard.length} участников)`);
                } else {
                  console.log('⚠️ Автосинхронизация: лидерборд пуст');
                }
              } catch (leaderboardError) {
                console.error('⚠️ Ошибка автосинхронизации лидерборда:', leaderboardError);
              }
            }
          } catch (error) {
            console.error('❌ Ошибка автосинхронизации:', error);
          }
        }, 30000); // 30 секунд

        // Сохраняем interval ID для очистки
        (window as any).tapdel_sync_interval = interval;
      },

      stopAutoSync: () => {
        if ((window as any).tapdel_sync_interval) {
          clearInterval((window as any).tapdel_sync_interval);
          (window as any).tapdel_sync_interval = null;
        }
      }
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