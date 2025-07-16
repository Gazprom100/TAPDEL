const crypto = require('crypto');

module.exports = {
  // DecimalChain настройки
  RPC_URL: process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/',
  CHAIN_ID: parseInt(process.env.DECIMAL_CHAIN_ID || '75'),
  GAS_LIMIT: 21000,
  GAS_PRICE: parseInt(process.env.DECIMAL_GAS_PRICE_GWEI || '5'),
  
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
    return this.REDIS_URL.includes('upstash.io');
  },

  // Получение конфигурации Redis
  getRedisConfig() {
    if (this.isUpstash()) {
      // Для Upstash Redis - используем более простую конфигурацию
      return {
        url: this.REDIS_URL,
        socket: {
          tls: true,
          rejectUnauthorized: false
        },
        // Упрощенные настройки для Upstash
        connectTimeout: 60000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      };
    } else {
      // Для обычного Redis и Redis Cloud
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