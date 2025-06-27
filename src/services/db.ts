import { Collection, Db, MongoClient } from 'mongodb';
import clientPromise from '../config/mongodb';
import { DbUser, DbLeaderboard } from '../types/db';
import { MONGODB_DB } from '../config/mongodb';

export class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private users: Collection<DbUser> | null = null;
  private leaderboard: Collection<DbLeaderboard> | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private async retry<T>(operation: () => Promise<T>, retries = this.MAX_RETRIES): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Operation failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.retry(operation, retries - 1);
      }
      throw error;
    }
  }

  async connect() {
    if (!this.client) {
      try {
        this.client = await clientPromise;
        this.db = this.client.db(MONGODB_DB);
        this.users = this.db.collection<DbUser>('users');
        this.leaderboard = this.db.collection<DbLeaderboard>('leaderboard');
        
        // Create indexes
        await Promise.all([
          this.users.createIndex({ userId: 1 }, { unique: true }),
          this.leaderboard.createIndex({ score: -1 }),
          this.leaderboard.createIndex({ userId: 1 }, { unique: true })
        ]);
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw new Error('Database connection failed');
      }
    }
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getUser(userId: string): Promise<DbUser | null> {
    const cacheKey = `user:${userId}`;
    const cached = this.getCached<DbUser>(cacheKey);
    if (cached) return cached;

    await this.connect();
    return this.retry(async () => {
      const user = await this.users!.findOne({ userId });
      if (user) this.setCache(cacheKey, user);
      return user;
    });
  }

  async updateUser(userId: string, data: Partial<DbUser>): Promise<void> {
    await this.connect();
    await this.retry(async () => {
      await this.users!.updateOne(
        { userId },
        { 
          $set: { 
            ...data,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.cache.delete(`user:${userId}`);
    });
  }

  async updateGameState(userId: string, gameState: DbUser['gameState']): Promise<void> {
    await this.connect();
    await this.retry(async () => {
      await this.users!.updateOne(
        { userId },
        {
          $set: {
            'gameState': {
              ...gameState,
              lastSaved: new Date()
            },
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      this.cache.delete(`user:${userId}`);
    });
  }

  async addTransaction(userId: string, transaction: DbUser['transactions'][0]): Promise<void> {
    await this.connect();
    await this.retry(async () => {
      await this.users!.updateOne(
        { userId },
        {
          $push: { transactions: transaction },
          $set: { updatedAt: new Date() }
        }
      );
      this.cache.delete(`user:${userId}`);
    });
  }

  async updateLeaderboard(entry: Omit<DbLeaderboard, '_id' | 'rank' | 'updatedAt'>): Promise<void> {
    await this.connect();
    await this.retry(async () => {
      // Update user's score
      await this.leaderboard!.updateOne(
        { userId: entry.userId },
        {
          $set: {
            ...entry,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      // Update ranks for all users
      const users = await this.leaderboard!.find().sort({ score: -1 }).toArray();
      
      await Promise.all(users.map((user, index) => 
        this.leaderboard!.updateOne(
          { _id: user._id },
          { $set: { rank: index + 1 } }
        )
      ));

      this.cache.delete('leaderboard');
      this.cache.delete(`rank:${entry.userId}`);
    });
  }

  async getLeaderboard(limit: number = 100): Promise<DbLeaderboard[]> {
    const cacheKey = `leaderboard:${limit}`;
    const cached = this.getCached<DbLeaderboard[]>(cacheKey);
    if (cached) return cached;

    await this.connect();
    return this.retry(async () => {
      const leaderboard = await this.leaderboard!
        .find()
        .sort({ score: -1 })
        .limit(limit)
        .toArray();
      
      this.setCache(cacheKey, leaderboard);
      return leaderboard;
    });
  }

  async getUserRank(userId: string): Promise<number | null> {
    const cacheKey = `rank:${userId}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached !== null) return cached;

    await this.connect();
    return this.retry(async () => {
      const user = await this.leaderboard!.findOne({ userId });
      const rank = user?.rank || null;
      if (rank !== null) this.setCache(cacheKey, rank);
      return rank;
    });
  }

  // Метод для очистки кэша
  clearCache(): void {
    this.cache.clear();
  }

  // Метод для закрытия соединения
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.users = null;
      this.leaderboard = null;
      this.clearCache();
    }
  }
}

// Экспортируем единственный экземпляр сервиса
export default new DatabaseService(); 