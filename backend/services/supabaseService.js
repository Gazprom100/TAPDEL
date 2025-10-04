const fetch = require('node-fetch');
const supabaseConfig = require('../config/supabase');

class SupabaseService {
  constructor() {
    this.config = supabaseConfig;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (!this.config.isConfigured()) {
        throw new Error('Supabase конфигурация неполная');
      }

      console.log('🔗 Проверяем подключение к Supabase...');
      const isConnected = await this.config.testConnection();
      
      if (!isConnected) {
        throw new Error('Не удалось подключиться к Supabase');
      }

      console.log('✅ Supabase подключен успешно');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации Supabase:', error);
      throw error;
    }
  }

  // Базовый метод для выполнения запросов
  async request(endpoint, options = {}) {
    const url = `${this.config.getApiUrl()}/rest/v1${endpoint}`;
    const headers = this.config.getHeaders(options.useServiceKey);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // === РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ===

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
      useServiceKey: true
    });
  }

  async getUser(userId) {
    const response = await this.request(`/users?userId=eq.${userId}&select=*`, {
      method: 'GET'
    });
    return response[0] || null;
  }

  async updateUser(userId, userData) {
    return this.request(`/users?userId=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
      useServiceKey: true
    });
  }

  async deleteUser(userId) {
    return this.request(`/users?userId=eq.${userId}`, {
      method: 'DELETE',
      useServiceKey: true
    });
  }

  async getAllUsers(limit = 100, offset = 0) {
    return this.request(`/users?select=*&limit=${limit}&offset=${offset}&order=createdAt.desc`, {
      method: 'GET'
    });
  }

  // === РАБОТА С ЛИДЕРБОРДОМ ===

  async createLeaderboardEntry(entryData) {
    return this.request('/leaderboard', {
      method: 'POST',
      body: JSON.stringify(entryData),
      useServiceKey: true
    });
  }

  async getLeaderboard(limit = 100, offset = 0) {
    return this.request(`/leaderboard?select=*&limit=${limit}&offset=${offset}&order=tokens.desc`, {
      method: 'GET'
    });
  }

  async updateLeaderboardEntry(userId, entryData) {
    return this.request(`/leaderboard?userId=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(entryData),
      useServiceKey: true
    });
  }

  async deleteLeaderboardEntry(userId) {
    return this.request(`/leaderboard?userId=eq.${userId}`, {
      method: 'DELETE',
      useServiceKey: true
    });
  }

  // === РАБОТА С ДЕПОЗИТАМИ ===

  async createDeposit(depositData) {
    return this.request('/deposits', {
      method: 'POST',
      body: JSON.stringify(depositData),
      useServiceKey: true
    });
  }

  async getDeposits(userId = null, limit = 100, offset = 0) {
    const filter = userId ? `userId=eq.${userId}&` : '';
    return this.request(`/deposits?${filter}select=*&limit=${limit}&offset=${offset}&order=createdAt.desc`, {
      method: 'GET'
    });
  }

  async updateDeposit(depositId, depositData) {
    return this.request(`/deposits?id=eq.${depositId}`, {
      method: 'PATCH',
      body: JSON.stringify(depositData),
      useServiceKey: true
    });
  }

  // === РАБОТА С ВЫВОДАМИ ===

  async createWithdrawal(withdrawalData) {
    return this.request('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
      useServiceKey: true
    });
  }

  async getWithdrawals(userId = null, limit = 100, offset = 0) {
    const filter = userId ? `userId=eq.${userId}&` : '';
    return this.request(`/withdrawals?${filter}select=*&limit=${limit}&offset=${offset}&order=createdAt.desc`, {
      method: 'GET'
    });
  }

  async updateWithdrawal(withdrawalId, withdrawalData) {
    return this.request(`/withdrawals?id=eq.${withdrawalId}`, {
      method: 'PATCH',
      body: JSON.stringify(withdrawalData),
      useServiceKey: true
    });
  }

  // === РАБОТА С НАСТРОЙКАМИ ===

  async getAdminSettings() {
    const response = await this.request('/admin_settings?select=*', {
      method: 'GET'
    });
    return response[0] || null;
  }

  async updateAdminSettings(settingsData) {
    return this.request('/admin_settings', {
      method: 'POST',
      body: JSON.stringify(settingsData),
      useServiceKey: true
    });
  }

  // === РАБОТА С ТОКЕНАМИ ===

  async getTokenConfig() {
    const response = await this.request('/system_config?key=eq.tokens&select=*', {
      method: 'GET'
    });
    return response[0] || null;
  }

  async updateTokenConfig(tokenData) {
    return this.request('/system_config', {
      method: 'POST',
      body: JSON.stringify({
        key: 'tokens',
        value: tokenData,
        updatedAt: new Date().toISOString()
      }),
      useServiceKey: true
    });
  }

  // === СТАТИСТИКА ===

  async getStatistics() {
    const [users, leaderboard, deposits, withdrawals] = await Promise.all([
      this.request('/users?select=count', { method: 'GET' }),
      this.request('/leaderboard?select=count', { method: 'GET' }),
      this.request('/deposits?select=count', { method: 'GET' }),
      this.request('/withdrawals?select=count', { method: 'GET' })
    ]);

    return {
      totalUsers: users[0]?.count || 0,
      totalLeaderboard: leaderboard[0]?.count || 0,
      totalDeposits: deposits[0]?.count || 0,
      totalWithdrawals: withdrawals[0]?.count || 0
    };
  }

  // === МИГРАЦИЯ ДАННЫХ ===

  async migrateFromMongoDB(mongoData) {
    console.log('🔄 Начинаем миграцию данных из MongoDB в Supabase...');
    
    try {
      // Миграция пользователей
      if (mongoData.users && mongoData.users.length > 0) {
        console.log(`📦 Мигрируем ${mongoData.users.length} пользователей...`);
        for (const user of mongoData.users) {
          await this.createUser(user);
        }
        console.log('✅ Пользователи мигрированы');
      }

      // Миграция лидерборда
      if (mongoData.leaderboard && mongoData.leaderboard.length > 0) {
        console.log(`📦 Мигрируем ${mongoData.leaderboard.length} записей лидерборда...`);
        for (const entry of mongoData.leaderboard) {
          await this.createLeaderboardEntry(entry);
        }
        console.log('✅ Лидерборд мигрирован');
      }

      // Миграция депозитов
      if (mongoData.deposits && mongoData.deposits.length > 0) {
        console.log(`📦 Мигрируем ${mongoData.deposits.length} депозитов...`);
        for (const deposit of mongoData.deposits) {
          await this.createDeposit(deposit);
        }
        console.log('✅ Депозиты мигрированы');
      }

      // Миграция выводов
      if (mongoData.withdrawals && mongoData.withdrawals.length > 0) {
        console.log(`📦 Мигрируем ${mongoData.withdrawals.length} выводов...`);
        for (const withdrawal of mongoData.withdrawals) {
          await this.createWithdrawal(withdrawal);
        }
        console.log('✅ Выводы мигрированы');
      }

      console.log('🎉 Миграция данных завершена успешно!');
      return true;
    } catch (error) {
      console.error('❌ Ошибка миграции данных:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
