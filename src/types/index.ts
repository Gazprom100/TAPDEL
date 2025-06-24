export type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  experience: number;
  maxGear: Gear;
  maxEnergy: number;
  energyRecoveryRate: number;
  balance: {
    tokens: number;
    credits: number; // Реальная валюта или крипта
  };
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  level: number;
  tokens: number;
  maxGear: Gear;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'gear' | 'energy' | 'boost';
  value: number | Gear;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'purchase';
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
} 