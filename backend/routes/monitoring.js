const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');
const advancedCacheService = require('../services/advancedCacheService');
const withdrawalBatchService = require('../services/withdrawalBatchService');

// Получение текущих метрик системы
router.get('/metrics', async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения метрик:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получение алертов
router.get('/alerts', async (req, res) => {
  try {
    const level = req.query.level; // WARNING, CRITICAL, etc.
    const alerts = monitoringService.getAlerts(level);
    
    res.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения алертов:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check системы
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.healthCheck();
    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка health check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получение статистики производительности
router.get('/performance', async (req, res) => {
  try {
    const stats = await monitoringService.getPerformanceStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики производительности:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Статистика кеша
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = advancedCacheService.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики кеша:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Очистка кеша
router.post('/cache/clear', async (req, res) => {
  try {
    await advancedCacheService.clearCache();
    res.json({
      success: true,
      message: 'Кеш очищен',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка очистки кеша:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Статистика batch processing
router.get('/batch/stats', async (req, res) => {
  try {
    const stats = withdrawalBatchService.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения статистики batch processing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ручная обработка batch
router.post('/batch/process', async (req, res) => {
  try {
    await withdrawalBatchService.processBatch();
    res.json({
      success: true,
      message: 'Batch processing запущен',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка запуска batch processing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Очистка старых записей
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await withdrawalBatchService.cleanupOldRecords();
    res.json({
      success: true,
      message: `Очищено ${deletedCount} старых записей`,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка очистки старых записей:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Получение системной информации
router.get('/system', async (req, res) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      title: process.title,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT
      }
    };

    res.json({
      success: true,
      system: systemInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Ошибка получения системной информации:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 