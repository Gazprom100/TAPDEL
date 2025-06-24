import { create } from 'zustand'
import { sendAchievementNotification, sendNewRecordNotification } from '../utils/telegram'

interface GameState {
  energy: number
  maxEnergy: number
  tokens: number
  energyRegenRate: number
  tokenMultiplier: number
  highScore: number
  telegramChatId: number | null
  setTelegramChatId: (chatId: number) => void
  addTokens: (amount: number) => void
  useEnergy: () => void
  regenEnergy: () => void
  upgradeEnergyRegen: () => void
  upgradeMaxEnergy: () => void
  upgradeTokenMultiplier: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  energy: 100,
  maxEnergy: 100,
  tokens: 0,
  energyRegenRate: 1,
  tokenMultiplier: 1,
  highScore: 0,
  telegramChatId: null,

  setTelegramChatId: (chatId) => set({ telegramChatId: chatId }),

  addTokens: (amount) => set((state) => {
    const newTokens = state.tokens + (amount * state.tokenMultiplier);
    
    // Проверяем новый рекорд
    if (newTokens > state.highScore) {
      set({ highScore: newTokens });
      if (state.telegramChatId) {
        sendNewRecordNotification(state.telegramChatId, newTokens);
      }
    }

    // Проверяем достижения
    if (newTokens >= 1000 && state.tokens < 1000) {
      if (state.telegramChatId) {
        sendAchievementNotification(state.telegramChatId, "Первая тысяча!");
      }
    }

    return { tokens: newTokens };
  }),

  useEnergy: () => set((state) => ({ 
    energy: Math.max(0, state.energy - 10) 
  })),

  regenEnergy: () => set((state) => ({ 
    energy: Math.min(state.maxEnergy, state.energy + state.energyRegenRate) 
  })),

  upgradeEnergyRegen: () => set((state) => {
    const newRate = state.energyRegenRate * 1.2;
    if (state.telegramChatId) {
      sendAchievementNotification(
        state.telegramChatId,
        `Улучшена регенерация энергии (${newRate.toFixed(1)})`
      );
    }
    return { energyRegenRate: newRate };
  }),

  upgradeMaxEnergy: () => set((state) => {
    const newMax = state.maxEnergy * 1.5;
    if (state.telegramChatId) {
      sendAchievementNotification(
        state.telegramChatId,
        `Увеличен максимум энергии (${newMax})`
      );
    }
    return { 
      maxEnergy: newMax,
      energy: newMax 
    };
  }),

  upgradeTokenMultiplier: () => set((state) => {
    const newMultiplier = state.tokenMultiplier * 1.5;
    if (state.telegramChatId) {
      sendAchievementNotification(
        state.telegramChatId,
        `Улучшен множитель токенов (x${newMultiplier.toFixed(1)})`
      );
    }
    return { tokenMultiplier: newMultiplier };
  }),
})); 