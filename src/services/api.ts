import { UserProfile, Transaction, Gear } from '../types';

export interface ApiUser {
  userId: string;
  gameState: {
    tokens: number;
    highScore: number;
    engineLevel: string;
    gearboxLevel: string;
    batteryLevel: string;
    hyperdriveLevel: string;
    powerGridLevel: string;
    lastSaved?: Date;
  };
  profile: UserProfile;
  transactions: Transaction[];
}

export interface ApiLeaderboard {
  _id: string;
  userId: string;
  username: string;
  tokens: number; // Изменено с score на tokens
  rank: number;
  updatedAt: Date;
  // Telegram данные
  telegramId?: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.MODE === 'production'
      ? '/api' 
      : 'http://localhost:3000/api';
  }

  private async request<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
            'Cache-Control': 'no-cache', // Принудительно отключаем кеширование
            'Pragma': 'no-cache',
          ...options?.headers,
        },
          cache: 'no-store', // Отключаем кеш браузера
        ...options,
      });

      if (!response.ok) {
          const errorData = await response.text();
          const error = new Error(`HTTP error! status: ${response.status} - ${errorData}`);
          (error as any).status = response.status;
          throw error;
      }

      return await response.json();
    } catch (error) {
        console.error(`API request failed (attempt ${i + 1}/${retries + 1}):`, error);
        
        if (i === retries) {
      throw error;
        }
        
        // Задержка между попытками
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  async getUser(userId: string): Promise<ApiUser | null> {
    try {
      return await this.request<ApiUser>(`/users/${userId}`);
    } catch (error) {
      // Проверяем на 404 статус
      if ((error as any).status === 404 || (error as Error).message.includes('404') || (error as Error).message.includes('User not found')) {
        console.log(`👤 Пользователь ${userId} не найден в базе (404)`);
        return null;
      }
      console.error(`❌ Ошибка загрузки пользователя ${userId}:`, error);
      throw error;
    }
  }

  async updateUser(userId: string, data: Partial<ApiUser>): Promise<void> {
    await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateGameState(userId: string, gameState: ApiUser['gameState']): Promise<void> {
    await this.request(`/users/${userId}/gamestate`, {
      method: 'PUT',
      body: JSON.stringify(gameState),
    });
  }

  async addTransaction(userId: string, transaction: Omit<ApiUser['transactions'][0], 'id' | 'timestamp'>): Promise<void> {
    await this.request(`/users/${userId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async updateLeaderboard(entry: { userId: string; username: string; telegramId?: string; telegramUsername?: string; telegramFirstName?: string; telegramLastName?: string; tokens: number; }): Promise<void> {
    console.log(`🏆 API: Обновление лидерборда для ${entry.userId}`);
    await this.request('/leaderboard', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }

  // Новый метод: Инициализация пользователя
  async initializeUser(userId: string, data: {
    profile?: any;
    gameState?: any;
    telegramData?: any;
  }): Promise<{ user: any; isNewUser: boolean }> {
    console.log(`🆕 API: Инициализация пользователя ${userId}`);
    try {
      const result = await this.request<{ user: any; isNewUser: boolean }>(`/users/${userId}/initialize`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log(`✅ API: Пользователь ${userId} ${result.isNewUser ? 'создан' : 'обновлен'}`);
      return result;
    } catch (error) {
      console.error('❌ API: Ошибка инициализации пользователя:', error);
      throw error;
    }
  }

  async getLeaderboard(limit: number = 100): Promise<ApiLeaderboard[]> {
    console.log(`🔍 API: Запрос лидерборда с лимитом ${limit}`);
    try {
      const result = await this.request<ApiLeaderboard[]>(`/leaderboard?limit=${limit}`);
      console.log(`✅ API: Получен лидерборд:`, {
        count: result.length,
        firstUser: result[0] ? {
          username: result[0].username,
          tokens: result[0].tokens,
          telegramFirstName: result[0].telegramFirstName
        } : null
      });
      return result;
    } catch (error) {
      console.error('❌ API: Ошибка загрузки лидерборда:', error);
      throw error;
    }
  }

  async getUserRank(userId: string): Promise<number | null> {
    try {
      const result = await this.request<{ rank: number }>(`/users/${userId}/rank`);
      return result.rank;
    } catch (error) {
      return null;
    }
  }

  async migrateUser(newUserId: string, oldUserId: string): Promise<{ migrated: boolean; tokens?: number }> {
    console.log(`🔄 API: Миграция пользователя ${oldUserId} -> ${newUserId}`);
    return this.request(`/users/${newUserId}/migrate`, {
      method: 'POST',
      body: JSON.stringify({ oldUserId })
    });
  }
}

export const apiService = new ApiService(); 