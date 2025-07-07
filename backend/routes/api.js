const express = require('express');
const { MongoClient } = require('mongodb');
const router = express.Router();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

let client = null;
let db = null;

// Инициализация подключения к MongoDB
const connectToDatabase = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB);
    
    // Создаем индексы
    await Promise.all([
      db.collection('users').createIndex({ userId: 1 }, { unique: true }),
      db.collection('users').createIndex({ telegramId: 1 }, { sparse: true }),
      db.collection('leaderboard').createIndex({ tokens: -1 }),
      db.collection('leaderboard').createIndex({ userId: 1 }, { unique: true }),
      db.collection('leaderboard').createIndex({ telegramId: 1 }, { sparse: true })
    ]);
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

// Обновить состояние игры И автоматически обновить лидерборд
router.put('/users/:userId/gamestate', async (req, res) => {
  try {
    const { userId } = req.params;
    const gameState = req.body;
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
    
    // Автоматически обновляем лидерборд если есть токены
    if (user && gameState.tokens !== undefined) {
      await updateUserInLeaderboard(database, user, gameState.tokens);
    }
    
    res.json({ message: 'Game state updated successfully' });
  } catch (error) {
    console.error('Error updating game state:', error);
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
    const limit = parseInt(req.query.limit) || 100;
    const database = await connectToDatabase();
    
    const leaderboard = await database.collection('leaderboard')
      .find()
      .sort({ tokens: -1 }) // Сортируем по токенам вместо score
      .limit(limit)
      .toArray();
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Обновить таблицу лидеров (обновлено для работы с токенами)
router.post('/leaderboard', async (req, res) => {
  try {
    const entry = req.body;
    const database = await connectToDatabase();
    
    // Обновляем запись пользователя (теперь с токенами)
    await database.collection('leaderboard').updateOne(
      { userId: entry.userId },
      {
        $set: {
          userId: entry.userId,
          username: entry.username || `Игрок ${entry.userId.slice(-4)}`,
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

    // Обновляем ранги для всех пользователей на основе токенов
    await updateAllRanks(database);
    
    res.json({ message: 'Leaderboard updated successfully' });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Вспомогательная функция для обновления пользователя в лидерборде
async function updateUserInLeaderboard(database, user, tokens) {
  try {
    const leaderboardEntry = {
      userId: user.userId,
      username: user.profile?.username || user.telegramFirstName || `Игрок ${user.userId.slice(-4)}`,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
      telegramLastName: user.telegramLastName,
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