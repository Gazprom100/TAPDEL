const { MongoClient } = require('mongodb');
require('dotenv').config();

class DatabaseConfig {
  constructor() {
    const username = 'TAPDEL';
    const password = 'fpz%25sE62KPzmHfM'; // Уже закодированный пароль
    const cluster = 'cluster0.ejo8obw.mongodb.net';
    const database = 'tapdel';
    
    this.MONGODB_URI = process.env.MONGODB_URI || 
      `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
    
    console.log('🔍 DatabaseConfig URI:', this.MONGODB_URI);
    
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  // Оптимизированная конфигурация для 2000 пользователей
  getConnectionConfig() {
    return {
      // Connection Pool настройки
      maxPoolSize: 50,         // Максимум 50 соединений
      minPoolSize: 5,          // Минимум 5 активных соединений
      maxIdleTimeMS: 30000,    // 30 сек timeout для idle соединений
      
      // Timeouts
      serverSelectionTimeoutMS: 5000,  // 5 сек для выбора сервера
      socketTimeoutMS: 45000,          // 45 сек socket timeout
      connectTimeoutMS: 10000,         // 10 сек connection timeout
      
      // Retry логика
      retryWrites: true,
      retryReads: true,
      
      // Write Concern для надежности
      writeConcern: { 
        w: 'majority',  // Подтверждение от большинства
        j: true,        // Journaling
        wtimeoutMS: 10000  // Timeout для write операций
      },
      
      // Read Preference
      readPreference: 'primaryPreferred',
      readConcern: { level: 'majority' },
      
      // Heartbeat
      heartbeatFrequencyMS: 10000,
      
      // Compression
      compressors: ['zstd', 'zlib'],
      
      // Monitoring
      monitorCommands: process.env.NODE_ENV === 'development'
    };
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.db;
    }

    try {
      console.log('📊 Подключение к MongoDB с оптимизированным пулом соединений...');
      
      this.client = new MongoClient(this.MONGODB_URI, this.getConnectionConfig());
      
      await this.client.connect();
      this.db = this.client.db('tapdel');
      this.isConnected = true;
      
      // Создаем оптимизированные индексы при подключении
      await this.createOptimizedIndexes();
      
      console.log('✅ MongoDB подключен с оптимизированной конфигурацией');
      console.log(`   - Pool size: 5-50 соединений`);
      console.log(`   - Индексы: оптимизированы для 2000+ пользователей`);
      
      return this.db;
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }

  async createOptimizedIndexes() {
    try {
      console.log('🔍 Создание оптимизированных индексов...');
      
      // Критические составные индексы для users
      await this.db.collection('users').createIndex(
        { 
          "userId": 1, 
          "gameState.tokens": -1, 
          "gameState.lastSaved": -1 
        }, 
        { 
          name: "user_tokens_activity",
          background: true
        }
      );

      await this.db.collection('users').createIndex(
        { 
          "profile.telegramId": 1, 
          "gameState.tokens": -1 
        }, 
        { 
          name: "telegram_tokens",
          background: true
        }
      );

      // Оптимизация лидерборда
      await this.db.collection('leaderboard').createIndex(
        { 
          "tokens": -1, 
          "updatedAt": -1 
        }, 
        { 
          name: "leaderboard_performance",
          background: true
        }
      );

      // Индексы для транзакций
      await this.db.collection('withdrawals').createIndex(
        { 
          "userId": 1, 
          "status": 1, 
          "requestedAt": -1 
        }, 
        { 
          name: "user_withdrawals",
          background: true
        }
      );

      await this.db.collection('deposits').createIndex(
        { 
          "userId": 1, 
          "matched": 1, 
          "expiresAt": 1 
        }, 
        { 
          name: "user_deposits",
          background: true
        }
      );

      // Индекс для поиска по статусу
      await this.db.collection('withdrawals').createIndex(
        { 
          "status": 1,
          "requestedAt": -1
        }, 
        { 
          name: "status_queue",
          background: true
        }
      );

      console.log('✅ Оптимизированные индексы созданы');
    } catch (error) {
      console.warn('⚠️ Некоторые индексы уже существуют или не удалось создать:', error.message);
    }
  }

  async getStats() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const [serverStatus, dbStats] = await Promise.all([
        this.db.admin().serverStatus(),
        this.db.stats()
      ]);

      return {
        connections: {
          current: serverStatus.connections.current,
          available: serverStatus.connections.available,
          totalCreated: serverStatus.connections.totalCreated
        },
        operations: {
          insert: serverStatus.opcounters.insert,
          query: serverStatus.opcounters.query,
          update: serverStatus.opcounters.update,
          delete: serverStatus.opcounters.delete
        },
        database: {
          collections: dbStats.collections,
          objects: dbStats.objects,
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100, // MB
          storageSize: Math.round(dbStats.storageSize / 1024 / 1024 * 100) / 100 // MB
        }
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  async healthCheck() {
    if (!this.isConnected) {
      return { healthy: false, message: 'Not connected' };
    }

    try {
      const start = Date.now();
      await this.db.admin().ping();
      const responseTime = Date.now() - start;
      
      const stats = await this.getStats();
      
      return {
        healthy: true,
        responseTime,
        stats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
      console.log('📊 MongoDB отключен');
    }
  }

  // Получение коллекции с оптимизированными настройками
  getCollection(name) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    return this.db.collection(name);
  }

  // Оптимизированные операции

  // Пагинированный лидерборд
  async getLeaderboard(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    return await this.getCollection('leaderboard')
      .find({}, { 
        projection: { 
          username: 1, 
          tokens: 1, 
          rank: 1,
          _id: 0
        } 
      })
      .sort({ tokens: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // Batch обновление токенов
  async batchUpdateTokens(updates) {
    const operations = updates.map(({ userId, amount }) => ({
      updateOne: {
        filter: { userId },
        update: { 
          $inc: { 'gameState.tokens': amount },
          $set: { 'gameState.lastSaved': new Date() }
        },
        upsert: true
      }
    }));

    return await this.getCollection('users').bulkWrite(operations, {
      ordered: false  // Параллельное выполнение
    });
  }

  // Оптимизированное получение профиля
  async getUserProfile(userId) {
    return await this.getCollection('users').findOne(
      { userId },
      {
        projection: {
          userId: 1,
          'gameState.tokens': 1,
          'gameState.highScore': 1,
          'gameState.engineLevel': 1,
          'profile.username': 1,
          'profile.level': 1,
          _id: 0
        }
      }
    );
  }
}

// Singleton instance
const databaseConfig = new DatabaseConfig();

// Экспортируем функцию connectToDatabase для обратной совместимости
const connectToDatabase = () => databaseConfig.connect();

module.exports = databaseConfig;
module.exports.connectToDatabase = connectToDatabase; 