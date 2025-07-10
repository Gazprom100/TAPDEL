const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const router = express.Router();

// Безопасная функция форматирования имени пользователя
const formatUserName = (username, telegramFirstName, telegramLastName, telegramUsername, userId) => {
  // Проверяем что значения не null, не undefined и не строка 'null'
  const isValidValue = (value) => 
    value !== null && value !== undefined && value !== 'null' && 
    typeof value === 'string' && value.trim() !== '';

  if (isValidValue(username)) return username;
  
  if (isValidValue(telegramFirstName) && isValidValue(telegramLastName)) {
    return `${telegramFirstName} ${telegramLastName}`;
  }
  
  if (isValidValue(telegramFirstName)) return telegramFirstName;
  if (isValidValue(telegramUsername)) return telegramUsername;
  
  return `Игрок ${userId?.slice(-4) || '0000'}`;
};

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

// Health check роут
router.get('/health', async (req, res) => {
  try {
    const database = await connectToDatabase();
    const userCount = await database.collection('users').countDocuments();
    const leaderboardCount = await database.collection('leaderboard').countDocuments();
    
    res.json({
      status: 'OK',
      mongodb: 'connected',
      userCount,
      leaderboardCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      mongodb: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Тестовый роут
router.get('/test', (req, res) => {
  res.json({
    message: 'API работает!',
    timestamp: new Date().toISOString(),
    endpoint: '/api/test'
  });
});

let client = null;
let db = null;

// Инициализация подключения к MongoDB
const connectToDatabase = async () => {
  if (!client) {
    try {
      console.log('🔗 Подключение к MongoDB...');
      console.log('📍 URI маска:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
      
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      
      // Проверяем подключение
      await client.db().admin().ping();
      console.log('✅ MongoDB подключение активно');
      
      db = client.db(MONGODB_DB);
      
      // Создаем индексы
      await Promise.all([
        db.collection('users').createIndex({ userId: 1 }, { unique: true }),
        db.collection('users').createIndex({ telegramId: 1 }, { sparse: true }),
        db.collection('leaderboard').createIndex({ tokens: -1 }),
        db.collection('leaderboard').createIndex({ userId: 1 }, { unique: true }),
        db.collection('leaderboard').createIndex({ telegramId: 1 }, { sparse: true })
      ]);
      
      console.log('📊 Индексы созданы успешно');
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }
  return db;
};

// Получить пользователя
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    const user = await database.collection('users').findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Обновить пользователя
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    const database = await connectToDatabase();
    
    // Инициализируем gameBalance если его нет
    if (userData.gameBalance === undefined) {
      const existingUser = await database.collection('users').findOne({ userId });
      if (!existingUser || existingUser.gameBalance === undefined) {
        userData.gameBalance = 0;
      }
    }
    
    await database.collection('users').updateOne(
      { userId },
      { 
        $set: { 
          ...userData,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Обновить игровое состояние при депозите (для DecimalService)
router.post('/users/:userId/deposit', async (req, res) => {
  // Проверка внутреннего секрета
  if (process.env.INTERNAL_SECRET && req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    const database = await connectToDatabase();
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    console.log(`💰 Обновление игрового состояния при депозите: ${userId} +${amount} DEL`);
    
    // Получаем текущее состояние пользователя
    const user = await database.collection('users').findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Обновляем gameBalance и tokens в gameState
    const updatedGameState = {
      ...user.gameState,
      tokens: (user.gameState?.tokens || 0) + amount,
      lastSaved: new Date()
    };
    
    await database.collection('users').updateOne(
      { userId },
      {
        $set: {
          gameState: updatedGameState,
          gameBalance: (user.gameBalance || 0) + amount,
          updatedAt: new Date()
        }
      }
    );
    
    // Обновляем лидерборд
    await updateUserInLeaderboard(database, user, updatedGameState.tokens);
    
    console.log(`✅ Игровое состояние обновлено: ${userId} tokens=${updatedGameState.tokens}, gameBalance=${(user.gameBalance || 0) + amount}`);
    
    res.json({ 
      success: true,
      newTokens: updatedGameState.tokens,
      newGameBalance: (user.gameBalance || 0) + amount
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления игрового состояния при депозите:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать нового пользователя (специальный роут для новых игроков)
router.post('/users/:userId/initialize', async (req, res) => {
  try {
    const { userId } = req.params;
    const { profile, gameState, telegramData } = req.body;
    const database = await connectToDatabase();
    
    console.log(`🆕 Инициализация нового пользователя: ${userId}`);
    
    // Проверяем существует ли пользователь
    const existingUser = await database.collection('users').findOne({ userId });
    if (existingUser) {
      console.log(`⚠️ Пользователь ${userId} уже существует, обновляем данные`);
    }
    
    // Создаем полный объект пользователя
    const newUser = {
      userId: userId,
      profile: profile || {
        userId: userId,
        username: `Игрок ${userId.slice(-4)}`,
        maxEnergy: 100,
        energyRecoveryRate: 1,
        maxGear: 'M',
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
        ...telegramData
      },
      gameState: gameState || {
        tokens: 0,
        highScore: 0,
        engineLevel: 'Mk I',
        gearboxLevel: 'L1',
        batteryLevel: 'B1',
        hyperdriveLevel: 'H1',
        powerGridLevel: 'P1',
        lastSaved: new Date()
      },
      gameBalance: 0,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Сохраняем пользователя
    await database.collection('users').updateOne(
      { userId },
      { $set: newUser },
      { upsert: true }
    );
    
    // Добавляем в лидерборд
    const leaderboardEntry = {
      userId: userId,
      username: formatUserName(
        newUser.profile.username,
        newUser.profile.telegramFirstName,
        newUser.profile.telegramLastName,
        newUser.profile.telegramUsername,
        userId
      ),
      telegramId: newUser.profile.telegramId,
      telegramUsername: newUser.profile.telegramUsername,
      telegramFirstName: newUser.profile.telegramFirstName,
      telegramLastName: newUser.profile.telegramLastName,
      tokens: 0,
      rank: 1,
      updatedAt: new Date()
    };
    
    await database.collection('leaderboard').updateOne(
      { userId },
      { $set: leaderboardEntry },
      { upsert: true }
    );
    
    // Обновляем ранги
    await updateAllRanks(database);
    
    console.log(`✅ Пользователь ${userId} успешно инициализирован`);
    
    res.json({ 
      message: 'User initialized successfully',
      user: newUser,
      isNewUser: !existingUser
    });
    
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Обновить состояние игры И автоматически обновить лидерборд
router.put('/users/:userId/gamestate', async (req, res) => {
  try {
    const { userId } = req.params;
    const gameState = req.body;
    console.log(`🎮 Обновление gameState для пользователя ${userId}, токены: ${gameState.tokens}`);
    
    const database = await connectToDatabase();
    
    // Обновляем состояние игры
    const updateResult = await database.collection('users').updateOne(
      { userId },
      {
        $set: {
          'gameState': {
            ...gameState,
            lastSaved: new Date()
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Получаем обновленного пользователя для лидерборда
    const user = await database.collection('users').findOne({ userId });
    
    // Автоматически обновляем лидерборд ВСЕГДА при обновлении gameState
    // Используем highScore из gameState если есть, иначе из user данных
    if (user) {
      const ratingScore = gameState.highScore !== undefined ? gameState.highScore : user.gameState?.highScore || 0;
      console.log(`🏆 Автообновление лидерборда для ${userId} с ${ratingScore} рейтингом (текущие токены: ${gameState.tokens || 'неизвестно'})`);
      await updateUserInLeaderboard(database, user, ratingScore);
    }
    
    res.json({ message: 'Game state updated successfully' });
  } catch (error) {
    console.error('❌ Error updating game state:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Добавить транзакцию
router.post('/users/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const transaction = {
      ...req.body,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    const database = await connectToDatabase();
    
    await database.collection('users').updateOne(
      { userId },
      {
        $push: { transactions: transaction },
        $set: { updatedAt: new Date() }
      }
    );
    
    res.json({ message: 'Transaction added successfully' });
  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Получить рейтинг пользователя
router.get('/users/:userId/rank', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    const user = await database.collection('leaderboard').findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found in leaderboard' });
    }
    
    res.json({ rank: user.rank });
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Получить таблицу лидеров (обновлено для работы с токенами)
router.get('/leaderboard', async (req, res) => {
  try {
    console.log('📊 Запрос лидерборда...');
    const limit = parseInt(req.query.limit) || 100;
    const database = await connectToDatabase();
    
    console.log('🔍 Ищем пользователей в лидерборде...');
    const leaderboard = await database.collection('leaderboard')
      .find()
      .sort({ tokens: -1 }) // Сортируем по токенам вместо score
      .limit(limit)
      .toArray();
    
    console.log(`✅ Найдено ${leaderboard.length} пользователей в лидерборде`);
    
    if (leaderboard.length === 0) {
      console.log('⚠️ Лидерборд пуст, возвращаем пустой массив');
    } else {
      console.log('🏆 Топ-3:', leaderboard.slice(0, 3).map(u => `${u.telegramFirstName || u.username}: ${u.tokens}`));
    }
    
    res.json(leaderboard);
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Обновить таблицу лидеров (обновлено для работы с токенами)
router.post('/leaderboard', async (req, res) => {
  try {
    const entry = req.body;
    console.log(`🏆 API: Обновление лидерборда для ${entry.userId}:`, {
      username: entry.username,
      telegramFirstName: entry.telegramFirstName,
      telegramUsername: entry.telegramUsername,
      tokens: entry.tokens
    });
    
    const database = await connectToDatabase();
    
    // Обновляем запись пользователя (теперь с токенами)
    const result = await database.collection('leaderboard').updateOne(
      { userId: entry.userId },
      {
        $set: {
          userId: entry.userId,
          username: formatUserName(
            entry.username,
            entry.telegramFirstName,
            entry.telegramLastName,
            entry.telegramUsername,
            entry.userId
          ),
          telegramId: entry.telegramId,
          telegramUsername: entry.telegramUsername,
          telegramFirstName: entry.telegramFirstName,
          telegramLastName: entry.telegramLastName,
          tokens: entry.tokens || entry.score || 0, // Поддерживаем обратную совместимость
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log(`✅ API: Пользователь ${entry.userId} ${result.upsertedCount ? 'добавлен' : 'обновлен'} в лидерборде`);

    // Обновляем ранги для всех пользователей на основе токенов
    await updateAllRanks(database);
    
    // Проверяем результат
    const updatedUser = await database.collection('leaderboard').findOne({ userId: entry.userId });
    console.log(`🎯 API: Пользователь в лидерборде:`, {
      userId: updatedUser.userId,
      username: updatedUser.username,
      tokens: updatedUser.tokens,
      rank: updatedUser.rank
    });
    
    res.json({ message: 'Leaderboard updated successfully' });
  } catch (error) {
    console.error('❌ API: Error updating leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Сброс рейтинга (только для администратора)
router.post('/admin/reset-leaderboard', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Простая защита по ключу
    if (adminKey !== 'tapdel-reset-2025') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    
    const database = await connectToDatabase();
    
    console.log('🧹 Начинаем сброс рейтинга...');
    
    // 1. Полная очистка коллекции leaderboard
    const leaderboardResult = await database.collection('leaderboard').deleteMany({});
    console.log(`✅ Удалено ${leaderboardResult.deletedCount} записей из leaderboard`);
    
    // 2. Сброс игрового состояния всех пользователей
    const usersResult = await database.collection('users').updateMany(
      {},
      {
        $set: {
          'gameState.tokens': 0,
          'gameState.highScore': 0,
          'gameBalance': 0,
          updatedAt: new Date()
        }
      }
    );
    console.log(`✅ Обновлено ${usersResult.modifiedCount} пользователей`);
    
    // 3. Очистка транзакций
    const transactionsResult = await database.collection('users').updateMany(
      {},
      {
        $set: {
          transactions: []
        }
      }
    );
    console.log(`✅ Очищены транзакции у ${transactionsResult.modifiedCount} пользователей`);
    
    // 4. Очистка DecimalChain данных
    const depositsResult = await database.collection('deposits').deleteMany({});
    const withdrawalsResult = await database.collection('withdrawals').deleteMany({});
    console.log(`✅ Удалено ${depositsResult.deletedCount} депозитов и ${withdrawalsResult.deletedCount} выводов`);
    
    res.json({
      message: 'Рейтинг успешно сброшен',
      results: {
        leaderboardDeleted: leaderboardResult.deletedCount,
        usersReset: usersResult.modifiedCount,
        transactionsCleared: transactionsResult.modifiedCount,
        depositsDeleted: depositsResult.deletedCount,
        withdrawalsDeleted: withdrawalsResult.deletedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка сброса рейтинга:', error);
    res.status(500).json({ 
      message: 'Ошибка сброса рейтинга',
      error: error.message 
    });
  }
});

// Миграция данных пользователя
router.post('/users/:userId/migrate', async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldUserId } = req.body;
    
    if (!oldUserId || oldUserId === userId) {
      return res.status(400).json({ message: 'Invalid migration request' });
    }
    
    const database = await connectToDatabase();
    
    console.log(`🔄 Запрос миграции данных: ${oldUserId} -> ${userId}`);
    
    // Найти старого пользователя
    const oldUser = await database.collection('users').findOne({ userId: oldUserId });
    const newUser = await database.collection('users').findOne({ userId });
    
    if (!oldUser) {
      return res.status(404).json({ message: 'Old user not found' });
    }
    
    // Если новый пользователь уже существует и имеет прогресс, не мигрируем
    if (newUser && newUser.gameState && newUser.gameState.tokens > 0) {
      console.log(`⚠️ Новый пользователь уже имеет прогресс, миграция отменена`);
      return res.json({ 
        message: 'Migration skipped - new user already has progress',
        migrated: false 
      });
    }
    
    // Мигрируем данные
    const migratedUser = {
      ...oldUser,
      userId, // Обновляем ID
      updatedAt: new Date(),
      migratedFrom: oldUserId,
      migrationDate: new Date()
    };
    
    // Сохраняем мигрированного пользователя
    await database.collection('users').updateOne(
      { userId },
      { $set: migratedUser },
      { upsert: true }
    );
    
    // Мигрируем данные в лидерборде
    const oldLeaderboardEntry = await database.collection('leaderboard').findOne({ userId: oldUserId });
    if (oldLeaderboardEntry) {
      const migratedLeaderboardEntry = {
        ...oldLeaderboardEntry,
        userId,
        updatedAt: new Date()
      };
      
      await database.collection('leaderboard').updateOne(
        { userId },
        { $set: migratedLeaderboardEntry },
        { upsert: true }
      );
      
      // Удаляем старую запись из лидерборда
      await database.collection('leaderboard').deleteOne({ userId: oldUserId });
    }
    
    // Удаляем старого пользователя
    await database.collection('users').deleteOne({ userId: oldUserId });
    
    // Обновляем ранги в лидерборде
    await updateAllRanks(database);
    
    console.log(`✅ Миграция завершена: ${oldUserId} -> ${userId}`);
    
    res.json({ 
      message: 'User data migrated successfully',
      migrated: true,
      tokens: oldUser.gameState?.tokens || 0
    });
    
  } catch (error) {
    console.error('Error migrating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Вспомогательная функция для обновления пользователя в лидерборде
async function updateUserInLeaderboard(database, user, tokens) {
  try {
    const leaderboardEntry = {
      userId: user.userId,
      username: formatUserName(
        user.profile?.username, 
        user.profile?.telegramFirstName || user.telegramFirstName, 
        user.profile?.telegramLastName || user.telegramLastName, 
        user.profile?.telegramUsername || user.telegramUsername, 
        user.userId
      ),
      telegramId: user.profile?.telegramId || user.telegramId,
      telegramUsername: user.profile?.telegramUsername || user.telegramUsername,
      telegramFirstName: user.profile?.telegramFirstName || user.telegramFirstName,
      telegramLastName: user.profile?.telegramLastName || user.telegramLastName,
      tokens: tokens,
      updatedAt: new Date()
    };

    await database.collection('leaderboard').updateOne(
      { userId: user.userId },
      { $set: leaderboardEntry },
      { upsert: true }
    );

    // Обновляем ранги
    await updateAllRanks(database);
  } catch (error) {
    console.error('Error updating user in leaderboard:', error);
  }
}

// Вспомогательная функция для обновления всех рангов
async function updateAllRanks(database) {
  try {
    const users = await database.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .toArray();
    
    await Promise.all(users.map((user, index) => 
      database.collection('leaderboard').updateOne(
        { _id: user._id },
        { $set: { rank: index + 1 } }
      )
    ));
  } catch (error) {
    console.error('Error updating ranks:', error);
  }
}

// Закрытие соединения при завершении работы
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
  }
});

module.exports = router;
