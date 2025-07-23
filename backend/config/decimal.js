const crypto = require('crypto');

module.exports = {
  // DecimalChain API настройки
  API_BASE_URL: process.env.DECIMAL_API_BASE_URL || 'https://api.decimalchain.com/api/v1',
  RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  CHAIN_ID: parseInt(process.env.DECIMAL_CHAIN_ID || '75'),
  GAS_LIMIT: 21000,
  GAS_PRICE: parseInt(process.env.DECIMAL_GAS_PRICE_GWEI || '50000'), // Увеличено до 50,000 gwei
  
  // Рабочий кошелек
  WORKING_ADDRESS: process.env.DECIMAL_WORKING_ADDRESS,
  WORKING_PRIVKEY_ENC: process.env.DECIMAL_WORKING_PRIVKEY_ENC,
  KEY_PASSPHRASE: process.env.DECIMAL_KEY_PASSPHRASE,
  
  // Параметры депозитов
  CONFIRMATIONS: parseInt(process.env.DECIMAL_CONFIRMATIONS || '6'),
  UNIQUE_SCALE: parseFloat(process.env.DECIMAL_UNIQUE_SCALE || '0.001'),
  MAX_USER_MOD: 0.999,
  
  // Redis настройки (поддержка Upstash с TLS)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',
  
  // Проверка готовности конфигурации
  isConfigured() {
    return !!(this.WORKING_ADDRESS && this.WORKING_PRIVKEY_ENC && this.KEY_PASSPHRASE && this.REDIS_URL);
  },

  // Проверка использования Upstash (определяем по URL)
  isUpstash() {
    return this.REDIS_URL.includes('upstash.io') || this.REDIS_URL.includes('upstash-redis');
  },

  // Получение Upstash REST URL и токена из переменных окружения
  getUpstashConfig() {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (restUrl && token) {
      return { restUrl, token };
    }
    return null;
  },

  // Получение конфигурации Redis
  getRedisConfig() {
    // Определяем тип Redis провайдера
    const isUpstash = this.isUpstash();
    const isRedisCloud = this.REDIS_URL.includes('redis-cloud.com') || this.REDIS_URL.includes('redislabs.com');
    const isSecureRedis = this.REDIS_URL.startsWith('rediss://') || this.REDIS_URL.includes('upstash.io') || this.REDIS_URL.includes('upstash-redis');
    
    console.log(`🔧 Redis конфигурация: ${this.REDIS_URL}`);
    console.log(`   Upstash: ${isUpstash}`);
    console.log(`   RedisCloud: ${isRedisCloud}`);
    console.log(`   Secure: ${isSecureRedis}`);
    
    if (isUpstash || isRedisCloud || isSecureRedis) {
      // Для всех SSL/TLS Redis провайдеров
      const redisUrl = new URL(this.REDIS_URL);
      console.log(`🔒 Настраиваем TLS для Redis: ${redisUrl.hostname}`);
      
      return {
        url: this.REDIS_URL,
        socket: {
          tls: true,
          rejectUnauthorized: false,
          servername: redisUrl.hostname,
          checkServerIdentity: () => undefined // Правильная функция для TLS
        },
        connectTimeout: 60000, // Увеличиваем timeout для Upstash
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        maxLoadingTimeout: 30000, // Увеличиваем loading timeout
        retryDelayOnClusterDown: 300,
        retryDelayOnFailover: 100,
        retryDelayOnTryAgain: 100
      };
    } else {
      // Для обычного Redis
      console.log(`🔓 Настраиваем обычное подключение к Redis`);
      return { 
        url: this.REDIS_URL,
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
  },

  // Получение актуального газ прайса из сети
  async getCurrentGasPrice() {
    try {
      const response = await fetch(this.RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      if (data.result) {
        const gasPriceWei = parseInt(data.result, 16);
        const gasPriceGwei = gasPriceWei / 1000000000;
        
        // Добавляем 20% к текущему прайсу для надежности
        const adjustedGasPrice = Math.ceil(gasPriceGwei * 1.2);
        
        console.log(`Current gas price: ${gasPriceGwei} gwei, using: ${adjustedGasPrice} gwei`);
        return adjustedGasPrice;
      }
    } catch (error) {
      console.error('Error getting gas price:', error);
    }
    
    // Возвращаем значение по умолчанию если не удалось получить
    return this.GAS_PRICE;
  },

  // API методы для работы с DecimalChain
  async getAddressBalance(address) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/addresses/${address}/balance`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting address balance:', error);
      throw error;
    }
  },

  async getAddressTransactions(address, limit = 50) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/addresses/${address}/transactions?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting address transactions:', error);
      throw error;
    }
  },

  async getTransaction(txHash) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/transactions/${txHash}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  },

  async sendTransaction(signedTx) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedTx: signedTx
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  },

  // Расшифровка приватного ключа
  getPrivateKey() {
    if (!this.WORKING_PRIVKEY_ENC || !this.KEY_PASSPHRASE) {
      throw new Error('DECIMAL_WORKING_PRIVKEY_ENC и DECIMAL_KEY_PASSPHRASE должны быть установлены');
    }
    
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.KEY_PASSPHRASE, 'salt', 32);
      const encryptedData = Buffer.from(this.WORKING_PRIVKEY_ENC, 'base64');
      
      const iv = encryptedData.slice(0, 16);
      const encrypted = encryptedData.slice(16);
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      // Добавляем префикс "0x" если его нет
      if (!decrypted.startsWith('0x')) {
        decrypted = '0x' + decrypted;
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Ошибка расшифровки приватного ключа: ' + error.message);
    }
  },
  
  // Генерация уникальной суммы депозита
  generateUniqueAmount(baseAmount, userId) {
    // Преобразуем userId в числовой модификатор
    const userIdHash = crypto.createHash('md5').update(userId.toString()).digest('hex');
    const userMod = parseInt(userIdHash.substring(0, 8), 16) % 1000;
    
    // Используем более точный модификатор (0.001 - 0.999)
    const uniqueModifier = (userMod / 1000) * 0.999;
    const uniqueAmount = baseAmount + uniqueModifier;
    
    // Округляем до 4 знаков после запятой для точности
    return Math.round(uniqueAmount * 10000) / 10000;
  }
}; 