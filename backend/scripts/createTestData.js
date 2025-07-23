const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

async function createTestData() {
  let client;
  
  try {
    console.log('🚀 Создание тестовых данных...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    
    // Создаем тестовых пользователей
    const testUsers = [
      {
        userId: 'test-user-1',
        profile: {
          username: 'TestUser1',
          telegramId: '123456789',
          telegramUsername: 'testuser1',
          telegramFirstName: 'Test',
          telegramLastName: 'User1'
        },
        gameState: {
          tokens: 1500.5,
          highScore: 1500.5,
          lastSaved: new Date()
        },
        updatedAt: new Date()
      },
      {
        userId: 'test-user-2',
        profile: {
          username: 'TestUser2',
          telegramId: '987654321',
          telegramUsername: 'testuser2',
          telegramFirstName: 'Test',
          telegramLastName: 'User2'
        },
        gameState: {
          tokens: 2300.75,
          highScore: 2300.75,
          lastSaved: new Date()
        },
        updatedAt: new Date()
      },
      {
        userId: 'test-user-3',
        profile: {
          username: 'TestUser3',
          telegramId: '555666777',
          telegramUsername: 'testuser3',
          telegramFirstName: 'Test',
          telegramLastName: 'User3'
        },
        gameState: {
          tokens: 800.25,
          highScore: 800.25,
          lastSaved: new Date()
        },
        updatedAt: new Date()
      },
      {
        userId: 'test-user-4',
        profile: {
          username: 'TestUser4',
          telegramId: '111222333',
          telegramUsername: 'testuser4',
          telegramFirstName: 'Test',
          telegramLastName: 'User4'
        },
        gameState: {
          tokens: 3200.0,
          highScore: 3200.0,
          lastSaved: new Date()
        },
        updatedAt: new Date()
      },
      {
        userId: 'test-user-5',
        profile: {
          username: 'TestUser5',
          telegramId: '444555666',
          telegramUsername: 'testuser5',
          telegramFirstName: 'Test',
          telegramLastName: 'User5'
        },
        gameState: {
          tokens: 950.125,
          highScore: 950.125,
          lastSaved: new Date()
        },
        updatedAt: new Date()
      }
    ];
    
    // Очищаем существующие данные
    await db.collection('users').deleteMany({});
    await db.collection('leaderboard').deleteMany({});
    
    // Добавляем тестовых пользователей
    await db.collection('users').insertMany(testUsers);
    console.log('✅ Добавлено 5 тестовых пользователей');
    
    // Создаем лидерборд
    const leaderboardEntries = testUsers.map((user, index) => ({
      userId: user.userId,
      username: user.profile.username,
      telegramId: user.profile.telegramId,
      telegramUsername: user.profile.telegramUsername,
      telegramFirstName: user.profile.telegramFirstName,
      telegramLastName: user.profile.telegramLastName,
      tokens: user.gameState.highScore,
      rank: index + 1,
      updatedAt: new Date()
    }));
    
    // Сортируем по токенам (убывание)
    leaderboardEntries.sort((a, b) => b.tokens - a.tokens);
    
    // Обновляем ранги
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    await db.collection('leaderboard').insertMany(leaderboardEntries);
    console.log('✅ Создан лидерборд с 5 участниками');
    
    // Создаем индексы для оптимизации
    await db.collection('leaderboard').createIndex({ tokens: -1 });
    await db.collection('leaderboard').createIndex({ userId: 1 });
    await db.collection('leaderboard').createIndex({ updatedAt: -1 });
    console.log('✅ Созданы индексы для оптимизации');
    
    // Проверяем результат
    const userCount = await db.collection('users').countDocuments();
    const leaderboardCount = await db.collection('leaderboard').countDocuments();
    
    console.log('');
    console.log('📊 РЕЗУЛЬТАТ:');
    console.log(`Пользователей: ${userCount}`);
    console.log(`Записей в лидерборде: ${leaderboardCount}`);
    
    const top3 = await db.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .limit(3)
      .toArray();
    
    console.log('');
    console.log('🏆 Топ-3:');
    top3.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}: ${user.tokens} DEL (ранг: ${user.rank})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

createTestData(); 