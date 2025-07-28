const express = require('express');
const { MongoClient } = require('mongodb');
const os = require('os');
const router = express.Router();

// Используем подключение к MongoDB из основного API
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%25sE62KPzmHfM'; // Уже закодированный пароль
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

let client = null;
let db = null;

const connectToDatabase = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
  }
  return db;
};

// === СТАТИСТИКА ===

// Получить статистику админ панели
router.get('/statistics', async (req, res) => {
  try {
    const database = await connectToDatabase();
    
    // Количество пользователей
    const totalUsers = await database.collection('users').countDocuments();
    
    // Общий баланс токенов
    const users = await database.collection('users').find({}, { projection: { 'gameState.tokens': 1 } }).toArray();
    const totalTokens = users.reduce((sum, u) => sum + (u.gameState?.tokens || 0), 0);
    
    // Статистика депозитов
    const totalDeposits = await database.collection('deposits').countDocuments();
    const sumDeposits = await database.collection('deposits').aggregate([
      { $group: { _id: null, total: { $sum: '$amountRequested' } } }
    ]).toArray();
    
    // Статистика выводов
    const totalWithdrawals = await database.collection('withdrawals').countDocuments();
    const sumWithdrawals = await database.collection('withdrawals').aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();
    
    // Активные пользователи за 24ч
    const since = new Date(Date.now() - 24*60*60*1000);
    const activeUsers = await database.collection('users').countDocuments({ 
      'profile.lastLogin': { $gte: since } 
    });

    res.json({
      totalUsers,
      totalTokens,
      totalDeposits,
      sumDeposits: sumDeposits[0]?.total || 0,
      totalWithdrawals,
      sumWithdrawals: sumWithdrawals[0]?.total || 0,
      activeUsers
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

// === СИСТЕМНЫЕ МЕТРИКИ ===

// Получить метрики системы
router.get('/system/metrics', async (req, res) => {
  try {
    const cpuUsage = os.loadavg()[0] * 100; // 1-минутная нагрузка
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // Простая оценка использования диска (в продакшене лучше использовать fs.stat)
    const diskUsage = Math.random() * 30 + 20; // Моковые данные для демонстрации
    
    const uptime = os.uptime();
    
    res.json({
      cpu: Math.min(cpuUsage, 100),
      memory: Math.min(memoryUsage, 100),
      disk: Math.min(diskUsage, 100),
      network: {
        in: Math.random() * 1000,
        out: Math.random() * 500
      },
      uptime,
      activeConnections: Math.floor(Math.random() * 100) + 10
    });
  } catch (error) {
    console.error('Ошибка получения метрик системы:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статус блокчейна
router.get('/blockchain/status', async (req, res) => {
  try {
    // В реальности здесь будет подключение к DecimalChain API
    const decimalService = require('../services/decimalService');
    
    let blockchainStatus = {
      lastBlock: 0,
      blockTime: 0,
      confirmations: 3,
      networkHashrate: 0,
      isConnected: false
    };
    
    try {
      // Пытаемся получить реальные данные
      const lastBlock = await decimalService.getLastBlockNumber();
      blockchainStatus = {
        lastBlock: lastBlock || 0,
        blockTime: 2.5, // Среднее время блока DecimalChain
        confirmations: 3,
        networkHashrate: Math.random() * 1000000 + 500000,
        isConnected: true
      };
    } catch (error) {
      console.warn('Не удалось получить статус блокчейна:', error.message);
      blockchainStatus.isConnected = false;
    }
    
    res.json(blockchainStatus);
  } catch (error) {
    console.error('Ошибка получения статуса блокчейна:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статус сервисов
router.get('/services/status', async (req, res) => {
  try {
    const services = [];
    const now = new Date();
    
    // MongoDB
    try {
      const start = Date.now();
      await db.admin().ping();
      const responseTime = Date.now() - start;
      services.push({
        name: 'MongoDB',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString()
      });
    } catch (error) {
      services.push({
        name: 'MongoDB',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: error.message
      });
    }
    
    // Redis (если доступен)
    try {
      const cacheService = require('../services/cacheService');
      const start = Date.now();
      await cacheService.ping();
      const responseTime = Date.now() - start;
      services.push({
        name: 'Redis',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString()
      });
    } catch (error) {
      services.push({
        name: 'Redis',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: 'Сервис недоступен'
      });
    }
    
    // DecimalChain API
    try {
      const decimalService = require('../services/decimalService');
      const start = Date.now();
      await decimalService.getWorkingBalance();
      const responseTime = Date.now() - start;
      services.push({
        name: 'DecimalChain API',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString()
      });
    } catch (error) {
      services.push({
        name: 'DecimalChain API',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: 'Сервис недоступен'
      });
    }
    
    // Telegram Bot
    try {
      const botService = require('../services/botService');
      const start = Date.now();
      if (botService.bot) {
        await botService.bot.getMe();
        const responseTime = Date.now() - start;
        services.push({
          name: 'Telegram Bot',
          status: 'online',
          responseTime,
          lastCheck: now.toISOString()
        });
      } else {
        services.push({
          name: 'Telegram Bot',
          status: 'offline',
          responseTime: 0,
          lastCheck: now.toISOString(),
          error: 'Бот не инициализирован'
        });
      }
    } catch (error) {
      services.push({
        name: 'Telegram Bot',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: error.message
      });
    }
    
    res.json(services);
  } catch (error) {
    console.error('Ошибка получения статуса сервисов:', error);
    res.status(500).json({ error: error.message });
  }
});

// === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===

// Получить список пользователей
router.get('/users', async (req, res) => {
  try {
    const database = await connectToDatabase();
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Строим фильтр
    const filter = {};
    
    if (search) {
      filter.$or = [
        { 'profile.username': { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { 'profile.telegramUsername': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (status && status !== 'all') {
      if (status === 'banned') {
        filter.isBanned = true;
      } else if (status === 'active') {
        filter.isBanned = { $ne: true };
      }
    }
    
    // Получаем пользователей
    const users = await database.collection('users')
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Получаем общее количество
    const total = await database.collection('users').countDocuments(filter);
    
    // Форматируем данные
    const formattedUsers = users.map(user => ({
      _id: user._id.toString(),
      userId: user.userId,
      username: user.profile?.username || `Игрок ${user.userId.slice(-4)}`,
      telegramFirstName: user.profile?.telegramFirstName,
      telegramLastName: user.profile?.telegramLastName,
      telegramUsername: user.profile?.telegramUsername,
      tokens: user.gameState?.tokens || 0,
      highScore: user.gameState?.highScore || 0,
      level: Math.floor((user.gameState?.highScore || 0) / 1000) + 1,
      isBanned: user.isBanned || false,
      role: user.role || 'user',
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      lastActive: user.profile?.lastLogin instanceof Date ? user.profile.lastLogin.toISOString() : new Date().toISOString(),
      totalDeposits: 0, // TODO: подсчитать из коллекции deposits
      totalWithdrawals: 0 // TODO: подсчитать из коллекции withdrawals
    }));
    
    res.json({
      users: formattedUsers,
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});

// Обновить пользователя
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const database = await connectToDatabase();
    
    // Обновляем пользователя
    const result = await database.collection('users').updateOne(
      { userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ message: 'Пользователь обновлен' });
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    res.status(500).json({ error: error.message });
  }
});

// Массовые операции с пользователями
router.post('/users/bulk', async (req, res) => {
  try {
    const { userIds, action } = req.body;
    const database = await connectToDatabase();
    
    let updateOperation = {};
    
    switch (action) {
      case 'ban':
        updateOperation = { isBanned: true };
        break;
      case 'unban':
        updateOperation = { isBanned: false };
        break;
      case 'resetBalance':
        updateOperation = { 
          'gameState.tokens': 0,
          'gameState.highScore': 0
        };
        break;
      case 'delete':
        // Удаляем пользователей
        await database.collection('users').deleteMany({ userId: { $in: userIds } });
        await database.collection('leaderboard').deleteMany({ userId: { $in: userIds } });
        res.json({ message: 'Пользователи удалены' });
        return;
      default:
        return res.status(400).json({ error: 'Неизвестное действие' });
    }
    
    // Обновляем пользователей
    const result = await database.collection('users').updateMany(
      { userId: { $in: userIds } },
      { $set: { ...updateOperation, updatedAt: new Date() } }
    );
    
    res.json({ 
      message: `Операция ${action} выполнена для ${result.modifiedCount} пользователей` 
    });
  } catch (error) {
    console.error('Ошибка массовой операции:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ТРАНЗАКЦИИ ===

// Получить транзакции
router.get('/transactions', async (req, res) => {
  try {
    const database = await connectToDatabase();
    const { page = 1, limit = 20, type, status } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Строим фильтр
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Получаем депозиты
    const deposits = await database.collection('deposits')
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Получаем выводы
    const withdrawals = await database.collection('withdrawals')
      .find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Объединяем и форматируем
    const transactions = [
      ...deposits.map(deposit => ({
        _id: deposit._id.toString(),
        userId: deposit.userId,
        type: 'deposit',
        amount: deposit.amountRequested,
        status: deposit.status === 'expired' ? 'expired' :
          (deposit.matched ? 
            (deposit.confirmations >= 3 ? 'confirmed' : 'pending') : 
            'waiting'),
        txHash: deposit.txHash,
        createdAt: deposit.createdAt.toISOString(),
        processedAt: deposit.processedAt?.toISOString()
      })),
      ...withdrawals.map(withdrawal => ({
        _id: withdrawal._id.toString(),
        userId: withdrawal.userId,
        type: 'withdrawal',
        amount: withdrawal.amount,
        status: withdrawal.status,
        txHash: withdrawal.txHash,
        createdAt: withdrawal.requestedAt instanceof Date ? withdrawal.requestedAt.toISOString() : new Date().toISOString(),
        processedAt: withdrawal.processedAt instanceof Date ? withdrawal.processedAt.toISOString() : null
      }))
    ];
    
    // Сортируем по дате создания
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Получаем общее количество
    const totalDeposits = await database.collection('deposits').countDocuments(filter);
    const totalWithdrawals = await database.collection('withdrawals').countDocuments(filter);
    const total = totalDeposits + totalWithdrawals;
    
    res.json({
      transactions,
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Ошибка получения транзакций:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ЛОГИ ===

// Получить логи системы
router.get('/logs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // В реальности здесь будет подключение к системе логирования
    // Пока возвращаем моковые данные
    const logs = [];
    const levels = ['info', 'warning', 'error', 'debug'];
    const services = ['System', 'API', 'Blockchain', 'Database'];
    
    for (let i = 0; i < parseInt(limit); i++) {
      const timestamp = new Date(Date.now() - i * 60000);
      logs.push({
        timestamp: timestamp.toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: `Лог сообщение ${i + 1}`,
        service: services[Math.floor(Math.random() * services.length)]
      });
    }
    
    res.json(logs);
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ЭКОНОМИЧЕСКИЕ МЕТРИКИ ===

// Получить экономические метрики
router.get('/economy/metrics', async (req, res) => {
  try {
    const database = await connectToDatabase();
    
    // Статистика депозитов
    const depositsStats = await database.collection('deposits').aggregate([
      { $group: { _id: null, total: { $sum: '$amountRequested' }, count: { $sum: 1 } } }
    ]).toArray();
    
    // Статистика выводов
    const withdrawalsStats = await database.collection('withdrawals').aggregate([
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]).toArray();
    
    // Общий баланс токенов
    const users = await database.collection('users').find({}, { projection: { 'gameState.tokens': 1 } }).toArray();
    const totalTokens = users.reduce((sum, u) => sum + (u.gameState?.tokens || 0), 0);
    
    res.json({
      totalInflow: depositsStats[0]?.total || 0,
      totalOutflow: withdrawalsStats[0]?.total || 0,
      netBalance: (depositsStats[0]?.total || 0) - (withdrawalsStats[0]?.total || 0),
      averageDeposit: depositsStats[0]?.count ? depositsStats[0].total / depositsStats[0].count : 0,
      averageWithdrawal: withdrawalsStats[0]?.count ? withdrawalsStats[0].total / withdrawalsStats[0].count : 0,
      totalTokens,
      activeUsers: await database.collection('users').countDocuments({ 'profile.lastLogin': { $gte: new Date(Date.now() - 24*60*60*1000) } })
    });
  } catch (error) {
    console.error('Ошибка получения экономических метрик:', error);
    res.status(500).json({ error: error.message });
  }
});

// === АНАЛИТИЧЕСКИЕ ОТЧЕТЫ ===

// Получить аналитические отчеты
router.get('/analytics/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { period = '7d' } = req.query;
    
    const database = await connectToDatabase();
    
    // Определяем период
    const now = new Date();
    let startDate;
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24*60*60*1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7*24*60*60*1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30*24*60*60*1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7*24*60*60*1000);
    }
    
    let report;
    
    switch (type) {
      case 'users':
        // Отчет по пользователям
        const newUsers = await database.collection('users').countDocuments({
          createdAt: { $gte: startDate }
        });
        const activeUsers = await database.collection('users').countDocuments({
          'profile.lastLogin': { $gte: startDate }
        });
        
        report = {
          newUsers,
          activeUsers,
          retentionRate: activeUsers / Math.max(newUsers, 1) * 100
        };
        break;
        
      case 'transactions':
        // Отчет по транзакциям
        const deposits = await database.collection('deposits').countDocuments({
          createdAt: { $gte: startDate }
        });
        const withdrawals = await database.collection('withdrawals').countDocuments({
          requestedAt: { $gte: startDate }
        });
        
        report = {
          deposits,
          withdrawals,
          successRate: (deposits + withdrawals) / Math.max(deposits + withdrawals, 1) * 100
        };
        break;
        
      case 'revenue':
        // Отчет по доходам
        const depositsRevenue = await database.collection('deposits').aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amountRequested' } } }
        ]).toArray();
        
        const withdrawalsRevenue = await database.collection('withdrawals').aggregate([
          { $match: { requestedAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray();
        
        report = {
          totalInflow: depositsRevenue[0]?.total || 0,
          totalOutflow: withdrawalsRevenue[0]?.total || 0,
          netRevenue: (depositsRevenue[0]?.total || 0) - (withdrawalsRevenue[0]?.total || 0)
        };
        break;
        
      default:
        return res.status(400).json({ error: 'Неизвестный тип отчета' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Ошибка получения аналитического отчета:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 