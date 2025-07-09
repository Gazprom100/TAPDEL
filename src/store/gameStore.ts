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
  lastSyncTime: number; // Добавляем поле для отслеживания синхронизации
  // tokens = единственный DEL баланс (рейтинг + покупки)
}

interface GameActions {
  // Системные действия
  initializeUser: (userId: string) => Promise<void>;
  syncGameState: () => Promise<void>;
  
  // Действия с токенами
  addTokens: (amount: number) => Promise<void>;
  addDelFromDeposit: (amount: number) => Promise<void>; // Для ввода DEL извне (не тапанье)
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
  
  // Обновление только лидерборда
  refreshLeaderboard: () => Promise<void>;
  
  // Обновление DEL баланса (теперь это единственная валюта)
  refreshBalance: () => Promise<void>;
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
      lastSyncTime: 0, // Инициализируем lastSyncTime
      // Убираем delBalance - используем только tokens как DEL

      // Системные действия
      setError: (error) => set({ error }),
      
      initializeUser: async (userId) => {
        try {
          console.log(`🏁 gameStore.initializeUser запущен для userId: ${userId}`);
          set({ isLoading: true, error: null });
          
          // Проверяем если пользователь тот же - не сбрасываем данные
          const existingState = get();
          const isSameUser = existingState.profile?.userId === userId;

          if (!isSameUser) {
            console.log(`🔄 Новый пользователь (${userId}), сброс локального состояния...`);
            set({
              tokens: 0,
              highScore: 0,
              engineLevel: COMPONENTS.ENGINES[0].level as EngineMark,
              gearboxLevel: COMPONENTS.GEARBOXES[0].level as GearboxLevel,
              batteryLevel: COMPONENTS.BATTERIES[0].level as BatteryLevel,
              hyperdriveLevel: COMPONENTS.HYPERDRIVES[0].level as HyperdriveLevel,
              powerGridLevel: COMPONENTS.POWER_GRIDS[0].level as PowerGridLevel,
              profile: null,
              transactions: [],
              leaderboard: [],
              lastSyncTime: 0
            });
          } else {
            console.log(`✅ Тот же пользователь (${userId}), проверяем актуальность данных...`);
          }
          
          // Проверяем нужна ли миграция данных
          const oldUserId = localStorage.getItem('oldUserId');
          if (oldUserId && oldUserId !== userId) {
            console.log(`🔄 Обнаружена необходимость миграции: ${oldUserId} -> ${userId}`);
            try {
              const migrationResult = await apiService.migrateUser(userId, oldUserId);
              if (migrationResult.migrated) {
                console.log(`✅ Миграция выполнена успешно, токены: ${migrationResult.tokens}`);
                // Очищаем старый userId из localStorage
                localStorage.removeItem('oldUserId');
              } else {
                console.log(`⚠️ Миграция не выполнена или не требуется`);
                // Очищаем oldUserId даже если миграция не нужна, чтобы избежать повторных попыток
                localStorage.removeItem('oldUserId');
              }
            } catch (error) {
              console.error('❌ Ошибка миграции:', error);
              // Очищаем oldUserId чтобы не зациклиться
              localStorage.removeItem('oldUserId');
            }
          }
          
          // ОБЯЗАТЕЛЬНО загружаем данные пользователя из MongoDB
          console.log(`🔍 Загружаем актуальные данные пользователя из MongoDB...`);
          const user = await apiService.getUser(userId);
          
          if (user) {
            console.log(`✅ Пользователь найден в базе:`, {
              userId: user.userId,
              profileUsername: user.profile?.username,
              telegramUsername: user.profile?.telegramUsername,
              tokens: user.gameState?.tokens
            });
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
              transactions,
              lastSyncTime: Date.now()
            });
            
            // АВТОМАТИЧЕСКИ ОБНОВЛЯЕМ ПРОФИЛЬ С АКТУАЛЬНЫМИ TELEGRAM ДАННЫМИ
            try {
              const storedTelegramData = localStorage.getItem('telegramUserData');
              if (storedTelegramData) {
                const telegramData = JSON.parse(storedTelegramData);
                console.log('📱 Обновляем профиль с актуальными Telegram данными:', telegramData);
                
                const updatedProfile = {
                  ...profile,
                  telegramId: telegramData.telegramId,
                  telegramUsername: telegramData.telegramUsername,
                  telegramFirstName: telegramData.telegramFirstName,
                  telegramLastName: telegramData.telegramLastName,
                  username: telegramData.username || profile.username,
                  lastLogin: new Date()
                };
                
                // Обновляем профиль в состоянии и MongoDB
                set({ profile: updatedProfile });
                await apiService.updateUser(userId, { 
                  profile: updatedProfile,
                  gameState: {
                    ...gameState,
                    lastSaved: new Date()
                  }
                });
                console.log('✅ Профиль обновлен с актуальными Telegram данными');
              }
            } catch (error) {
              console.warn('⚠️ Ошибка обновления профиля Telegram данными:', error);
            }
                      } else {
            console.log(`❌ Пользователь НЕ найден в базе, создаём нового...`);
            // Создаем нового пользователя с Telegram данными если возможно
            let telegramUserData = null;
            
            // Пытаемся получить данные из localStorage сначала
            try {
              const storedData = localStorage.getItem('telegramUserData');
              if (storedData) {
                telegramUserData = JSON.parse(storedData);
                console.log('📱 Используем сохраненные Telegram данные:', telegramUserData);
              }
            } catch (error) {
              console.warn('⚠️ Ошибка парсинга Telegram данных из localStorage:', error);
            }
            
            // Если в localStorage нет данных, получаем из Telegram WebApp
            if (!telegramUserData) {
              const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
              if (telegramUser?.id) {
                telegramUserData = {
                  telegramId: telegramUser.id.toString(),
                  telegramUsername: telegramUser.username,
                  telegramFirstName: telegramUser.first_name,
                  telegramLastName: telegramUser.last_name,
                  username: telegramUser.username || `${telegramUser.first_name} ${telegramUser.last_name}`.trim()
                };
                console.log('📱 Получены свежие Telegram данные:', telegramUserData);
              }
            }
            
            const newProfile: UserProfile = {
              userId,
              username: telegramUserData?.username || 
                       (telegramUserData?.telegramFirstName && telegramUserData?.telegramLastName) ? 
                       `${telegramUserData.telegramFirstName} ${telegramUserData.telegramLastName}` :
                       telegramUserData?.telegramFirstName || 
                       telegramUserData?.telegramUsername || 
                       `Игрок ${userId.slice(-4)}`,
              maxEnergy: 100,
              energyRecoveryRate: 1,
              maxGear: 'M' as Gear,
              level: 1,
              experience: 0,
              createdAt: new Date(),
              lastLogin: new Date(),
              telegramId: telegramUserData?.telegramId,
              telegramUsername: telegramUserData?.telegramUsername,
              telegramFirstName: telegramUserData?.telegramFirstName,
              telegramLastName: telegramUserData?.telegramLastName
            };
            
            set({ profile: newProfile, lastSyncTime: Date.now() });
            
            console.log('💾 Создаем нового пользователя:', newProfile);
            
            // ПРИНУДИТЕЛЬНО сохраняем нового пользователя в MongoDB
            try {
              const initResult = await apiService.initializeUser(userId, {
                profile: newProfile,
                gameState: {
                  tokens: 0,
                  highScore: 0,
                  engineLevel: 'Mk I',
                  gearboxLevel: 'L1',
                  batteryLevel: 'B1',
                  hyperdriveLevel: 'H1',
                  powerGridLevel: 'P1',
                  lastSaved: new Date()
                },
                telegramData: telegramUserData
              });
              
              console.log(`✅ Пользователь ${userId} ${initResult.isNewUser ? 'создан' : 'обновлен'} через API инициализации`);
              
              // Обновляем состояние с данными от сервера
              if (initResult.user) {
                set({
                  profile: initResult.user.profile,
                  tokens: initResult.user.gameState.tokens,
                  highScore: initResult.user.gameState.highScore,
                  engineLevel: initResult.user.gameState.engineLevel as EngineMark,
                  gearboxLevel: initResult.user.gameState.gearboxLevel as GearboxLevel,
                  batteryLevel: initResult.user.gameState.batteryLevel as BatteryLevel,
                  hyperdriveLevel: initResult.user.gameState.hyperdriveLevel as HyperdriveLevel,
                  powerGridLevel: initResult.user.gameState.powerGridLevel as PowerGridLevel,
                  transactions: initResult.user.transactions || [],
                  lastSyncTime: Date.now()
                });
              }
              
            } catch (initError) {
              console.error('❌ Ошибка инициализации пользователя через API:', initError);
              
              // Fallback: используем старый метод
              try {
                await apiService.updateUser(userId, { 
                  profile: newProfile,
                  gameState: {
                    tokens: 0,
                    highScore: 0,
                    engineLevel: 'Mk I',
                    gearboxLevel: 'L1',
                    batteryLevel: 'B1',
                    hyperdriveLevel: 'H1',
                    powerGridLevel: 'P1',
                    lastSaved: new Date()
                  },
                  transactions: []
                });
                console.log('✅ Новый пользователь сохранен через fallback метод');
              } catch (fallbackError) {
                console.error('❌ Критическая ошибка: не удалось сохранить пользователя:', fallbackError);
              }
            }
            
            // ПРИНУДИТЕЛЬНО добавляем нового пользователя в лидерборд (дублирующий вызов для надежности)
            try {
              const leaderboardData = {
                userId: userId,
                username: newProfile.username,
                telegramId: newProfile.telegramId,
                telegramUsername: newProfile.telegramUsername,
                telegramFirstName: newProfile.telegramFirstName,
                telegramLastName: newProfile.telegramLastName,
                tokens: 0
              };
              console.log('🏆 Дополнительно добавляем пользователя в лидерборд:', leaderboardData);
              
              await apiService.updateLeaderboard(leaderboardData);
              console.log('✅ Пользователь дополнительно добавлен в лидерборд');
            } catch (error) {
              console.error('⚠️ Ошибка дополнительного добавления в лидерборд:', error);
            }
          }
          
