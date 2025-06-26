import { Collection, Db, MongoClient } from 'mongodb';
import clientPromise from '../config/mongodb';
import { DbUser, DbLeaderboard } from '../types/db';

export class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private users: Collection<DbUser> | null = null;
  private leaderboard: Collection<DbLeaderboard> | null = null;

  async connect() {
    if (!this.client) {
      this.client = await clientPromise;
      this.db = this.client.db('tapdel');
      this.users = this.db.collection<DbUser>('users');
      this.leaderboard = this.db.collection<DbLeaderboard>('leaderboard');
      
      // Create indexes
      await this.users.createIndex({ userId: 1 }, { unique: true });
      await this.leaderboard.createIndex({ score: -1 });
      await this.leaderboard.createIndex({ userId: 1 }, { unique: true });
    }
  }

  async getUser(userId: string): Promise<DbUser | null> {
    await this.connect();
    return this.users!.findOne({ userId });
  }

  async updateUser(userId: string, data: Partial<DbUser>): Promise<void> {
    await this.connect();
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
  }

  async updateGameState(userId: string, gameState: DbUser['gameState']): Promise<void> {
    await this.connect();
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
  }

  async addTransaction(userId: string, transaction: DbUser['transactions'][0]): Promise<void> {
    await this.connect();
    await this.users!.updateOne(
      { userId },
      {
        $push: { transactions: transaction },
        $set: { updatedAt: new Date() }
      }
    );
  }

  async updateLeaderboard(entry: Omit<DbLeaderboard, '_id' | 'rank' | 'updatedAt'>): Promise<void> {
    await this.connect();
    
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
    
    for (let i = 0; i < users.length; i++) {
      await this.leaderboard!.updateOne(
        { _id: users[i]._id },
        { $set: { rank: i + 1 } }
      );
    }
  }

  async getLeaderboard(limit: number = 100): Promise<DbLeaderboard[]> {
    await this.connect();
    return this.leaderboard!
      .find()
      .sort({ score: -1 })
      .limit(limit)
      .toArray();
  }

  async getUserRank(userId: string): Promise<number | null> {
    await this.connect();
    const user = await this.leaderboard!.findOne({ userId });
    return user?.rank || null;
  }
} 