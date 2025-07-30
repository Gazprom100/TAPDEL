const databaseConfig = require('../config/database');
const advancedCacheService = require('./advancedCacheService');
const withdrawalBatchService = require('./withdrawalBatchService');

class MonitoringService {
  constructor() {
    this.metrics = {
      activeUsers: 0,
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
      databaseConnections: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = 30000; // 30 секунд
  }

  async initialize() {
    console.log('📊 Инициализация MonitoringService...');
    
    this.startMonitoring();
    
    console.log('✅ MonitoringService инициализирован');
    console.log(`   - Monitoring interval: ${this.monitoringInterval}ms`);
    console.log(`   - Alert thresholds: настроены`);
  }

  startMonitoring() {
    this.isMonitoring = true;
    
    setInterval(async () => {
      if (this.isMonitoring) {
        await this.collectMetrics();
        await this.checkAlerts();
      }
    }, this.monitoringInterval);
  }

  async collectMetrics() {
    try {
      // Собираем метрики производительности
      const startTime = Date.now();
      
      // Метрики базы данных
      const database = await databaseConfig.connect();
      if (database) {
        const userCount = await database.collection('users').countDocuments();
        const leaderboardCount = await database.collection('leaderboard').countDocuments();
        
        this.metrics.activeUsers = userCount;
        this.metrics.databaseConnections = database.client.topology.s.options.maxPoolSize;
      }

      // Метрики кеша
      const cacheStats = advancedCacheService.getStats();
      this.metrics.cacheHitRate = parseFloat(cacheStats.hitRate);

      // Метрики batch processing
      const batchStats = withdrawalBatchService.getStats();
      this.metrics.batchProcessingSuccess = batchStats.successRate;

      // Системные метрики
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
      this.metrics.cpuUsage = process.cpuUsage();

      // Время сбора метрик
      this.metrics.metricsCollectionTime = Date.now() - startTime;

      console.log('📊 Метрики собраны:', {
        activeUsers: this.metrics.activeUsers,
        cacheHitRate: this.metrics.cacheHitRate,
        memoryUsage: `${this.metrics.memoryUsage}MB`,
        batchSuccessRate: this.metrics.batchProcessingSuccess
      });

    } catch (error) {
      console.error('❌ Ошибка сбора метрик:', error);
    }
  }

  async checkAlerts() {
    const newAlerts = [];

    // Проверка активных пользователей
    if (this.metrics.activeUsers > 1000) {
      newAlerts.push({
        level: 'WARNING',
        message: `Высокая нагрузка: ${this.metrics.activeUsers} активных пользователей`,
        timestamp: new Date(),
        metric: 'activeUsers',
        value: this.metrics.activeUsers
      });
    }

    // Проверка кеша
    if (this.metrics.cacheHitRate < 50) {
      newAlerts.push({
        level: 'WARNING',
        message: `Низкий cache hit rate: ${this.metrics.cacheHitRate}%`,
        timestamp: new Date(),
        metric: 'cacheHitRate',
        value: this.metrics.cacheHitRate
      });
    }

    // Проверка памяти
    if (this.metrics.memoryUsage > 500) {
      newAlerts.push({
        level: 'CRITICAL',
        message: `Высокое потребление памяти: ${this.metrics.memoryUsage}MB`,
        timestamp: new Date(),
        metric: 'memoryUsage',
        value: this.metrics.memoryUsage
      });
    }

    // Проверка batch processing
    if (this.metrics.batchProcessingSuccess && parseFloat(this.metrics.batchProcessingSuccess) < 80) {
      newAlerts.push({
        level: 'WARNING',
        message: `Низкий успех batch processing: ${this.metrics.batchProcessingSuccess}`,
        timestamp: new Date(),
        metric: 'batchProcessingSuccess',
        value: this.metrics.batchProcessingSuccess
      });
    }

    // Добавляем новые алерты
    if (newAlerts.length > 0) {
      this.alerts.push(...newAlerts);
      console.log('🚨 Новые алерты:', newAlerts.map(a => `${a.level}: ${a.message}`));
    }

    // Очищаем старые алерты (старше 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  // Получение текущих метрик
  getMetrics() {
    return {
      ...this.metrics,
      alerts: this.alerts.length,
      isMonitoring: this.isMonitoring,
      uptime: process.uptime()
    };
  }

  // Получение алертов
  getAlerts(level = null) {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return this.alerts;
  }

  // Ручная проверка здоровья системы
  async healthCheck() {
    try {
      const checks = {
        database: false,
        cache: false,
        batchProcessing: false,
        memory: false
      };

      // Проверка базы данных
      try {
        const database = await databaseConfig.connect();
        if (database) {
          await database.admin().ping();
          checks.database = true;
        }
      } catch (error) {
        console.error('❌ Database health check failed:', error.message);
      }

      // Проверка кеша
      try {
        const cacheStats = advancedCacheService.getStats();
        checks.cache = cacheStats.redisAvailable || cacheStats.localCacheSize > 0;
      } catch (error) {
        console.error('❌ Cache health check failed:', error.message);
      }

      // Проверка batch processing
      try {
        const batchStats = withdrawalBatchService.getStats();
        checks.batchProcessing = !batchStats.isProcessing;
      } catch (error) {
        console.error('❌ Batch processing health check failed:', error.message);
      }

      // Проверка памяти
      const memUsage = process.memoryUsage();
      checks.memory = memUsage.heapUsed < 500 * 1024 * 1024; // < 500MB

      const allHealthy = Object.values(checks).every(check => check);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date(),
        uptime: process.uptime()
      };

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Получение статистики производительности
  async getPerformanceStats() {
    try {
      const database = await databaseConfig.connect();
      
      const stats = {
        users: {
          total: await database.collection('users').countDocuments(),
          active: await database.collection('users').countDocuments({
            'gameState.lastSaved': { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })
        },
        leaderboard: {
          total: await database.collection('leaderboard').countDocuments()
        },
        withdrawals: {
          pending: await database.collection('withdrawals').countDocuments({ status: 'queued' }),
          processing: await database.collection('withdrawals').countDocuments({ status: 'processing' }),
          completed: await database.collection('withdrawals').countDocuments({ status: 'completed' }),
          failed: await database.collection('withdrawals').countDocuments({ status: 'failed' })
        },
        cache: advancedCacheService.getStats(),
        batch: withdrawalBatchService.getStats(),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          version: process.version
        }
      };

      return stats;

    } catch (error) {
      console.error('❌ Ошибка получения статистики производительности:', error);
      return { error: error.message };
    }
  }

  // Остановка мониторинга
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🔌 MonitoringService: Мониторинг остановлен');
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔌 MonitoringService: Завершение работы...');
    this.stopMonitoring();
  }
}

// Создаем singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService; 