const redis = require('redis');
const config = require('../config/decimal');
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
      
      const redisConfig = config.getRedisConfig();
      this.redis = redis.createClient(redisConfig);
      
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
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
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
      console.error(`Cache get error for key ${key}:`, error);
      this.cacheStats.errors++;
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Сохраняем в Redis
      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttl, serialized);
      
      // Сохраняем в локальный кеш
      this.localCache.set(key, value);
      setTimeout(() => this.localCache.delete(key), Math.min(ttl * 1000, 30000));
      
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.cacheStats.errors++;
      return false;
    }
  }

  async del(key) {
    try {
      this.localCache.delete(key);
      
      if (this.isConnected) {
        await this.redis.del(key);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.cacheStats.errors++;
      return false;
    }
  }

  // Специализированные методы кеширования

  // Кеш лидерборда (критично для производительности)
  async getLeaderboard(page = 1, limit = 50) {
    const cacheKey = `leaderboard:page:${page}:limit:${limit}`;
    
    let cached = await this.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Получаем из базы данных
      const data = await databaseConfig.getLeaderboard(page, limit);
      
      // Кешируем на 5 минут
      await this.set(cacheKey, data, 300);
      
      return data;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Кеш топ-100 лидерборда (самый частый запрос)
  async getTopLeaderboard() {
    const cacheKey = 'leaderboard:top100';
    
    let cached = await this.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await databaseConfig.getLeaderboard(1, 100);
      
      // Кешируем на 5 минут
      await this.set(cacheKey, data, 300);
      
      return data;
    } catch (error) {
      console.error('Error getting top leaderboard:', error);
      return [];
    }
  }

  // Кеш профилей пользователей (10 минут)
  async getUserProfile(userId) {
    const cacheKey = `user:profile:${userId}`;
    
    let cached = await this.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const user = await databaseConfig.getUserProfile(userId);
      
      if (user) {
        // Кешируем на 10 минут
        await this.set(cacheKey, user, 600);
      }
      
      return user;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Кеш игрового состояния (краткосрочный)
  async getUserGameState(userId) {
    const cacheKey = `user:gamestate:${userId}`;
    
    let cached = await this.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const user = await databaseConfig.getCollection('users').findOne(
        { userId },
        { projection: { gameState: 1, _id: 0 } }
      );
      
      if (user && user.gameState) {
        // Кешируем на 2 минуты
        await this.set(cacheKey, user.gameState, 120);
        return user.gameState;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user game state:', error);
      return null;
    }
  }

  // Инвалидация кеша пользователя при обновлении
  async invalidateUser(userId) {
    const keys = [
      `user:profile:${userId}`,
      `user:gamestate:${userId}`
    ];
    
    for (const key of keys) {
      await this.del(key);
    }
  }

  // Инвалидация кеша лидерборда
  async invalidateLeaderboard() {
    try {
      if (!this.isConnected) return;
      
      // Используем паттерн для удаления всех ключей лидерборда
      const keys = await this.redis.keys('leaderboard:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
      
      console.log(`🗑️ Инвалидирован кеш лидерборда (${keys.length} ключей)`);
    } catch (error) {
      console.error('Error invalidating leaderboard cache:', error);
    }
  }

  // Batch операции для оптимизации
  async mget(keys) {
    try {
      if (!this.isConnected || keys.length === 0) {
        return [];
      }

      const results = await this.redis.mGet(keys);
      return results.map(result => {
        try {
          return result ? JSON.parse(result) : null;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs, ttl = 300) {
    try {
      if (!this.isConnected || keyValuePairs.length === 0) {
        return false;
      }

      const pipeline = this.redis.multi();
      
      for (const [key, value] of keyValuePairs) {
        pipeline.setEx(key, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Статистика кеша
  getStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? (this.cacheStats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      connected: this.isConnected,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      errors: this.cacheStats.errors,
      hitRate: `${hitRate}%`,
      localCacheSize: this.localCache.size
    };
  }

  // Очистка локального кеша
  clearLocalCache() {
    this.localCache.clear();
    console.log('🧹 Локальный кеш очищен');
  }

  // Предварительная загрузка критических данных
  async preloadCriticalData() {
    try {
      console.log('🚀 Предварительная загрузка критических данных...');
      
      // Загружаем топ-100 лидерборда
      await this.getTopLeaderboard();
      
      // Загружаем первые страницы лидерборда
      for (let page = 1; page <= 5; page++) {
        await this.getLeaderboard(page, 50);
      }
      
      console.log('✅ Критические данные предварительно загружены');
    } catch (error) {
      console.error('Ошибка предварительной загрузки:', error);
    }
  }

  async disconnect() {
    try {
      this.clearLocalCache();
      
      if (this.redis && this.isConnected) {
        await this.redis.disconnect();
      }
      
      this.isConnected = false;
      console.log('📊 Cache Service отключен');
    } catch (error) {
      console.error('Ошибка отключения Cache Service:', error);
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 