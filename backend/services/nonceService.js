const redis = require('redis');
const config = require('../config/decimal');

class NonceService {
  constructor() {
    this.redis = null;
    this.localNonce = new Map(); // Локальный кеш nonce для каждого адреса
    this.nonceLock = new Map();  // Блокировки для предотвращения race conditions
    this.isConnected = false;
  }

  async initialize() {
    try {
      console.log('🔢 Инициализация Nonce Service...');
      
      // Инициализируем Redis если доступен
      try {
        const redisConfig = config.getRedisConfig();
        this.redis = redis.createClient(redisConfig);
        
        this.redis.on('error', (err) => {
          console.warn('⚠️ Redis ошибка в NonceService:', err.message);
          this.isConnected = false;
        });

        this.redis.on('connect', () => {
          this.isConnected = true;
        });

        await this.redis.connect();
        await this.redis.ping();
        
        console.log('✅ Nonce Service: Redis подключен');
      } catch (redisError) {
        console.warn('⚠️ Nonce Service работает без Redis:', redisError.message);
        this.isConnected = false;
      }

      console.log('✅ Nonce Service инициализирован');
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации Nonce Service:', error);
      return false;
    }
  }

  // Основной метод получения nonce с блокировками
  async getNonce(address, web3Instance) {
    const normalizedAddress = address.toLowerCase();
    
    // Проверяем блокировку для этого адреса
    while (this.nonceLock.get(normalizedAddress)) {
      await this.sleep(10); // Ждем 10мс
    }
    
    // Устанавливаем блокировку
    this.nonceLock.set(normalizedAddress, true);
    
    try {
      let nonce = await this.getNextNonce(normalizedAddress, web3Instance);
      
      // Обновляем все источники nonce
      await this.updateNonceSources(normalizedAddress, nonce);
      
      console.log(`🔢 Nonce для ${normalizedAddress}: ${nonce}`);
      return nonce;
      
    } finally {
      // Всегда освобождаем блокировку
      this.nonceLock.delete(normalizedAddress);
    }
  }

  // Получение следующего nonce с проверкой всех источников
  async getNextNonce(address, web3Instance) {
    const sources = await this.getAllNonceSources(address, web3Instance);
    
    // Выбираем максимальное значение из всех источников
    const maxNonce = Math.max(...Object.values(sources).filter(n => n !== null));
    const nextNonce = isNaN(maxNonce) ? 0 : maxNonce + 1;
    
    console.log(`🔍 Nonce источники для ${address}:`, {
      redis: sources.redis,
      local: sources.local,
      chain: sources.chain,
      selected: nextNonce
    });
    
    return nextNonce;
  }

  // Получение nonce из всех доступных источников
  async getAllNonceSources(address, web3Instance) {
    const sources = {
      redis: null,
      local: null,
      chain: null
    };

    // Из Redis
    try {
      if (this.isConnected && this.redis) {
        const redisNonce = await this.redis.get(`nonce:${address}`);
        sources.redis = redisNonce ? parseInt(redisNonce) : null;
      }
    } catch (error) {
      console.warn(`⚠️ Ошибка получения nonce из Redis для ${address}:`, error.message);
    }

    // Из локального кеша
    sources.local = this.localNonce.get(address) || null;

    // Из блокчейна
    try {
      if (web3Instance) {
        const chainNonce = await web3Instance.eth.getTransactionCount(address, 'pending');
        sources.chain = Number(chainNonce);
      }
    } catch (error) {
      console.warn(`⚠️ Ошибка получения nonce из блокчейна для ${address}:`, error.message);
    }

    return sources;
  }

  // Обновление nonce во всех источниках
  async updateNonceSources(address, nonce) {
    // Локальный кеш
    this.localNonce.set(address, nonce);

    // Redis с TTL 5 минут
    try {
      if (this.isConnected && this.redis) {
        await this.redis.setEx(`nonce:${address}`, 300, nonce.toString());
      }
    } catch (error) {
      console.warn(`⚠️ Не удалось обновить nonce в Redis для ${address}:`, error.message);
    }
  }

  // Обработка успешной транзакции
  async onTransactionSuccess(address, nonce) {
    const normalizedAddress = address.toLowerCase();
    
    try {
      // Обновляем nonce после успешной транзакции
      await this.updateNonceSources(normalizedAddress, nonce);
      
      console.log(`✅ Nonce обновлен после успешной транзакции ${normalizedAddress}: ${nonce}`);
    } catch (error) {
      console.error(`❌ Ошибка обновления nonce после транзакции:`, error);
    }
  }

  // Обработка неудачной транзакции
  async onTransactionFailure(address, failedNonce, reason) {
    const normalizedAddress = address.toLowerCase();
    
    try {
      console.warn(`⚠️ Транзакция неудачна для ${normalizedAddress}, nonce ${failedNonce}: ${reason}`);
      
      // Если nonce слишком низкий, сбрасываем кеши
      if (reason && reason.includes('nonce too low')) {
        this.localNonce.delete(normalizedAddress);
        
        if (this.isConnected && this.redis) {
          await this.redis.del(`nonce:${normalizedAddress}`);
        }
        
        console.log(`🔄 Nonce кеши сброшены для ${normalizedAddress}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка обработки неудачной транзакции:`, error);
    }
  }

  // Сброс nonce для адреса (в случае проблем)
  async resetNonce(address) {
    const normalizedAddress = address.toLowerCase();
    
    try {
      // Очищаем все кеши
      this.localNonce.delete(normalizedAddress);
      
      if (this.isConnected && this.redis) {
        await this.redis.del(`nonce:${normalizedAddress}`);
      }
      
      console.log(`🔄 Nonce сброшен для адреса ${normalizedAddress}`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка сброса nonce для ${normalizedAddress}:`, error);
      return false;
    }
  }

  // Получение статистики
  getStats() {
    return {
      redisConnected: this.isConnected,
      localCacheSize: this.localNonce.size,
      activeLocks: this.nonceLock.size,
      addresses: Array.from(this.localNonce.keys())
    };
  }

  // Очистка всех данных
  async cleanup() {
    try {
      this.localNonce.clear();
      this.nonceLock.clear();
      
      if (this.redis && this.isConnected) {
        await this.redis.disconnect();
      }
      
      console.log('🧹 Nonce Service очищен');
    } catch (error) {
      console.error('Ошибка очистки Nonce Service:', error);
    }
  }

  // Вспомогательные методы
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Batch операции для множественных nonce
  async reserveNonces(address, count, web3Instance) {
    const normalizedAddress = address.toLowerCase();
    const nonces = [];
    
    // Резервируем блок nonce для batch операций
    while (this.nonceLock.get(normalizedAddress)) {
      await this.sleep(10);
    }
    
    this.nonceLock.set(normalizedAddress, true);
    
    try {
      const startNonce = await this.getNextNonce(normalizedAddress, web3Instance);
      
      for (let i = 0; i < count; i++) {
        nonces.push(startNonce + i);
      }
      
      // Обновляем nonce до последнего зарезервированного
      await this.updateNonceSources(normalizedAddress, startNonce + count - 1);
      
      console.log(`🔢 Зарезервировано ${count} nonce для ${normalizedAddress}: ${startNonce}-${startNonce + count - 1}`);
      
      return nonces;
    } finally {
      this.nonceLock.delete(normalizedAddress);
    }
  }
}

// Singleton instance
const nonceService = new NonceService();

module.exports = nonceService; 