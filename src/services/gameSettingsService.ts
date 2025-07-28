export interface GameSettings {
  baseTokensPerTap: number;
  energyMax: number;
  energyRegenRate: number;
  components: {
    engine: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    gearbox: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    battery: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    hyperdrive: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
    powerGrid: {
      maxLevel: number;
      costs: number[];
      bonuses: number[];
    };
  };
  leaderboard: {
    updateInterval: number;
    maxEntries: number;
    resetInterval: string;
  };
  economy: {
    withdrawalMinAmount: number;
    withdrawalFee: number;
    depositMinAmount: number;
    dailyWithdrawalLimit: number;
  };
  events: {
    dailyBonus: {
      enabled: boolean;
      amount: number;
      streakBonus: number;
    };
    referralBonus: {
      enabled: boolean;
      amount: number;
      referrerBonus: number;
    };
  };
}

class GameSettingsService {
  private settings: GameSettings | null = null;
  private lastUpdate = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 минут

  async getSettings(): Promise<GameSettings> {
    const now = Date.now();
    
    // Проверяем кеш
    if (this.settings && (now - this.lastUpdate) < this.CACHE_DURATION) {
      return this.settings as GameSettings;
    }

    try {
      const response = await fetch('/api/admin/game-config');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.settings = data.config;
          this.lastUpdate = now;
          console.log('🎮 Настройки игры загружены:', this.settings);
          return this.settings as GameSettings;
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки настроек игры:', error);
    }

    // Возвращаем дефолтные настройки если не удалось загрузить
    const defaultSettings = this.getDefaultSettings();
    this.settings = defaultSettings;
    this.lastUpdate = now;
    return defaultSettings;
  }

  private getDefaultSettings(): GameSettings {
    return {
      baseTokensPerTap: 1,
      energyMax: 1000,
      energyRegenRate: 1,
      components: {
        engine: {
          maxLevel: 25,
          costs: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200],
          bonuses: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
        },
        gearbox: {
          maxLevel: 25,
          costs: [150, 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 76800],
          bonuses: [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536]
        },
        battery: {
          maxLevel: 25,
          costs: [200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 102400],
          bonuses: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200]
        },
        hyperdrive: {
          maxLevel: 20,
          costs: [1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000],
          bonuses: [10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120]
        },
        powerGrid: {
          maxLevel: 15,
          costs: [500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000],
          bonuses: [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560]
        }
      },
      leaderboard: {
        updateInterval: 60,
        maxEntries: 100,
        resetInterval: 'weekly'
      },
      economy: {
        withdrawalMinAmount: 100,
        withdrawalFee: 0.01,
        depositMinAmount: 10,
        dailyWithdrawalLimit: 10000
      },
      events: {
        dailyBonus: {
          enabled: true,
          amount: 100,
          streakBonus: 1.5
        },
        referralBonus: {
          enabled: true,
          amount: 500,
          referrerBonus: 100
        }
      }
    };
  }

  // Очистить кеш для принудительной перезагрузки
  clearCache() {
    this.settings = null;
    this.lastUpdate = 0;
  }

  // Получить конкретное значение из настроек
  async getValue<T>(path: string[]): Promise<T | null> {
    const settings = await this.getSettings();
    let value: any = settings;
    
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value as T;
  }
}

export const gameSettingsService = new GameSettingsService(); 