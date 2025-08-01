const express = require('express');
const { MongoClient } = require('mongodb');
const decimalService = require('../services/decimalService');
const config = require('../config/decimal');
const tokenService = require('../services/tokenService');
const router = express.Router();

// Используем подключение к MongoDB из основного API
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  const encodedPassword = encodeURIComponent(password);
  return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
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
    
    // Создаем индексы для новых коллекций
    await Promise.all([
      db.collection('deposits').createIndex({ userId: 1 }),
      db.collection('deposits').createIndex({ uniqueAmount: 1 }, { unique: true }),
      db.collection('deposits').createIndex({ matched: 1 }),
      db.collection('deposits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('withdrawals').createIndex({ userId: 1 }),
      db.collection('withdrawals').createIndex({ status: 1 })
    ]);
  }
  return db;
};

// Тестовый роут для проверки работы API
router.get('/test', (req, res) => {
  res.json({
    message: 'DecimalChain API работает!',
    timestamp: new Date().toISOString(),
    config: {
      workingAddress: config.WORKING_ADDRESS,
      chainId: config.CHAIN_ID,
      confirmations: config.CONFIRMATIONS
    }
  });
});

// Получить статус Decimal сервиса
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      status: 'active',
      message: 'Decimal сервис работает',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ошибка получения статуса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить все депозиты
