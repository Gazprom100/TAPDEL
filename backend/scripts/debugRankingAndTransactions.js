const { MongoClient } = require('mongodb');
const tokenService = require('../services/tokenService');

// Конфигурация MongoDB
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

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(MONGODB_DB);
}

async function debugRankingAndTransactions() {
  console.log('🔍 Диагностика проблем с рейтингом и транзакциями...\n');
  
  try {
    const database = await connectToDatabase();
    
    // 1. Проверяем активный токен
    console.log('1️⃣ Проверка активного токена:');
    const activeToken = await tokenService.getActiveToken();
    console.log(`   Активный токен: ${activeToken.symbol} (${activeToken.address})`);
    console.log(`   Decimals: ${activeToken.decimals}`);
    console.log(`   Название: ${activeToken.name}\n`);
    
    // 2. Проверяем количество пользователей
    console.log('2️⃣ Статистика пользователей:');
    const userCount = await database.collection('users').countDocuments();
    const usersWithTokens = await database.collection('users').countDocuments({
      'gameState.tokens': { $gt: 0 }
    });
    console.log(`   Всего пользователей: ${userCount}`);
    console.log(`   Пользователей с токенами: ${usersWithTokens}\n`);
    
    // 3. Проверяем лидерборд
    console.log('3️⃣ Проверка лидерборда:');
    const leaderboardCount = await database.collection('leaderboard').countDocuments();
    const topUsers = await database.collection('leaderboard')
      .find({})
      .sort({ tokens: -1 })
      .limit(10)
      .toArray();
    
    console.log(`   Записей в лидерборде: ${leaderboardCount}`);
    console.log('   Топ-10 пользователей:');
    topUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username || user.userId} - ${user.tokens} токенов`);
    });
    console.log('');
    
    // 4. Проверяем транзакции
    console.log('4️⃣ Проверка транзакций:');
    const depositsCount = await database.collection('deposits').countDocuments();
    const withdrawalsCount = await database.collection('withdrawals').countDocuments();
    const pendingDeposits = await database.collection('deposits').countDocuments({ matched: false });
    const pendingWithdrawals = await database.collection('withdrawals').countDocuments({ status: 'queued' });
    
    console.log(`   Всего депозитов: ${depositsCount}`);
    console.log(`   Ожидающих депозитов: ${pendingDeposits}`);
    console.log(`   Всего выводов: ${withdrawalsCount}`);
    console.log(`   Ожидающих выводов: ${pendingWithdrawals}\n`);
    
    // 5. Проверяем проблемы с подключением
    console.log('5️⃣ Проверка подключений:');
    
    // Тест MongoDB
    try {
      await database.admin().ping();
      console.log('   ✅ MongoDB: подключение активно');
    } catch (error) {
      console.log('   ❌ MongoDB: ошибка подключения');
      console.log(`   Ошибка: ${error.message}`);
    }
    
    // Тест Redis (если есть)
    try {
      const redis = require('../services/upstashRedisService');
      const pong = await redis.ping();
      console.log(`   ✅ Redis: подключение активно (${pong})`);
    } catch (error) {
      console.log('   ⚠️ Redis: недоступен (не критично)');
    }
    
    console.log('');
    
    // 6. Проверяем индексы
    console.log('6️⃣ Проверка индексов:');
    try {
      const indexes = await database.collection('leaderboard').indexes();
      console.log('   Индексы лидерборда:');
      indexes.forEach(index => {
        console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    } catch (error) {
      console.log('   ❌ Ошибка получения индексов');
    }
    
    console.log('');
    
    // 7. Проверяем последние ошибки
    console.log('7️⃣ Последние ошибки в логах:');
    console.log('   (Проверьте логи сервера для деталей)');
    
    // 8. Рекомендации
    console.log('\n8️⃣ Рекомендации:');
    
    if (pendingDeposits > 0) {
      console.log('   ⚠️ Есть ожидающие депозиты - проверьте мониторинг блоков');
    }
    
    if (pendingWithdrawals > 0) {
      console.log('   ⚠️ Есть ожидающие выводы - проверьте withdrawal worker');
    }
    
    if (leaderboardCount === 0) {
      console.log('   ⚠️ Лидерборд пуст - возможно проблема с обновлением рангов');
    }
    
    if (usersWithTokens === 0) {
      console.log('   ⚠️ Нет пользователей с токенами - проверьте игровую логику');
    }
    
    console.log('\n✅ Диагностика завершена');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    process.exit(0);
  }
}

// Запуск диагностики
debugRankingAndTransactions(); 