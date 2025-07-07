const { MongoClient } = require('mongodb');

// Используем правильные учетные данные MongoDB
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  const encodedPassword = encodeURIComponent(password);
  return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = generateCleanMongoURI();
const MONGODB_DB = 'tapdel';

async function addCurrentUser() {
  let client;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const leaderboardCollection = db.collection('leaderboard');
    
    console.log('👤 Поиск всех пользователей без записей в лидерборде...');
    
    // Найти всех пользователей
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`📊 Найдено пользователей в базе: ${allUsers.length}`);
    
    for (const user of allUsers) {
      // Проверить есть ли уже в лидерборде
      const existingEntry = await leaderboardCollection.findOne({ userId: user.userId });
      
      if (!existingEntry) {
        // Добавить в лидерборд
        const tokens = user.gameState?.tokens || 0;
        const newEntry = {
          userId: user.userId,
          username: user.profile?.telegramFirstName || user.profile?.telegramUsername || user.profile?.username || `Игрок ${user.userId.slice(-4)}`,
          telegramId: user.profile?.telegramId,
          telegramUsername: user.profile?.telegramUsername,
          telegramFirstName: user.profile?.telegramFirstName,
          telegramLastName: user.profile?.telegramLastName,
          tokens: tokens,
          rank: 0, // будет пересчитан
          updatedAt: new Date()
        };
        
        await leaderboardCollection.insertOne(newEntry);
        console.log(`✅ Добавлен в лидерборд: ${newEntry.username} с ${tokens} токенами`);
      } else {
        console.log(`⚪ Уже в лидерборде: ${existingEntry.username}`);
      }
    }
    
    // Пересчитать ранги
    console.log('🔄 Пересчёт рангов...');
    const allLeaderboard = await leaderboardCollection.find().sort({ tokens: -1 }).toArray();
    
    for (let i = 0; i < allLeaderboard.length; i++) {
      await leaderboardCollection.updateOne(
        { _id: allLeaderboard[i]._id },
        { $set: { rank: i + 1 } }
      );
    }
    
    // Показать обновлённый топ-10
    const top10 = await leaderboardCollection
      .find()
      .sort({ tokens: -1 })
      .limit(10)
      .toArray();
      
    console.log(`\n🏆 ОБНОВЛЁННЫЙ ТОП-10:`);
    top10.forEach((user, index) => {
      const displayName = user.telegramFirstName || user.telegramUsername || user.username;
      console.log(`${index + 1}. ${displayName} - ${user.tokens} токенов`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Соединение закрыто');
    }
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  addCurrentUser()
    .then(() => {
      console.log('\n✅ Добавление пользователей в лидерборд завершено!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { addCurrentUser }; 