router.get('/deposits', async (req, res) => {
  try {
    const database = await connectToDatabase();
    const deposits = await database.collection('deposits').find({}).sort({ createdAt: -1 }).limit(100).toArray();
    
    res.json({
      success: true,
      deposits: deposits.map(deposit => ({
        id: deposit._id.toString(),
        userId: deposit.userId,
        amount: deposit.amountRequested,
        status: deposit.matched ? 'completed' : 'pending',
        createdAt: deposit.createdAt?.toISOString(),
        txHash: deposit.txHash
      }))
    });
  } catch (error) {
    console.error('Ошибка получения депозитов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить все выводы
router.get('/withdrawals', async (req, res) => {
  try {
    const database = await connectToDatabase();
    const withdrawals = await database.collection('withdrawals').find({}).sort({ requestedAt: -1 }).limit(100).toArray();
    
    res.json({
      success: true,
      withdrawals: withdrawals.map(withdrawal => ({
        id: withdrawal._id.toString(),
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.requestedAt?.toISOString(),
        processedAt: withdrawal.processedAt?.toISOString(),
        txHash: withdrawal.txHash
      }))
    });
  } catch (error) {
    console.error('Ошибка получения выводов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === ДЕПОЗИТЫ ===

// Создать депозит
router.post('/deposits', async (req, res) => {
  try {
    const { userId, baseAmount } = req.body;
    
    if (!userId || !baseAmount) {
      return res.status(400).json({ 
        error: 'userId и baseAmount обязательны' 
      });
    }

    if (baseAmount < 0.001) {
      const activeToken = await tokenService.getActiveToken();
      return res.status(400).json({ 
        error: `Минимальная сумма депозита: 0.001 ${activeToken.symbol}` 
      });
    }

    const database = await connectToDatabase();
    
    // Генерируем уникальную сумму
    const uniqueAmount = config.generateUniqueAmount(baseAmount, userId);
    
    // Проверяем, нет ли активного депозита с такой суммой
    const existingDeposit = await database.collection('deposits').findOne({
      uniqueAmount: uniqueAmount,
      expiresAt: { $gt: new Date() }
    });

    if (existingDeposit) {
      return res.status(409).json({ 
        error: 'Депозит с такой суммой уже существует' 
      });
    }

    // Создаем депозит
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
    
    const deposit = {
      userId: userId,
      amountRequested: baseAmount,
      uniqueAmount: uniqueAmount,
      txHash: null,
      matched: false,
      confirmations: 0,
      createdAt: new Date(),
      expiresAt: expiresAt
    };

    const result = await database.collection('deposits').insertOne(deposit);
    
    const activeToken = await tokenService.getActiveToken();
    console.log(`💳 Создан депозит: ${userId} → ${uniqueAmount} ${activeToken.symbol}`);

    res.json({
      depositId: result.insertedId.toString(),
      uniqueAmount: uniqueAmount,
      address: config.WORKING_ADDRESS,
      expires: expiresAt.toISOString(),
      amountRequested: baseAmount
    });

  } catch (error) {
    console.error('❌ Ошибка создания депозита:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить статус депозита
router.get('/deposits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const database = await connectToDatabase();
    
    const deposit = await database.collection('deposits').findOne({
      _id: new (require('mongodb').ObjectId)(id)
    });

    if (!deposit) {
      return res.status(404).json({ error: 'Депозит не найден' });
    }

    res.json({
      depositId: deposit._id.toString(),
      userId: deposit.userId,
      amountRequested: deposit.amountRequested,
      uniqueAmount: deposit.uniqueAmount,
      matched: deposit.matched,
      confirmations: deposit.confirmations,
      txHash: deposit.txHash,
      status: deposit.status === 'expired' ? 'expired' :
        (deposit.matched ? 
          (deposit.confirmations >= config.CONFIRMATIONS ? 'confirmed' : 'pending') : 
          'waiting'),
      createdAt: deposit.createdAt,
      expiresAt: deposit.expiresAt
    });

  } catch (error) {
    console.error('❌ Ошибка получения депозита:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить все депозиты пользователя
router.get('/users/:userId/deposits', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    const deposits = await database.collection('deposits')
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const result = deposits.map(deposit => ({
      depositId: deposit._id.toString(),
      amountRequested: deposit.amountRequested,
      uniqueAmount: deposit.uniqueAmount,
      matched: deposit.matched,
      confirmations: deposit.confirmations,
      txHash: deposit.txHash,
      status: deposit.status === 'expired' ? 'expired' :
        (deposit.matched ? 
          (deposit.confirmations >= config.CONFIRMATIONS ? 'confirmed' : 'pending') : 
          'waiting'),
      createdAt: deposit.createdAt,
      expiresAt: deposit.expiresAt
    }));

    res.json(result);

  } catch (error) {
    console.error('❌ Ошибка получения депозитов пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === ВЫВОДЫ ===

// Создать вывод
router.post('/withdrawals', async (req, res) => {
  try {
    const { userId, toAddress, amount } = req.body;
    
    if (!userId || !toAddress || !amount) {
      return res.status(400).json({ 
        error: 'userId, toAddress и amount обязательны' 
      });
    }

    // Получаем настройки игры для проверки минимальной суммы
    const { MongoClient } = require('mongodb');
    const configClient = await MongoClient.connect(process.env.MONGODB_URI);
    const configDb = configClient.db('tapdel');
    const systemConfig = await configDb.collection('system_config').findOne({ type: 'game_config' });
    const minWithdrawal = systemConfig?.config?.economy?.withdrawalMinAmount || 100;
    await configClient.close();

    if (amount < minWithdrawal) {
      const activeToken = await tokenService.getActiveToken();
      return res.status(400).json({ 
        error: `Минимальная сумма вывода: ${minWithdrawal} ${activeToken.symbol}` 
      });
    }

    // Простая проверка адреса (начинается с xdc или 0x, 42 символа)
    if (!toAddress.match(/^(xdc|0x)[0-9a-fA-F]{40}$/)) {
      return res.status(400).json({ 
        error: 'Неверный формат адреса' 
      });
    }

    const database = await connectToDatabase();
    
    // Проверяем баланс пользователя
    const user = await database.collection('users').findOne({ userId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const gameBalance = user.gameState?.tokens || 0;
    
    if (gameBalance < amount) {
      const activeToken = await tokenService.getActiveToken();
      return res.status(400).json({ 
        error: `Недостаточно средств. Доступно: ${gameBalance} ${activeToken.symbol}` 
      });
    }

    // Инициализируем decimalService если нужно
    if (!decimalService.isInitialized) {
      try {
        await decimalService.initialize();
        console.log('✅ DecimalService инициализирован для вывода');
      } catch (initError) {
        console.error('❌ Ошибка инициализации DecimalService:', initError);
        return res.status(500).json({ 
          error: 'Ошибка инициализации блокчейн сервиса' 
        });
      }
    }

    // Проверяем баланс рабочего кошелька
    try {
      const workingBalance = await decimalService.getWorkingBalance();
      if (workingBalance < amount) {
        const activeToken = await tokenService.getActiveToken();
        return res.status(400).json({ 
          error: `Недостаточно средств в рабочем кошельке. Доступно: ${workingBalance} ${activeToken.symbol}` 
        });
      }
    } catch (balanceError) {
      console.error('❌ Ошибка проверки баланса рабочего кошелька:', balanceError);
      return res.status(500).json({ 
        error: 'Ошибка проверки баланса рабочего кошелька' 
      });
    }

    // Списываем средства с баланса пользователя
    await database.collection('users').updateOne(
      { userId: userId },
      { $set: { "gameState.tokens": gameBalance - amount, updatedAt: new Date() } }
    );

    // Создаем запрос на вывод
    const withdrawal = {
      userId: userId,
      toAddress: toAddress,
      amount: amount,
      txHash: null,
      status: 'queued',
      requestedAt: new Date(),
      processedAt: null
    };

    const result = await database.collection('withdrawals').insertOne(withdrawal);
    
    const activeToken = await tokenService.getActiveToken();
    console.log(`💸 Создан вывод: ${userId} → ${amount} ${activeToken.symbol} на ${toAddress}`);

    res.json({
      withdrawalId: result.insertedId.toString(),
      status: 'queued',
      amount: amount,
      toAddress: toAddress
    });

  } catch (error) {
    console.error('❌ Ошибка создания вывода:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// Получить статус вывода
router.get('/withdrawals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const database = await connectToDatabase();
    
    const withdrawal = await database.collection('withdrawals').findOne({
      _id: new (require('mongodb').ObjectId)(id)
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Вывод не найден' });
    }

    res.json({
      withdrawalId: withdrawal._id.toString(),
      userId: withdrawal.userId,
      toAddress: withdrawal.toAddress,
      amount: withdrawal.amount,
      status: withdrawal.status,
      txHash: withdrawal.txHash,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt
    });

  } catch (error) {
    console.error('❌ Ошибка получения вывода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить все выводы пользователя
router.get('/users/:userId/withdrawals', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    const withdrawals = await database.collection('withdrawals')
      .find({ userId: userId })
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();

    const result = withdrawals.map(withdrawal => ({
      withdrawalId: withdrawal._id.toString(),
      toAddress: withdrawal.toAddress,
      amount: withdrawal.amount,
      status: withdrawal.status,
      txHash: withdrawal.txHash,
      requestedAt: withdrawal.requestedAt,
      processedAt: withdrawal.processedAt
    }));

    res.json(result);

  } catch (error) {
    console.error('❌ Ошибка получения выводов пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === ТРАНЗАКЦИИ ===

// Получить все транзакции пользователя (депозиты + выводы)
router.get('/users/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    // Загружаем депозиты
    const deposits = await database.collection('deposits')
      .find({ userId: userId })
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();
    
    // Загружаем выводы
    const withdrawals = await database.collection('withdrawals')
      .find({ userId: userId })
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();
    
    res.json({
      deposits: deposits || [],
      withdrawals: withdrawals || [],
      total: deposits.length + withdrawals.length
    });

  } catch (error) {
    console.error('❌ Ошибка получения транзакций:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === БАЛАНС ===

// Получить баланс пользователя (активный токен)
router.get('/users/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    const user = await database.collection('users').findOne({ userId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const activeToken = await tokenService.getActiveToken();
    
    // Получаем баланс для активного токена
    const tokenBalanceService = require('../services/tokenBalanceService');
    let tokenBalance = null;
    
    try {
      tokenBalance = await tokenBalanceService.getUserTokenBalance(userId, activeToken.symbol);
    } catch (error) {
      console.warn('⚠️ Ошибка получения баланса токена:', error);
    }
    
    // ИСПРАВЛЕНО: Приоритет gameState.tokens над сохраненным балансом
    // Если gameState.tokens = 0 (сброшено в админке), то игнорируем сохраненный баланс
    let gameBalance = user.gameState?.tokens || 0;
    
    // Используем сохраненный баланс только если gameState.tokens > 0
    // Это предотвращает возврат баланса после сброса в админке
    if (tokenBalance && tokenBalance.balance > 0 && gameBalance > 0) {
      gameBalance = tokenBalance.balance;
      console.log(`💰 Используем сохраненный баланс: ${gameBalance} ${activeToken.symbol}`);
    } else {
      console.log(`💰 Используем gameState.tokens: ${gameBalance} ${activeToken.symbol}`);
    }

    let workingWalletBalance = 0;
    try {
      // Инициализируем decimalService если нужно
      if (!decimalService.isInitialized) {
        await decimalService.initialize();
      }
      workingWalletBalance = await decimalService.getWorkingBalance();
    } catch (error) {
      console.warn('⚠️ Ошибка получения баланса рабочего кошелька:', error);
    }

    res.json({
      userId: userId,
      gameBalance: gameBalance,
      tokenSymbol: activeToken.symbol,
      tokenName: activeToken.name,
      workingWalletBalance: workingWalletBalance
    });

  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({ error: 'Ошибка сервера', details: error.message });
  }
});

// === СИСТЕМНАЯ ИНФОРМАЦИЯ ===

// Получить информацию о рабочем кошельке
router.get('/info', async (req, res) => {
  try {
    res.json({
      workingAddress: config.WORKING_ADDRESS,
      chainId: config.CHAIN_ID,
      rpcUrl: config.RPC_URL,
      confirmationsRequired: config.CONFIRMATIONS,
      workingBalance: await decimalService.getWorkingBalance()
    });
  } catch (error) {
    console.error('❌ Ошибка получения информации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router; 