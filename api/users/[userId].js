const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

// Database configuration
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%25sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

let client = null;
let db = null;

// Инициализация подключения к MongoDB
const connectToDatabase = async () => {
  if (!client) {
    try {
      console.log('🔗 Подключение к MongoDB...');
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log('✅ MongoDB подключен');
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }
  return db;
};

// Безопасная функция форматирования имени пользователя
const formatUserName = (username, telegramFirstName, telegramLastName, telegramUsername, userId) => {
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

// GET /api/users/[userId]
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const database = await connectToDatabase();
    
    if (!database) {
      console.error('❌ База данных недоступна');
      return res.status(503).json({ message: 'Database unavailable' });
    }
    
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

// PUT /api/users/[userId]
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    const database = await connectToDatabase();
    
    if (!database) {
      console.error('❌ База данных недоступна');
      return res.status(503).json({ message: 'Database unavailable' });
    }
    
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

// POST /api/users/[userId]/initialize
app.post('/api/users/:userId/initialize', async (req, res) => {
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

// PUT /api/users/[userId]/gamestate
app.put('/api/users/:userId/gamestate', async (req, res) => {
  try {
    const { userId } = req.params;
    const gameState = req.body;
    console.log(`🎮 Обновление gameState для пользователя ${userId}, токены: ${gameState.tokens}`);
    
    const database = await connectToDatabase();
    
    if (!database) {
      console.error('❌ База данных недоступна');
      return res.status(503).json({ message: 'Database unavailable' });
    }
    
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

    res.json({ message: 'Game state updated successfully' });
  } catch (error) {
    console.error('❌ Error updating game state:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = app;
