const redis = require('redis');
const config = require('../config/decimal');
const redisConfig = require('../config/redis');
const databaseConfig = require('../config/database');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.localCache = new Map(); // Локальный кеш для критических данных
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0
    };
  }

  async initialize() {
    try {
      console.log('🔄 Инициализация Redis кеша...');
      
      // Проверяем конфигурацию Redis
      if (!redisConfig.isConfigured()) {
        console.log('⚠️ REDIS_URL не установлен, работаем только с локальным кешем');
        this.isConnected = false;
        return true;
      }

      console.log(`🔧 Redis провайдер: ${redisConfig.getProviderType()}`);
      
      const redisClientConfig = redisConfig.getRedisConfig();
      this.redis = redis.createClient(redisClientConfig);
      
      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis ошибка (продолжаем без кеша):', err.message);
        this.cacheStats.errors++;
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis подключен');
        this.isConnected = true;
      });

      this.redis.on('disconnect', () => {
        console.log('⚠️ Redis отключен');
        this.isConnected = false;
      });

      // Пытаемся подключиться с timeout
      const connectPromise = this.redis.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Тестовая операция
      await this.redis.ping();
      
      console.log('✅ Cache Service инициализирован с Redis');
      return true;
    } catch (error) {
      console.warn('⚠️ Cache Service работает без Redis:', error.message);
      this.isConnected = false;
      
      // Очищаем Redis клиент при ошибке
      if (this.redis) {
        try {
          await this.redis.disconnect();
        } catch {
          // Игнорируем ошибки отключения
        }
        this.redis = null;
      }
      
      console.log('✅ Cache Service инициализирован (только локальный кеш)');
      return true; // Возвращаем true, так как локальный кеш работает
    }
  }

  // Универсальный метод для кеширования
  async get(key) {
    try {
      // Сначала проверяем локальный кеш
      if (this.localCache.has(key)) {
        this.cacheStats.hits++;
        return this.localCache.get(key);
      }

      if (!this.isConnected) {
        this.cacheStats.misses++;
        return null;
      }

      const cached = await this.redis.get(key);
      if (cached) {
        this.cacheStats.hits++;
        const data = JSON.parse(cached);
        
        // Добавляем в локальный кеш на 30 секунд
        this.localCache.set(key, data);
        setTimeout(() => this.localCache.delete(key), 30000);
        
        return data;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      console.warn('⚠️ Ошибка получения из кеша:', error.message);
      this.cacheStats.errors++;
      return null;
    }
  }

  // Универсальный метод для сохранения в кеш
  async set(key, value, ttl = 300) {
    try {
      // Всегда сохраняем в локальный кеш
      this.localCache.set(key, value);
      setTimeout(() => this.localCache.delete(key), ttl * 1000);
      
      if (!this.isConnected) {
        return true; // Возвращаем true для локального кеша
      }

      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.warn('⚠️ Ошибка сохранения в кеш:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  // Удаление из кеша
  async del(key) {
    try {
      // Удаляем из локального кеша
      this.localCache.delete(key);
      
      if (!this.isConnected) {
        return true;
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      console.warn('⚠️ Ошибка удаления из кеша:', error.message);
      this.cacheStats.errors++;
      return false;
    }
  }

  // Получение лидерборда с кешированием
  async getLeaderboard(page = 1, limit = 50) {
    const cacheKey = `leaderboard:${page}:${limit}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const database = await databaseConfig.connect();
      const users = await database.collection('users')
        .find({})
        .sort({ "gameState.tokens": -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const result = {
        users: users.map(user => ({
          userId: user.userId,
          username: user.username || user.telegramUsername || 'Unknown',
          tokens: user.gameState?.tokens || 0,
          rank: 0 // Будет вычислено на клиенте
        })),
        page,
        limit,
        timestamp: new Date()
      };

      // Кешируем на 30 секунд
      await this.set(cacheKey, result, 30);
      return result;
    } catch (error) {
      console.error('❌ Ошибка получения лидерборда:', error);
      return { users: [], page, limit, timestamp: new Date() };
    }
  }

  // Получение топ лидерборда (для быстрого доступа)
  async getTopLeaderboard() {
    const cacheKey = 'top_leaderboard';
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const database = await databaseConfig.connect();
      const topUsers = await database.collection('users')
        .find({})
        .sort({ "gameState.tokens": -1, updatedAt: -1 })
        .limit(10)
        .toArray();

      const result = topUsers.map((user, index) => ({
        rank: index + 1,
        userId: user.userId,
        username: user.username || user.telegramUsername || 'Unknown',
        tokens: user.gameState?.tokens || 0
      }));

      // Кешируем на 60 секунд
      await this.set(cacheKey, result, 60);
      return result;
    } catch (error) {
      console.error('❌ Ошибка получения топ лидерборда:', error);
      return [];
    }
  }

  // Получение профиля пользователя с кешированием
  async getUserProfile(userId) {
    const cacheKey = `user_profile:${userId}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const database = await databaseConfig.connect();
      const user = await database.collection('users').findOne({ userId });
      
      if (!user) {
        return null;
      }

      const result = {
        userId: user.userId,
        username: user.username || user.telegramUsername || 'Unknown',
        firstName: user.firstName,
        lastName: user.lastName,
        tokens: user.gameState?.tokens || 0,
        highScore: user.gameState?.highScore || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Кешируем на 5 минут
      await this.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('❌ Ошибка получения профиля пользователя:', error);
      return null;
    }
  }

  // Получение игрового состояния пользователя с кешированием
  async getUserGameState(userId) {
    const cacheKey = `game_state:${userId}`;
    const cached = await this.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const database = await databaseConfig.connect();
      const user = await database.collection('users').findOne({ userId });
      
      if (!user || !user.gameState) {
        return null;
      }

      // Кешируем на 1 минуту (игровое состояние часто меняется)
      await this.set(cacheKey, user.gameState, 60);
      return user.gameState;
    } catch (error) {
      console.error('❌ Ошибка получения игрового состояния:', error);
      return null;
    }
  }

  // Инвалидация кеша пользователя
  async invalidateUser(userId) {
    try {
      const keys = [
        `user_profile:${userId}`,
        `game_state:${userId}`
      ];
      
      for (const key of keys) {
        await this.del(key);
      }
      
      console.log(`🗑️ Кеш пользователя ${userId} очищен`);
    } catch (error) {
      console.warn('⚠️ Ошибка очистки кеша пользователя:', error.message);
    }
  }

  // Инвалидация кеша лидерборда
  async invalidateLeaderboard() {
    try {
      // Очищаем все ключи лидерборда
      if (this.isConnected) {
        const keys = await this.redis.keys('leaderboard:*');
        const topKeys = await this.redis.keys('top_leaderboard*');
        
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
        if (topKeys.length > 0) {
          await this.redis.del(topKeys);
        }
      }
      
      // Очищаем локальный кеш лидерборда
      for (const key of this.localCache.keys()) {
        if (key.startsWith('leaderboard:') || key.startsWith('top_leaderboard')) {
          this.localCache.delete(key);
        }
      }
      
      console.log('🗑️ Кеш лидерборда очищен');
    } catch (error) {
      console.warn('⚠️ Ошибка очистки кеша лидерборда:', error.message);
    }
  }

  // Получение нескольких значений
  async mget(keys) {
    try {
      const results = {};
      
      // Сначала проверяем локальный кеш
      for (const key of keys) {
        if (this.localCache.has(key)) {
          results[key] = this.localCache.get(key);
        }
      }
      
      if (!this.isConnected) {
        return results;
      }

      // Получаем остальные из Redis
      const redisKeys = keys.filter(key => !results[key]);
      if (redisKeys.length > 0) {
        const redisResults = await this.redis.mGet(redisKeys);
        
        for (let i = 0; i < redisKeys.length; i++) {
          const key = redisKeys[i];
          const value = redisResults[i];
          
          if (value) {
            const parsed = JSON.parse(value);
            results[key] = parsed;
            
            // Добавляем в локальный кеш
            this.localCache.set(key, parsed);
            setTimeout(() => this.localCache.delete(key), 30000);
          }
        }
      }
      
      return results;
    } catch (error) {
      console.warn('⚠️ Ошибка получения множественных значений:', error.message);
      return {};
    }
  }

  // Сохранение нескольких значений
  async mset(keyValuePairs, ttl = 300) {
    try {
      // Сохраняем в локальный кеш
      for (const [key, value] of Object.entries(keyValuePairs)) {
        this.localCache.set(key, value);
        setTimeout(() => this.localCache.delete(key), ttl * 1000);
      }
      
      if (!this.isConnected) {
        return true;
      }

      // Сохраняем в Redis
      const pipeline = this.redis.multi();
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        pipeline.setEx(key, ttl, serialized);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.warn('⚠️ Ошибка сохранения множественных значений:', error.message);
      return false;
    }
  }

  // Получение статистики кеша
  getStats() {
    return {
      isConnected: this.isConnected,
      localCacheSize: this.localCache.size,
      stats: this.cacheStats,
      uptime: process.uptime()
    };
  }

  // Очистка локального кеша
  clearLocalCache() {
    this.localCache.clear();
    console.log('🗑️ Локальный кеш очищен');
  }

  // Предзагрузка критических данных
  async preloadCriticalData() {
    try {
      console.log('🔄 Предзагрузка критических данных...');
      
      // Загружаем топ лидерборд
      await this.getTopLeaderboard();
      
      console.log('✅ Критические данные предзагружены');
    } catch (error) {
      console.warn('⚠️ Ошибка предзагрузки данных:', error.message);
    }
  }

  // Отключение от Redis
  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.disconnect();
        this.redis = null;
      }
      this.isConnected = false;
      console.log('🔌 Cache Service отключен');
    } catch (error) {
      console.warn('⚠️ Ошибка отключения Cache Service:', error.message);
    }
  }
}

module.exports = new CacheService(); 