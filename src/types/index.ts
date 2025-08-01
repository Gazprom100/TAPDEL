export type Gear = 'N' | '1' | '2' | '3' | '4' | 'M';

export interface UserProfile {
  userId: string;
  username: string;
  maxEnergy: number;
  energyRecoveryRate: number;
  maxGear: Gear;
  level: number;
  experience: number;
  createdAt: Date;
  lastLogin: Date;
  // Telegram данные
  telegramId?: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  level: number;
  score: number;
  tokens: number;
  maxGear: Gear;
  rank: number;
  updatedAt: Date;
  // Telegram данные
  telegramId?: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
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
  type: 'purchase' | 'withdraw' | 'deposit';
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  itemInfo?: {
    type: 'engine' | 'gearbox' | 'battery' | 'hyperdrive' | 'powerGrid';
    level: string;
  };
}

// Telegram WebApp типы

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  ready: () => void;
  requestFullscreen?: () => Promise<void> | void;
  exitFullscreen?: () => void;
  expand?: () => void;
  close?: () => void;
  isExpanded?: boolean;
  platform?: string;
  version?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  safeAreaInset?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
  };
} 