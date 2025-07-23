const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const cacheService = require('../services/cacheService');

class RateLimiterMiddleware {
  constructor() {
    this.limiters = {};
    this.isRedisAvailable = false;
  }

  async initialize() {
    try {
      // Проверяем доступность Redis для rate limiting
      this.isRedisAvailable = cacheService.isConnected;
      console.log(`🛡️ Rate Limiter инициализирован (Redis: ${this.isRedisAvailable ? 'включен' : 'отключен'})`);
    } catch (error) {
      console.warn('⚠️ Rate Limiter работает без Redis:', error.message);
      this.isRedisAvailable = false;
    }
  }

  // Универсальный создатель лимитера
  createLimiter(name, options) {
    const {
      windowMs,
      max,
      message,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = null
    } = options;

    const limiterConfig = {
      windowMs,
      max,
      message: { 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests,
      skipFailedRequests,
      handler: (req, res) => {
        console.warn(`🚫 Rate limit exceeded for ${req.ip} on ${req.path}`);
        res.status(429).json({
          error: message,
          retryAfter: Math.ceil(windowMs / 1000),
          limit: max,
          remaining: 0
        });
      }
    };

    // Если Redis доступен, используем RedisStore
    if (this.isRedisAvailable && cacheService.redis) {
      limiterConfig.store = new RedisStore({
        sendCommand: (...args) => cacheService.redis.sendCommand(args),
        prefix: `rl:${name}:`
      });
    }

    // Кастомный ключ-генератор
    if (keyGenerator) {
      limiterConfig.keyGenerator = keyGenerator;
    }

    this.limiters[name] = rateLimit(limiterConfig);
    return this.limiters[name];
  }

  // Лимитер для игровых действий (активная игра)
  getGameplayLimiter() {
    if (!this.limiters.gameplay) {
      this.limiters.gameplay = this.createLimiter('gameplay', {
        windowMs: 60 * 1000,    // 1 минута
        max: 1000,              // 1000 запросов в минуту
        message: 'Слишком много игровых действий, попробуйте через минуту',
        skipSuccessfulRequests: false,
        keyGenerator: (req) => {
          // Лимит по пользователю, не по IP
          return req.headers['x-telegram-user-id'] || req.ip;
        }
      });
    }
    return this.limiters.gameplay;
  }

  // Лимитер для выводов (строгий)
  getWithdrawalLimiter() {
    if (!this.limiters.withdrawal) {
      this.limiters.withdrawal = this.createLimiter('withdrawal', {
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 3,                   // 3 запроса на вывод
        message: 'Слишком много запросов на вывод, попробуйте через 15 минут',
        skipFailedRequests: true, // Не считаем неудачные попытки
        keyGenerator: (req) => {
          return req.headers['x-telegram-user-id'] || req.ip;
        }
      });
    }
    return this.limiters.withdrawal;
  }

  // Лимитер для депозитов
  getDepositLimiter() {
    if (!this.limiters.deposit) {
      this.limiters.deposit = this.createLimiter('deposit', {
        windowMs: 5 * 60 * 1000,  // 5 минут
        max: 10,                  // 10 депозитов в 5 минут
        message: 'Слишком много запросов депозитов, попробуйте через 5 минут',
        keyGenerator: (req) => {
          return req.headers['x-telegram-user-id'] || req.ip;
        }
      });
    }
    return this.limiters.deposit;
  }

  // Лимитер для API запросов (общий)
  getApiLimiter() {
    if (!this.limiters.api) {
      this.limiters.api = this.createLimiter('api', {
        windowMs: 60 * 1000,      // 1 минута
        max: 100,                 // 100 запросов в минуту
        message: 'Слишком много API запросов, попробуйте через минуту',
        keyGenerator: (req) => {
          return req.headers['x-telegram-user-id'] || req.ip;
        }
      });
    }
    return this.limiters.api;
  }

  // Лимитер для лидерборда (частые запросы)
  getLeaderboardLimiter() {
    if (!this.limiters.leaderboard) {
      this.limiters.leaderboard = this.createLimiter('leaderboard', {
        windowMs: 60 * 1000,      // 1 минута
        max: 30,                  // 30 запросов лидерборда в минуту
        message: 'Слишком много запросов лидерборда, попробуйте через минуту',
        keyGenerator: (req) => {
          return req.headers['x-telegram-user-id'] || req.ip;
        }
      });
    }
    return this.limiters.leaderboard;
  }

  // Лимитер для аутентификации
  getAuthLimiter() {
    if (!this.limiters.auth) {
      this.limiters.auth = this.createLimiter('auth', {
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 10,                  // 10 попыток авторизации
        message: 'Слишком много попыток авторизации, попробуйте через 15 минут',
        skipSuccessfulRequests: true, // Успешные авторизации не считаем
        keyGenerator: (req) => {
          return req.ip; // Лимит по IP для безопасности
        }
      });
    }
    return this.limiters.auth;
  }

  // Динамический лимитер на основе типа запроса
  getDynamicLimiter() {
    return (req, res, next) => {
      const path = req.path;
      
      // Выбираем подходящий лимитер
      if (path.includes('/withdraw')) {
        return this.getWithdrawalLimiter()(req, res, next);
      } else if (path.includes('/deposit')) {
        return this.getDepositLimiter()(req, res, next);
      } else if (path.includes('/leaderboard')) {
        return this.getLeaderboardLimiter()(req, res, next);
      } else if (path.includes('/auth') || path.includes('/login')) {
        return this.getAuthLimiter()(req, res, next);
      } else if (path.includes('/game') || path.includes('/tap')) {
        return this.getGameplayLimiter()(req, res, next);
      } else {
        return this.getApiLimiter()(req, res, next);
      }
    };
  }

  // Middleware для логирования превышений лимитов
  getLoggingMiddleware() {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        if (res.statusCode === 429) {
          console.warn(`🚫 Rate limit exceeded:`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            userId: req.headers['x-telegram-user-id'],
            timestamp: new Date().toISOString()
          });
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }

  // Middleware для доверенных IP (например, для мониторинга)
  getTrustedIpSkip() {
    const trustedIps = [
      '127.0.0.1',
      '::1',
      // Добавить IP мониторинга если нужно
    ];

    return (req) => {
      return trustedIps.includes(req.ip) || 
             req.path === '/health' || 
             req.path === '/status';
    };
  }

  // Статистика лимитеров
  async getStats() {
    const stats = {};
    
    try {
      if (this.isRedisAvailable && cacheService.redis) {
        // Получаем статистику из Redis
        const keys = await cacheService.redis.keys('rl:*');
        
        for (const limiterName of Object.keys(this.limiters)) {
          const limiterKeys = keys.filter(key => key.startsWith(`rl:${limiterName}:`));
          stats[limiterName] = {
            activeKeys: limiterKeys.length,
            type: 'redis'
          };
        }
      } else {
        // Локальная статистика
        for (const limiterName of Object.keys(this.limiters)) {
          stats[limiterName] = {
            type: 'memory',
            note: 'Статистика недоступна для memory store'
          };
        }
      }
      
      return {
        redisAvailable: this.isRedisAvailable,
        totalLimiters: Object.keys(this.limiters).length,
        limiters: stats
      };
    } catch (error) {
      console.error('Error getting rate limiter stats:', error);
      return { error: error.message };
    }
  }

  // Очистка всех лимитов (для тестирования)
  async clearAllLimits() {
    if (!this.isRedisAvailable) {
      console.warn('⚠️ Очистка лимитов доступна только с Redis');
      return false;
    }

    try {
      const keys = await cacheService.redis.keys('rl:*');
      if (keys.length > 0) {
        await cacheService.redis.del(keys);
        console.log(`🧹 Очищено ${keys.length} rate limit ключей`);
      }
      return true;
    } catch (error) {
      console.error('Error clearing rate limits:', error);
      return false;
    }
  }
}

// Singleton instance
const rateLimiterMiddleware = new RateLimiterMiddleware();

module.exports = rateLimiterMiddleware; 