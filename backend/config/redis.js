require('dotenv').config();

class RedisConfig {
  constructor() {
    this.redisUrl = process.env.REDIS_URL;
    this.isUpstash = this.redisUrl && this.redisUrl.includes('upstash.io');
    this.isVercelRedis = this.redisUrl && this.redisUrl.includes('vercel-storage.com');
    this.isSupabaseRedis = this.redisUrl && this.redisUrl.includes('supabase');
  }

  // Проверка готовности конфигурации
  isConfigured() {
    return !!this.redisUrl;
  }

  // Получение конфигурации Redis
  getRedisConfig() {
    if (!this.redisUrl) {
      throw new Error('REDIS_URL не установлен');
    }

    console.log(`🔧 Redis конфигурация: ${this.redisUrl}`);
    console.log(`   Upstash: ${this.isUpstash}`);
    console.log(`   Vercel Redis: ${this.isVercelRedis}`);
    console.log(`   Supabase Redis: ${this.isSupabaseRedis}`);

    // Для Vercel Redis (KV Storage)
    if (this.isVercelRedis) {
      return {
        url: this.redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false,
          connectTimeout: 10000,
          commandTimeout: 5000
        },
        connectTimeout: 10000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        maxLoadingTimeout: 30000
      };
    }

    // Для Supabase Redis
    if (this.isSupabaseRedis) {
      return {
        url: this.redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false,
          connectTimeout: 10000,
          commandTimeout: 5000
        },
        connectTimeout: 10000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        maxLoadingTimeout: 30000
      };
    }

    // Для Upstash Redis
    if (this.isUpstash) {
      return {
        url: this.redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false,
          connectTimeout: 10000,
          commandTimeout: 5000
        },
        connectTimeout: 10000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        maxLoadingTimeout: 30000
      };
    }

    // Для обычного Redis
    return {
      url: this.redisUrl,
      socket: {
        connectTimeout: 10000,
        tls: false
      },
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    };
  }

  // Получение типа Redis провайдера
  getProviderType() {
    if (this.isVercelRedis) return 'vercel';
    if (this.isSupabaseRedis) return 'supabase';
    if (this.isUpstash) return 'upstash';
    return 'standard';
  }
}

module.exports = new RedisConfig();
