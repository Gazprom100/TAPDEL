const fetch = require('node-fetch');

class UpstashRedisService {
  constructor(restUrl, token) {
    this.restUrl = restUrl;
    this.token = token;
    this.baseUrl = restUrl.replace('/rest/v1', '');
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('🔗 Подключение к Upstash Redis через REST API...');
      
      // Тестируем подключение через ping
      const pingResponse = await fetch(`${this.restUrl}/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (pingResponse.ok) {
        this.isConnected = true;
        console.log('✅ Upstash Redis подключен через REST API');
        return true;
      } else {
        throw new Error(`Ping failed: ${pingResponse.status} ${pingResponse.statusText}`);
      }
    } catch (error) {
      console.error('❌ Ошибка подключения к Upstash Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async get(key) {
    try {
      const response = await fetch(`${this.restUrl}/get/${key}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        return result.result; // Upstash возвращает значение в поле result
      } else if (response.status === 404) {
        return null; // Ключ не найден
      } else {
        throw new Error(`GET failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка получения ключа ${key}:`, error);
      throw error;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const body = { value: value };
      if (ttl) {
        body.expiry = ttl;
      }

      const response = await fetch(`${this.restUrl}/set/${key}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        return result.result === 'OK';
      } else {
        throw new Error(`SET failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка установки ключа ${key}:`, error);
      throw error;
    }
  }

  async setEx(key, ttl, value) {
    return this.set(key, value, ttl);
  }

  async del(key) {
    try {
      const response = await fetch(`${this.restUrl}/del/${key}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        return result.result === 1; // Возвращает количество удаленных ключей
      } else {
        throw new Error(`DEL failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка удаления ключа ${key}:`, error);
      throw error;
    }
  }

  async ping() {
    try {
      const response = await fetch(`${this.restUrl}/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.text();
        return result;
      } else {
        throw new Error(`PING failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Ошибка ping:', error);
      throw error;
    }
  }

  async quit() {
    this.isConnected = false;
    console.log('🔌 Upstash Redis подключение закрыто');
  }

  // Методы для совместимости с redis клиентом
  async disconnect() {
    return this.quit();
  }

  on(event, callback) {
    // Простая заглушка для совместимости
    if (event === 'connect') {
      setTimeout(() => callback(), 100);
    } else if (event === 'ready') {
      setTimeout(() => callback(), 200);
    } else if (event === 'error') {
      // Обработка ошибок через try-catch
    } else if (event === 'end') {
      // Обработка закрытия
    }
  }
}

module.exports = UpstashRedisService; 