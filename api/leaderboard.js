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

// GET /api/leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    console.log('📊 Запрос лидерборда...');
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    
    const database = await connectToDatabase();
    
    if (!database) {
      console.error('❌ База данных недоступна');
      return res.status(503).json({ message: 'Database unavailable' });
    }
    
    console.log('🔍 Ищем пользователей в лидерборде...');
    const skip = (page - 1) * limit;
    const leaderboard = await database.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .skip(skip)
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

// POST /api/leaderboard
app.post('/api/leaderboard', async (req, res) => {
  try {
    const entry = req.body;
    console.log(`🏆 API: Обновление лидерборда для ${entry.userId}:`, {
      username: entry.username,
      telegramFirstName: entry.telegramFirstName,
      telegramUsername: entry.telegramUsername,
      tokens: entry.tokens
    });
    
    const database = await connectToDatabase();
    
    if (!database) {
      console.error('❌ База данных недоступна');
      return res.status(503).json({ message: 'Database unavailable' });
    }
    
    // Обновляем запись пользователя
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
          tokens: entry.tokens || entry.score || 0,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log(`✅ API: Пользователь ${entry.userId} ${result.upsertedCount ? 'добавлен' : 'обновлен'} в лидерборде`);

    // Обновляем ранги для всех пользователей
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

module.exports = app;
