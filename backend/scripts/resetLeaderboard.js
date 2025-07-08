const { MongoClient } = require('mongodb');

// Генерируем чистый MongoDB URI
function generateCleanMongoURI() {
  const originalUri = process.env.MONGODB_URI;
  if (!originalUri) {
    throw new Error('MONGODB_URI не установлен');
  }

  let cleanUri = originalUri;
  
  // Убираем параметры которые могут вызывать проблемы
  const problematicParams = [
    'retryWrites=true',
    'w=majority',
    'journal=true',
    'readPreference=primary'
  ];
  
  problematicParams.forEach(param => {
    cleanUri = cleanUri.replace(new RegExp(`[&?]${param}`, 'g'), '');
  });
  
  // Очищаем лишние символы
  cleanUri = cleanUri.replace(/[&?]+$/, '');
  cleanUri = cleanUri.replace(/\?&/, '?');
  
  return cleanUri;
}

const MONGODB_URI = generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

async function resetLeaderboard() {
  let client;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    
    console.log('🧹 Очистка рейтинга...');
    
    // 1. Полная очистка коллекции leaderboard
    const leaderboardResult = await db.collection('leaderboard').deleteMany({});
    console.log(`✅ Удалено ${leaderboardResult.deletedCount} записей из leaderboard`);
    
    // 2. Сброс игрового состояния всех пользователей
    console.log('🔄 Сброс игрового состояния пользователей...');
    const usersResult = await db.collection('users').updateMany(
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
    
    // 3. Очистка транзакций (опционально)
    console.log('🧹 Очистка транзакций...');
    const transactionsResult = await db.collection('users').updateMany(
      {},
      {
        $set: {
          transactions: []
        }
      }
    );
    console.log(`✅ Очищены транзакции у ${transactionsResult.modifiedCount} пользователей`);
    
    // 4. Очистка DecimalChain данных (депозиты и выводы)
    console.log('🧹 Очистка DecimalChain данных...');
    const depositsResult = await db.collection('deposits').deleteMany({});
    const withdrawalsResult = await db.collection('withdrawals').deleteMany({});
    console.log(`✅ Удалено ${depositsResult.deletedCount} депозитов`);
    console.log(`✅ Удалено ${withdrawalsResult.deletedCount} выводов`);
    
    // 5. Создание тестовых данных (опционально)
    console.log('📊 Создание начальных тестовых данных...');
    
    const testUsers = [
      {
        userId: 'demo-user-main',
        username: 'Евгений',
        telegramFirstName: 'Евгений',
        telegramLastName: 'Краснов',
        telegramUsername: 'evgenik',
        tokens: 0
      }
    ];
    
    for (const user of testUsers) {
      await db.collection('leaderboard').updateOne(
        { userId: user.userId },
        {
          $set: {
            ...user,
            rank: 1,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }
    
    // 6. Пересчет рангов
    console.log('🔢 Пересчет рангов...');
    const users = await db.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .toArray();
    
    for (let i = 0; i < users.length; i++) {
      await db.collection('leaderboard').updateOne(
        { _id: users[i]._id },
        { $set: { rank: i + 1 } }
      );
    }
    
    console.log('✅ Рейтинг полностью сброшен и готов к новым данным!');
    console.log('🎮 Все пользователи начинают с 0 DEL');
    
  } catch (error) {
    console.error('❌ Ошибка сброса рейтинга:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔐 Соединение с MongoDB закрыто');
    }
  }
}

// Запускаем скрипт
resetLeaderboard(); 