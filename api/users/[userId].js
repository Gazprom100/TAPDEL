const { MongoClient } = require('mongodb');
require('dotenv').config();

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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const database = client.db(MONGODB_DB);
    
    // Извлекаем userId из URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];
    
    if (req.method === 'GET') {
      const user = await database.collection('users').findOne({ userId });
      
      if (!user) {
        await client.close();
        return res.status(404).json({ message: 'User not found' });
      }
      
      await client.close();
      res.json(user);
    } else if (req.method === 'PUT') {
      const userData = req.body;
      
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
      
      await client.close();
      res.json({ message: 'User updated successfully' });
    } else if (req.method === 'POST' && url.pathname.includes('/initialize')) {
      const { profile, gameState, telegramData } = req.body;
      
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
      
      await client.close();
      res.json({ 
        message: 'User initialized successfully',
        user: newUser,
        isNewUser: !existingUser
      });
    } else if (req.method === 'PUT' && url.pathname.includes('/gamestate')) {
      const gameState = req.body;
      console.log(`🎮 Обновление gameState для пользователя ${userId}, токены: ${gameState.tokens}`);
      
      // Обновляем состояние игры
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

      await client.close();
      res.json({ message: 'Game state updated successfully' });
    } else {
      await client.close();
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in users API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
