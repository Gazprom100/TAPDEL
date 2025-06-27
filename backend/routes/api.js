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
      db.collection('leaderboard').createIndex({ score: -1 }),
      db.collection('leaderboard').createIndex({ userId: 1 }, { unique: true })
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

// Обновить состояние игры
router.put('/users/:userId/gamestate', async (req, res) => {
  try {
    const { userId } = req.params;
    const gameState = req.body;
    const database = await connectToDatabase();
    
    await database.collection('users').updateOne(
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

// Получить таблицу лидеров
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const database = await connectToDatabase();
    
    const leaderboard = await database.collection('leaderboard')
      .find()
      .sort({ score: -1 })
      .limit(limit)
      .toArray();
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Обновить таблицу лидеров
router.post('/leaderboard', async (req, res) => {
  try {
    const entry = req.body;
    const database = await connectToDatabase();
    
    // Обновляем счет пользователя
    await database.collection('leaderboard').updateOne(
      { userId: entry.userId },
      {
        $set: {
          ...entry,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Обновляем ранги для всех пользователей
    const users = await database.collection('leaderboard').find().sort({ score: -1 }).toArray();
    
    await Promise.all(users.map((user, index) => 
      database.collection('leaderboard').updateOne(
        { _id: user._id },
        { $set: { rank: index + 1 } }
      )
    ));
    
    res.json({ message: 'Leaderboard updated successfully' });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Закрытие соединения при завершении работы
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
  }
});

module.exports = router; 