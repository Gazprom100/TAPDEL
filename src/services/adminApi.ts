import { apiService } from './api';

// Интерфейсы для админ API
export interface AdminStats {
  totalUsers: number;
  totalTokens: number;
  totalDeposits: number;
  sumDeposits: number;
  totalWithdrawals: number;
  sumWithdrawals: number;
  activeUsers: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  uptime: number;
  activeConnections: number;
}

export interface BlockchainStatus {
  lastBlock: number;
  blockTime: number;
  confirmations: number;
  networkHashrate: number;
  isConnected: boolean;
}

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export interface User {
  _id: string;
  userId: string;
  username: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramUsername?: string;
  tokens: number;
  highScore: number;
  level: number;
  isBanned: boolean;
  role: 'admin' | 'moderator' | 'user';
  createdAt: string;
  lastActive: string;
  totalDeposits: number;
  totalWithdrawals: number;
}

export interface Transaction {
  _id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'purchase';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  txHash?: string;
  createdAt: string;
  processedAt?: string;
}

export interface GameSettings {
  token: {
    symbol: string;
    contractAddress: string;
    decimals: number;
  };
  gameMechanics: {
    baseReward: number;
    maxFingers: number;
    rateWindow: number;
  };
  gearMultipliers: Record<string, number>;
  gearThresholds: Record<string, number>;
  energy: {
    recoveryRate: number;
    consumptionRate: Record<string, number>;
  };
  components: {
    engines: number[];
    gearboxes: number[];
    batteries: number[];
    hyperdrives: number[];
    powerGrids: number[];
  };
}

class AdminApiService {
  private baseUrl = '/api/admin';

  // Получить статистику админ панели
  async getStatistics(): Promise<AdminStats> {
    try {
      const response = await fetch(`${this.baseUrl}/statistics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }

  // Получить метрики системы
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/system/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения метрик системы:', error);
      // Возвращаем дефолтные значения при ошибке
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: { in: 0, out: 0 },
        uptime: 0,
        activeConnections: 0
      };
    }
  }

  // Получить статус блокчейна
  async getBlockchainStatus(): Promise<BlockchainStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/blockchain/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения статуса блокчейна:', error);
      // Возвращаем дефолтные значения при ошибке
      return {
        lastBlock: 0,
        blockTime: 0,
        confirmations: 0,
        networkHashrate: 0,
        isConnected: false
      };
    }
  }

  // Получить статус сервисов
  async getServicesStatus(): Promise<ServiceStatus[]> {
    try {
      const response = await fetch(`${this.baseUrl}/services/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения статуса сервисов:', error);
      // Возвращаем дефолтные значения при ошибке
      return [
        {
          name: 'MongoDB',
          status: 'offline' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString(),
          error: 'Сервис недоступен'
        },
        {
          name: 'Redis',
          status: 'offline' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString(),
          error: 'Сервис недоступен'
        },
        {
          name: 'DecimalChain API',
          status: 'offline' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString(),
          error: 'Сервис недоступен'
        },
        {
          name: 'Telegram Bot',
          status: 'offline' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString(),
          error: 'Сервис недоступен'
        }
      ];
    }
  }

  // Получить список пользователей
  async getUsers(page: number = 1, limit: number = 20, search?: string, role?: string, status?: string): Promise<{ users: User[], total: number, pages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) params.append('search', search);
      if (role && role !== 'all') params.append('role', role);
      if (status && status !== 'all') params.append('status', status);

      const response = await fetch(`${this.baseUrl}/users?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      throw error;
    }
  }

  // Обновить пользователя
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      throw error;
    }
  }

  // Массовое обновление пользователей
  async bulkUpdateUsers(userIds: string[], action: 'ban' | 'unban' | 'resetBalance' | 'delete'): Promise<any> {
    try {
      const response = await fetch('/api/admin/users/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds, action })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка массового обновления пользователей:', error);
      throw error;
    }
  }

  // Получить транзакции
  async getTransactions(page: number = 1, limit: number = 20, type?: string, status?: string): Promise<{ transactions: Transaction[], total: number, pages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (type) params.append('type', type);
      if (status) params.append('status', status);

      const response = await fetch(`${this.baseUrl}/transactions?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения транзакций:', error);
      throw error;
    }
  }

  // Получить настройки игры
  async getGameSettings(): Promise<GameSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/settings`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения настроек игры:', error);
      throw error;
    }
  }

  // Сохранить настройки игры
  async saveGameSettings(settings: GameSettings): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      throw error;
    }
  }

  // Сбросить лидерборд
  async resetLeaderboard(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/reset-leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ adminKey: 'tapdel-reset-2025' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка сброса лидерборда:', error);
      throw error;
    }
  }

  // Получить логи системы
  async getSystemLogs(limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/logs?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения логов:', error);
      return [];
    }
  }

  // Получить экономические метрики
  async getEconomyMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/economy/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения экономических метрик:', error);
      throw error;
    }
  }

  // Получить аналитические отчеты
  async getAnalyticsReports(type: string, period: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/${type}?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка получения аналитических отчетов:', error);
      throw error;
    }
  }
}

export const adminApiService = new AdminApiService(); 