const Redis = require('redis');
const cacheService = require('./cacheService');

class AdvancedCacheService {
  constructor() {
    this.redis = null;
    this.localCache = new Map();
    this.localCacheMaxSize = 1000;
    this.isRedisAvailable = false;
    this.stats = {
      hits: 0,
      misses: 0,
      redisHits: 0,
      localHits: 0
    };
  }

  async initialize() {
    try {
      // Инициализируем Redis
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            tls: process.env.REDIS_URL.includes('rediss://'),
            rejectUnauthorized: false
          }
        });

        await this.redis.connect();
        this.isRedisAvailable = true;
        console.log('✅ AdvancedCacheService: Redis подключен');
      } else {
        console.log('⚠️ AdvancedCacheService: Redis недоступен, используем локальный кеш');
      }
    } catch (error) {
      console.warn('⚠️ AdvancedCacheService: Redis ошибка, используем локальный кеш:', error.message);
      this.isRedisAvailable = false;
    }
  }

  // Универсальный метод кеширования
  async cache(key, data, ttl = 300) {
    try {
      // Сохраняем в Redis если доступен
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        console.log(`💾 Кешировано в Redis: ${key} (TTL: ${ttl}s)`);
      }
      
      // Всегда сохраняем в локальный кеш
      this.setLocalCache(key, data, ttl * 1000);
      
      return true;
    } catch (error) {
      console.warn(`⚠️ Ошибка кеширования ${key}:`, error.message);
      return false;
    }
  }

  // Универсальный метод получения данных
  async get(key) {
    try {
      // Сначала проверяем локальный кеш
      const localData = this.getLocalCache(key);
      if (localData) {
        this.stats.localHits++;
        this.stats.hits++;
        return localData;
      }

      // Затем проверяем Redis
      if (this.isRedisAvailable && this.redis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const parsedData = JSON.parse(redisData);
          // Обновляем локальный кеш
          this.setLocalCache(key, parsedData, 60000); // 1 минута в локальном кеше
          this.stats.redisHits++;
          this.stats.hits++;
          return parsedData;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.warn(`⚠️ Ошибка получения кеша ${key}:`, error.message);
      return null;
    }
  }

  // Специализированные методы кеширования

  // Кеширование лидерборда
  async cacheLeaderboard(data, ttl = 300) {
    const key = 'leaderboard:top100';
    await this.cache(key, data, ttl);
    await this.cache('leaderboard:timestamp', Date.now(), ttl);
  }

  // Кеширование профиля пользователя
  async cacheUserProfile(userId, data, ttl = 600) {
    const key = `user:${userId}:profile`;
    await this.cache(key, data, ttl);
  }

  // Кеширование игрового состояния
  async cacheGameState(userId, data, ttl = 120) {
    const key = `user:${userId}:gamestate`;
    await this.cache(key, data, ttl);
  }

  // Кеширование баланса
  async cacheBalance(userId, data, ttl = 300) {
    const key = `user:${userId}:balance`;
    await this.cache(key, data, ttl);
  }

  // Кеширование транзакций
  async cacheTransactions(userId, data, ttl = 180) {
    const key = `user:${userId}:transactions`;
    await this.cache(key, data, ttl);
  }

  // Локальный кеш методы
  setLocalCache(key, value, ttl = 60000) {
    // Очищаем старые записи если достигли лимита
    if (this.localCache.size >= this.localCacheMaxSize) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }

    this.localCache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  getLocalCache(key) {
    const item = this.localCache.get(key);
    if (!item || Date.now() > item.expires) {
      this.localCache.delete(key);
      return null;
    }
    return item.value;
  }

  // Инвалидация кеша
  async invalidate(pattern) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          console.log(`🗑️ Инвалидирован Redis кеш: ${keys.length} ключей`);
        }
      }

      // Инвалидируем локальный кеш
      for (const key of this.localCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.localCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('⚠️ Ошибка инвалидации кеша:', error.message);
    }
  }

  // Получение статистики
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      localCacheSize: this.localCache.size,
      redisAvailable: this.isRedisAvailable
    };
  }

  // Очистка кеша
  async clearCache() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushall();
        console.log('🗑️ Redis кеш очищен');
      }
      
      this.localCache.clear();
      console.log('🗑️ Локальный кеш очищен');
      
      this.stats = { hits: 0, misses: 0, redisHits: 0, localHits: 0 };
    } catch (error) {
      console.warn('⚠️ Ошибка очистки кеша:', error.message);
    }
  }

  // Graceful shutdown
  async shutdown() {
    try {
      if (this.redis) {
        await this.redis.quit();
        console.log('🔌 AdvancedCacheService: Redis отключен');
      }
    } catch (error) {
      console.warn('⚠️ Ошибка отключения Redis:', error.message);
    }
  }
}

// Создаем singleton instance
const advancedCacheService = new AdvancedCacheService();

module.exports = advancedCacheService; 