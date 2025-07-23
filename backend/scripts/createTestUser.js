const { MongoClient } = require('mongodb');

async function createTestUser() {
  console.log('👤 Создание тестового пользователя');
  console.log('================================');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapdel';
  
  try {
    // Подключаемся к MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение к MongoDB установлено');
    
    const database = client.db();
    
    // Создаем тестового пользователя
    const testUserId = 'telegram-123456789';
    const testUser = {
      userId: testUserId,
      profile: {
        userId: testUserId,
        username: 'Test User',
        maxEnergy: 100,
        energyRecoveryRate: 1,
        maxGear: 'M',
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
        telegramId: '123456789',
        telegramUsername: 'testuser',
        telegramFirstName: 'Test',
        telegramLastName: 'User',
        chatId: 123456789
      },
      gameState: {
        tokens: 100, // Даем немного токенов для тестирования
        highScore: 0,
        engineLevel: 'Mk I',
        gearboxLevel: 'L1',
        batteryLevel: 'B1',
        hyperdriveLevel: 'H1',
        powerGridLevel: 'P1',
        lastSaved: new Date()
      },
      gameBalance: 100,
      transactions: [],
      updatedAt: new Date(),
      botInteraction: {
        firstInteraction: new Date(),
        lastSeen: new Date(),
        chatId: 123456789
      }
    };
    
    // Сохраняем пользователя
    const userResult = await database.collection('users').updateOne(
      { userId: testUserId },
      { $set: testUser },
      { upsert: true }
    );
    
    console.log(`✅ Пользователь ${testUserId} ${userResult.upsertedCount ? 'создан' : 'обновлен'}`);
    
    // Добавляем в лидерборд
    const leaderboardEntry = {
      userId: testUserId,
      username: 'Test User',
      telegramId: '123456789',
      telegramUsername: 'testuser',
      telegramFirstName: 'Test',
      telegramLastName: 'User',
      tokens: 100,
      rank: 1,
      updatedAt: new Date()
    };
    
    const leaderboardResult = await database.collection('leaderboard').updateOne(
      { userId: testUserId },
      { $set: leaderboardEntry },
      { upsert: true }
    );
    
    console.log(`✅ Лидерборд ${testUserId} ${leaderboardResult.upsertedCount ? 'создан' : 'обновлен'}`);
    
    // Проверяем создание
    const savedUser = await database.collection('users').findOne({ userId: testUserId });
    const savedLeaderboard = await database.collection('leaderboard').findOne({ userId: testUserId });
    
    console.log('\n📋 ПРОВЕРКА СОЗДАННОГО ПОЛЬЗОВАТЕЛЯ:');
    console.log(`User ID: ${savedUser?.userId}`);
    console.log(`Username: ${savedUser?.profile?.username}`);
    console.log(`Tokens: ${savedUser?.gameState?.tokens}`);
    console.log(`Telegram ID: ${savedUser?.profile?.telegramId}`);
    console.log(`Leaderboard Rank: ${savedLeaderboard?.rank}`);
    
    // Обновляем ранги
    const allUsers = await database.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .toArray();
    
    await Promise.all(allUsers.map((user, index) => 
      database.collection('leaderboard').updateOne(
        { _id: user._id },
        { $set: { rank: index + 1 } }
      )
    ));
    
    console.log('✅ Ранги обновлены');
    
    await client.close();
    console.log('🔌 Подключение к MongoDB закрыто');
    
    console.log('\n🎉 Тестовый пользователь создан успешно!');
    console.log('\n📋 ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ:');
    console.log(`User ID: ${testUserId}`);
    console.log(`Tokens: 100 DEL`);
    console.log(`Telegram ID: 123456789`);
    
    return testUserId;
    
  } catch (error) {
    console.error('❌ Ошибка создания тестового пользователя:', error);
    return null;
  }
}

// Запускаем создание если скрипт вызван напрямую
if (require.main === module) {
  createTestUser()
    .then(userId => {
      if (userId) {
        console.log('\n🎉 Тестовый пользователь создан!');
        console.log(`ID: ${userId}`);
        process.exit(0);
      } else {
        console.log('\n💥 Ошибка создания тестового пользователя!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser }; 