          // Сразу добавляем текущего пользователя в лидерборд
          const currentState = get();
          if (currentState.profile?.userId) {
            try {
              console.log(`🏆 Добавляем текущего пользователя в лидерборд с ${currentState.tokens} токенами`);
              await apiService.updateLeaderboard({
                userId: currentState.profile.userId,
                username: currentState.profile.username ||
                       (currentState.profile.telegramFirstName && currentState.profile.telegramLastName) ? `${currentState.profile.telegramFirstName} ${currentState.profile.telegramLastName}` :
                       currentState.profile.telegramFirstName || currentState.profile.telegramUsername || `Игрок ${currentState.profile.userId.slice(-4)}`,
                telegramId: currentState.profile.telegramId,
                telegramUsername: currentState.profile.telegramUsername,
                telegramFirstName: currentState.profile.telegramFirstName,
                telegramLastName: currentState.profile.telegramLastName,
                tokens: currentState.tokens
              });
              console.log(`✅ Пользователь добавлен в лидерборд`);
            } catch (error) {
              console.error('❌ Ошибка добавления в лидерборд:', error);
            }
          }
          
          // Загружаем лидерборд с обработкой ошибок
          try {
            console.log('🏆 Загрузка лидерборда...');
          const dbLeaderboard = await apiService.getLeaderboard();
            
            if (dbLeaderboard && dbLeaderboard.length > 0) {
          const leaderboard: LeaderboardEntry[] = dbLeaderboard.map(entry => ({
            id: entry._id.toString(),
            userId: entry.userId,
                username: entry.username || 
                         (entry.telegramFirstName && entry.telegramLastName) ? `${entry.telegramFirstName} ${entry.telegramLastName}` :
                         entry.telegramFirstName || entry.telegramUsername || `Игрок ${entry.userId.slice(-4)}`,
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
              console.log('📊 Лидерборд пуст - ожидаем первых игроков');
              set({ leaderboard: [] });
            }
          } catch (leaderboardError) {
            console.error('❌ Ошибка загрузки лидерборда:', leaderboardError);
            // В случае ошибки используем пустой массив
            set({ leaderboard: [] });
          }
          
          // Инициализируем DEL баланс
          try {
            console.log('💰 Инициализация DEL баланса...');
            await get().refreshBalance();
          } catch (delBalanceError) {
            console.warn('⚠️ Не удалось загрузить DEL баланс (нормально для новых пользователей):', delBalanceError);
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
          if (!state.profile?.userId) {
            console.warn('⚠️ Синхронизация пропущена: нет userId');
            return;
          }

          console.log(`🔄 Синхронизация ВСЕХ данных с MongoDB для ${state.profile.userId}`);
          
          // highScore всегда только увеличивается (общее количество натапанного)
          // НЕ обновляем highScore из tokens - это неправильно

          // Сохраняем полное состояние игры в MongoDB
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

          // Автоматически обновляем лидерборд с новыми данными
          try {
          await apiService.updateLeaderboard({
            userId: state.profile.userId,
              username: state.profile.username ||
                       (state.profile.telegramFirstName && state.profile.telegramLastName) ? `${state.profile.telegramFirstName} ${state.profile.telegramLastName}` :
                       state.profile.telegramFirstName || state.profile.telegramUsername || `Игрок ${state.profile.userId.slice(-4)}`,
              telegramId: state.profile.telegramId,
              telegramUsername: state.profile.telegramUsername,
              telegramFirstName: state.profile.telegramFirstName,
              telegramLastName: state.profile.telegramLastName,
              tokens: state.tokens
            });
            console.log(`🏆 Лидерборд обновлен с ${state.tokens} токенами`);
          } catch (leaderboardError) {
            console.warn('⚠️ Ошибка обновления лидерборда:', leaderboardError);
          }

          console.log(`✅ Полная синхронизация завершена`);
        } catch (error) {
          console.error('❌ Ошибка синхронизации gameState:', error);
          set({ error: (error as Error).message });
        }
      },

      // Действия с токенами (DEL - единственная валюта)
      addTokens: async (amount) => {
        try {
          set((state) => ({ 
            tokens: state.tokens + amount,
            highScore: state.highScore + amount // highScore = все натапанное за всё время
          }));
          
          // НЕМЕДЛЕННАЯ синхронизация с MongoDB
          await get().syncGameState();
          console.log(`💰 Добавлено ${amount} DEL (баланс: ${get().tokens}, натапано всего: ${get().highScore})`);
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      addDelFromDeposit: async (amount) => {
        try {
          set((state) => ({ tokens: state.tokens + amount }));
          await get().syncGameState();
          console.log(`💰 Добавлено ${amount} DEL из депозита (баланс: ${get().tokens})`);
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      spendTokens: async (amount, itemInfo?: { type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid'; level: string }) => {
        try {
          const state = get();
          
          console.log(`💸 spendTokens вызван:`, {
            amount,
            currentTokens: state.tokens,
            itemInfo,
            hasProfile: !!state.profile,
            userId: state.profile?.userId
          });
          
          if (state.tokens < amount) {
            console.warn(`❌ spendTokens: Недостаточно средств: нужно ${amount}, доступно ${state.tokens} DEL`);
            return false;
          }
          
          // Обновляем локальное состояние
          const newTransaction = {
            id: Date.now().toString(),
            type: 'purchase' as const,
            amount: -amount,
            timestamp: Date.now(),
            status: 'completed' as const,
            itemInfo
          };
          
          console.log(`💸 Обновляем локальное состояние: tokens ${state.tokens} -> ${state.tokens - amount}`);
          set((state) => ({
            tokens: state.tokens - amount,
            transactions: [newTransaction, ...state.transactions]
          }));

          // НЕМЕДЛЕННО сохраняем транзакцию в MongoDB
          if (state.profile?.userId) {
            console.log(`💾 Сохраняем транзакцию в MongoDB для ${state.profile.userId}`);
            try {
              await apiService.addTransaction(state.profile.userId, {
                type: newTransaction.type,
                amount: newTransaction.amount,
                status: newTransaction.status,
                itemInfo: newTransaction.itemInfo
              });
              console.log(`✅ Транзакция сохранена в MongoDB`);
            } catch (transactionError) {
              console.error(`❌ Ошибка сохранения транзакции:`, transactionError);
              // Продолжаем выполнение несмотря на ошибку
            }
          } else {
            console.warn(`⚠️ Нет userId, транзакция не сохранена в MongoDB`);
          }

          // НЕМЕДЛЕННО синхронизируем состояние с MongoDB
          try {
            console.log(`🔄 Синхронизируем состояние с MongoDB`);
            await get().syncGameState();
            console.log(`✅ Состояние синхронизировано с MongoDB`);
          } catch (syncError) {
            console.error(`❌ Ошибка синхронизации:`, syncError);
            // Продолжаем выполнение несмотря на ошибку
          }
          
          console.log(`💸 spendTokens завершен успешно: потрачено ${amount} DEL`);
          return true;
        } catch (error) {
          console.error('❌ spendTokens: Критическая ошибка:', error);
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
        console.log(`🔧 Апгрейд двигателя до ${level}`);
        await get().syncGameState();
      },
      
      upgradeGearbox: async (level) => {
        set({ gearboxLevel: level });
        console.log(`⚙️ Апгрейд коробки передач до ${level}`);
        await get().syncGameState();
      },
      
      upgradeBattery: async (level) => {
        set({ batteryLevel: level });
        console.log(`🔋 Апгрейд батареи до ${level}`);
        await get().syncGameState();
      },
      
      upgradeHyperdrive: async (level) => {
        set({ hyperdriveLevel: level });
        console.log(`🚀 Апгрейд гипердвигателя до ${level}`);
        await get().syncGameState();
      },
      
      upgradePowerGrid: async (level) => {
        set({ powerGridLevel: level });
        console.log(`⚡ Апгрейд энергосети до ${level}`);
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
              username: state.profile.username ||
                       (state.profile.telegramFirstName && state.profile.telegramLastName) ? `${state.profile.telegramFirstName} ${state.profile.telegramLastName}` :
                       state.profile.telegramFirstName || state.profile.telegramUsername || `Игрок ${state.profile.userId.slice(-4)}`,
              telegramId: state.profile.telegramId,
              telegramUsername: state.profile.telegramUsername,
              telegramFirstName: state.profile.telegramFirstName,
              telegramLastName: state.profile.telegramLastName,
              tokens: state.highScore // ИСПРАВЛЕНО: Используем highScore для рейтинга, НЕ tokens
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

      // Автоматическая синхронизация каждые 10 секунд (увеличена частота)
      startAutoSync: () => {
        const interval = setInterval(async () => {
          try {
            const state = get();
            if (!state.profile?.userId) return;

            console.log(`🔄 Автосинхронизация: обновление данных из MongoDB...`);
            
            // 1. ВСЕГДА синхронизируем ТЕКУЩИЕ данные в MongoDB
            try {
              await get().syncGameState();
              console.log(`✅ Локальные данные синхронизированы с MongoDB`);
            } catch (error) {
              console.warn('⚠️ Ошибка синхронизации локальных данных:', error);
            }
            
            // 2. Перезагружаем актуальные данные пользователя из MongoDB
            try {
              const user = await apiService.getUser(state.profile.userId);
              if (user) {
                const { gameState, profile, transactions } = user;
                
                // Проверяем есть ли более новые данные на сервере
                const serverLastSaved = new Date(gameState.lastSaved || 0).getTime();
                const localLastSync = get().lastSyncTime || 0;
                
                if (serverLastSaved > localLastSync) {
                  console.log(`📥 Загружаем более новые данные с сервера`);
                  set({
                    tokens: gameState.tokens,
                    highScore: gameState.highScore,
                    engineLevel: gameState.engineLevel as EngineMark,
                    gearboxLevel: gameState.gearboxLevel as GearboxLevel,
                    batteryLevel: gameState.batteryLevel as BatteryLevel,
                    hyperdriveLevel: gameState.hyperdriveLevel as HyperdriveLevel,
                    powerGridLevel: gameState.powerGridLevel as PowerGridLevel,
                    profile,
                    transactions,
                    lastSyncTime: Date.now()
                  });
                  console.log(`✅ Данные пользователя обновлены: ${gameState.tokens} токенов`);
                } else {
                  console.log(`✅ Локальные данные актуальны`);
                }
              }
            } catch (error) {
              console.warn('⚠️ Ошибка загрузки данных пользователя:', error);
            }
            
            // 3. Загружаем свежий лидерборд
            try {
              const dbLeaderboard = await apiService.getLeaderboard();
              if (dbLeaderboard && dbLeaderboard.length > 0) {
                const leaderboard = dbLeaderboard.map(entry => ({
                  id: entry._id.toString(),
                  userId: entry.userId,
                  username: entry.username ||
                           (entry.telegramFirstName && entry.telegramLastName) ? `${entry.telegramFirstName} ${entry.telegramLastName}` :
                           entry.telegramFirstName || entry.telegramUsername || `Игрок ${entry.userId.slice(-4)}`,
                  level: Math.floor((entry.tokens || 0) / 1000) + 1,
                  score: entry.tokens || 0,
                  tokens: entry.tokens || 0,
                  maxGear: 'M' as Gear,
                  rank: entry.rank,
                  updatedAt: entry.updatedAt
                }));
                set({ leaderboard });
                
                // Проверяем есть ли мы в лидерборде
                const currentUser = leaderboard.find(entry => entry.userId === state.profile?.userId);
                if (currentUser) {
                  console.log(`✅ Найдены в лидерборде: ранг ${currentUser.rank}, токены ${currentUser.tokens}`);
                } else {
                  console.log(`⚠️ НЕ найдены в лидерборде`);
                }
              }
            } catch (error) {
              console.error('❌ Ошибка загрузки лидерборда:', error);
            }
            
          } catch (error) {
            console.error('❌ Ошибка автосинхронизации:', error);
          }
        }, 3000); // 3 секунды для очень быстрой синхронизации между устройствами

        (window as any).tapdel_sync_interval = interval;
      },

      stopAutoSync: () => {
        if ((window as any).tapdel_sync_interval) {
          clearInterval((window as any).tapdel_sync_interval);
          (window as any).tapdel_sync_interval = null;
        }
      },

      // Обновление только лидерборда
      refreshLeaderboard: async () => {
        try {
          const dbLeaderboard = await apiService.getLeaderboard();
          if (dbLeaderboard && dbLeaderboard.length > 0) {
            const leaderboard = dbLeaderboard.map(entry => ({
              id: entry._id.toString(),
              userId: entry.userId,
              username: entry.username ||
                       (entry.telegramFirstName && entry.telegramLastName) ? `${entry.telegramFirstName} ${entry.telegramLastName}` :
                       entry.telegramFirstName || entry.telegramUsername || `Игрок ${entry.userId.slice(-4)}`,
              level: Math.floor((entry.tokens || 0) / 1000) + 1,
              score: entry.tokens || 0,
              tokens: entry.tokens || 0,
              maxGear: 'M' as Gear,
              rank: entry.rank,
              updatedAt: entry.updatedAt
            }));
            set({ leaderboard });
            console.log(`✅ Обновлен лидерборд (${leaderboard.length} участников)`);
          } else {
            console.log('⚠️ Обновление лидерборда: лидерборд пуст');
          }
        } catch (error) {
          console.error('❌ Ошибка обновления лидерборда:', error);
        }
      },

      // Обновление DEL баланса (единственная валюта)
      refreshBalance: async () => {
        try {
          const state = get();
          if (!state.profile?.userId) return;
          
          const { decimalApi } = await import('../services/decimalApi');
          const balance = await decimalApi.getUserBalance(state.profile.userId);
          
          // ИСПРАВЛЕНО: НЕ перезаписываем натапанные токены если DEL баланс пустой
          const blockchainBalance = balance.workingWalletBalance || 0;
          const currentGameTokens = state.tokens;
          
          // Если DEL баланс больше игрового - обновляем (пополнение)
          // Если DEL баланс меньше - НЕ трогаем игровые токены (они натапаны)
          if (blockchainBalance > currentGameTokens) {
            set({ tokens: blockchainBalance });
            console.log(`💰 Пополнен DEL баланс: ${blockchainBalance} DEL (было: ${currentGameTokens})`);
          } else {
            console.log(`💰 DEL баланс: ${blockchainBalance} DEL, игровые токены: ${currentGameTokens} DEL (без изменений)`);
          }
          
          // Автоматически обновляем рейтинг (используя highScore, НЕ tokens)
          await get().refreshLeaderboard();
          
        } catch (error) {
          console.error('❌ Ошибка обновления DEL баланса:', error);
        }
      }
    }),
    {
      name: 'tapdel-storage',
      partialize: (state) => ({
        // КРИТИЧЕСКИ ВАЖНЫЕ данные для восстановления сессии
        profile: state.profile, // ОБЯЗАТЕЛЬНО для идентификации пользователя

        // Основные игровые данные (кеш для быстрого запуска)
        tokens: state.tokens,
        highScore: state.highScore,
        engineLevel: state.engineLevel,
        gearboxLevel: state.gearboxLevel,
        batteryLevel: state.batteryLevel,
        hyperdriveLevel: state.hyperdriveLevel,
        powerGridLevel: state.powerGridLevel,

        // Временные игровые параметры для плавной работы интерфейса
        fuelLevel: state.fuelLevel,
        currentGear: state.currentGear,
        temperature: state.temperature,
        powerLevel: state.powerLevel,
        isOverheated: state.isOverheated,
        coolingTimer: state.coolingTimer,
        lastTapTimestamp: state.lastTapTimestamp,
        hyperdriveActive: state.hyperdriveActive,

        // Метка времени для отслеживания синхронизации
        lastSyncTime: state.lastSyncTime

        // Принцип: Сохраняем для быстрого старта, MongoDB остается источником истины
      })
    }
  )
); 