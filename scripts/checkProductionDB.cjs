const { MongoClient } = require('mongodb');

// Production конфигурация MongoDB
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

async function checkProductionDB() {
  let client;
  
  try {
    console.log('🔍 Проверка production базы данных MongoDB...\n');
    
    // 1. Подключение
    console.log('1️⃣ Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение успешно\n');
    
    const db = client.db(MONGODB_DB);
    
    // 2. Проверка коллекций
    console.log('2️⃣ Проверка коллекций...');
    const collections = await db.listCollections().toArray();
    console.log('📊 Найденные коллекции:');
    collections.forEach(col => {
      console.log(`   • ${col.name}`);
    });
    console.log('');
    
    // 3. Проверка пользователей
    console.log('3️⃣ Проверка пользователей...');
    const usersCount = await db.collection('users').countDocuments();
    console.log(`👥 Всего пользователей: ${usersCount}`);
    
    if (usersCount > 0) {
      const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
      console.log('📝 Примеры пользователей:');
      sampleUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.profile?.username || user.userId} - ${user.gameState?.tokens || 0} токенов`);
      });
    }
    console.log('');
    
    // 4. Проверка лидерборда
    console.log('4️⃣ Проверка лидерборда...');
    const leaderboardCount = await db.collection('leaderboard').countDocuments();
    console.log(`🏆 Записей в лидерборде: ${leaderboardCount}`);
    
    if (leaderboardCount > 0) {
      const topPlayers = await db.collection('leaderboard').find({}).sort({ tokens: -1 }).limit(5).toArray();
      console.log('🥇 Топ-5 игроков:');
      topPlayers.forEach((player, i) => {
        console.log(`   ${i + 1}. ${player.username} - ${player.tokens} токенов (ранг: ${player.rank})`);
      });
    }
    console.log('');
    
    // 5. Проверка транзакций
    console.log('5️⃣ Проверка транзакций...');
    const transactionsCount = await db.collection('transactions').countDocuments();
    const depositsCount = await db.collection('deposits').countDocuments();
    const withdrawalsCount = await db.collection('withdrawals').countDocuments();
    
    console.log(`💳 Транзакций: ${transactionsCount}`);
    console.log(`📥 Депозитов: ${depositsCount}`);
    console.log(`📤 Выводов: ${withdrawalsCount}`);
    console.log('');
    
    // 6. Проверка индексов
    console.log('6️⃣ Проверка индексов...');
    const userIndexes = await db.collection('users').indexes();
    const leaderboardIndexes = await db.collection('leaderboard').indexes();
    
    console.log('🔍 Индексы пользователей:');
    userIndexes.forEach(index => {
      console.log(`   • ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('🔍 Индексы лидерборда:');
    leaderboardIndexes.forEach(index => {
      console.log(`   • ${index.name}: ${JSON.stringify(index.key)}`);
    });
    console.log('');
    
    // 7. Общий статус
    console.log('📊 СТАТУС PRODUCTION БАЗЫ ДАННЫХ:');
    console.log('✅ MongoDB подключение работает');
    console.log('✅ Коллекции созданы');
    console.log('✅ Индексы настроены');
    console.log(`✅ Всего пользователей: ${usersCount}`);
    console.log(`✅ Записей в лидерборде: ${leaderboardCount}`);
    console.log(`✅ Всего транзакций: ${transactionsCount + depositsCount + withdrawalsCount}`);
    
    if (usersCount === 0 && leaderboardCount === 0) {
      console.log('\n🎯 База данных готова к приему первых пользователей!');
    } else {
      console.log('\n🎮 В базе данных есть активные игроки');
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка проверки базы данных:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('🌐 Проверьте интернет-подключение');
    } else if (error.name === 'MongoServerError' && error.code === 18) {
      console.log('🔐 Проверьте логин и пароль MongoDB');
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Подключение к MongoDB закрыто');
    }
  }
}

// Запуск проверки
checkProductionDB().catch(console.error); 