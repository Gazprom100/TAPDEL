import { ObjectId } from 'mongodb';
import { UserProfile, Transaction } from './index';

export interface DbUser {
  _id: ObjectId;
  userId: string;
  profile: UserProfile;
  gameState: {
    tokens: number;
    highScore: number;
    engineLevel: string;
    gearboxLevel: string;
    batteryLevel: string;
    hyperdriveLevel: string;
    powerGridLevel: string;
    lastSaved: Date;
  };
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DbLeaderboard {
  _id: ObjectId;
  userId: string;
  username: string;
  score: number;
  rank: number;
  updatedAt: Date;
} 