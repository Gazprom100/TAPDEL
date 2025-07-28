const { MongoClient } = require('mongodb');

// Подключение к MongoDB
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

async function testAdminFunctions() {
  let client;
  
  try {
    console.log('🔍 Тестирование функций админки...');
    
    // Подключаемся к базе данных
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('✅ Подключение к MongoDB успешно');
    
    // 1. Тест статистики
    console.log('\n📊 Тест статистики:');
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`- Всего пользователей: ${totalUsers}`);
    
    const users = await db.collection('users').find({}, { projection: { 'gameState.tokens': 1 } }).toArray();
    const totalTokens = users.reduce((sum, u) => sum + (u.gameState?.tokens || 0), 0);
    console.log(`- Общий баланс токенов: ${totalTokens}`);
    
    const totalDeposits = await db.collection('deposits').countDocuments();
    console.log(`- Всего депозитов: ${totalDeposits}`);
    
    const totalWithdrawals = await db.collection('withdrawals').countDocuments();
    console.log(`- Всего выводов: ${totalWithdrawals}`);
    
    // 2. Тест токенов
    console.log('\n🪙 Тест токенов:');
    const tokenConfig = await db.collection('system_config').findOne({ key: 'tokens' });
    if (tokenConfig && tokenConfig.value) {
      console.log(`- Найдено токенов: ${tokenConfig.value.length}`);
      const activeToken = tokenConfig.value.find(t => t.isActive);
      console.log(`- Активный токен: ${activeToken?.symbol || 'нет'}`);
    } else {
      console.log('- Конфигурация токенов не найдена');
    }
    
    // 3. Тест пользователей
    console.log('\n👥 Тест пользователей:');
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log(`- Примеры пользователей:`);
    sampleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.userId} - ${user.profile?.username || 'Без имени'} - ${user.gameState?.tokens || 0} токенов`);
    });
    
    // 4. Тест транзакций
    console.log('\n💰 Тест транзакций:');
    const recentDeposits = await db.collection('deposits').find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log(`- Последние депозиты:`);
    recentDeposits.forEach((deposit, index) => {
      console.log(`  ${index + 1}. ${deposit.userId} - ${deposit.amountRequested} - ${deposit.status}`);
    });
    
    const recentWithdrawals = await db.collection('withdrawals').find({}).sort({ requestedAt: -1 }).limit(3).toArray();
    console.log(`- Последние выводы:`);
    recentWithdrawals.forEach((withdrawal, index) => {
      console.log(`  ${index + 1}. ${withdrawal.userId} - ${withdrawal.amount} - ${withdrawal.status}`);
    });
    
    // 5. Тест лидерборда
    console.log('\n🏆 Тест лидерборда:');
    const leaderboard = await db.collection('leaderboard').find({}).sort({ tokens: -1 }).limit(5).toArray();
    console.log(`- Топ 5 игроков:`);
    leaderboard.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.username} - ${entry.tokens} токенов`);
    });
    
    // 6. Тест истории токенов
    console.log('\n📜 Тест истории токенов:');
    const tokenHistory = await db.collection('token_history').find({}).sort({ changedAt: -1 }).limit(3).toArray();
    console.log(`- Последние изменения токенов:`);
    tokenHistory.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.symbol} - ${entry.reason} - ${new Date(entry.changedAt).toLocaleString()}`);
    });
    
    console.log('\n✅ Все тесты завершены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Запускаем тесты
testAdminFunctions(); 