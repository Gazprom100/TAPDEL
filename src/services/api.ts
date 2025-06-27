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
  score: number;
  rank: number;
  updatedAt: Date;
}

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getUser(userId: string): Promise<ApiUser | null> {
    try {
      return await this.request<ApiUser>(`/users/${userId}`);
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
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

  async updateLeaderboard(entry: Omit<ApiLeaderboard, '_id' | 'rank' | 'updatedAt'>): Promise<void> {
    await this.request('/leaderboard', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async getLeaderboard(limit: number = 100): Promise<ApiLeaderboard[]> {
    return await this.request<ApiLeaderboard[]>(`/leaderboard?limit=${limit}`);
  }

  async getUserRank(userId: string): Promise<number | null> {
    try {
      const result = await this.request<{ rank: number }>(`/users/${userId}/rank`);
      return result.rank;
    } catch (error) {
      return null;
    }
  }
}

export const apiService = new ApiService(); 