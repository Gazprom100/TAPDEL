const { MongoClient } = require('mongodb');

function generateCleanMongoURI() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI не установлен');
  }
  return uri;
}

const MONGODB_URI = generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

async function fixEvgeniRating() {
  let client;
  
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ РЕЙТИНГА EVGENI_KRASNOV\n');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    
    // Находим пользователя
    const user = await db.collection('users').findOne({
      'profile.telegramUsername': 'Evgeni_Krasnov'
    });
    
    if (!user) {
      console.log('❌ Пользователь Evgeni_Krasnov не найден');
      return;
    }
    
    console.log('✅ Пользователь найден');
    console.log(`userId: ${user.userId}`);
    console.log(`highScore: ${user.gameState?.highScore}`);
    console.log(`lastSaved: ${user.gameState?.lastSaved}`);
    
    // Принудительно обновляем лидерборд
    const leaderboardEntry = {
      userId: user.userId,
      username: user.profile?.username || 'Evgeni_Krasnov',
      telegramId: user.profile?.telegramId,
      telegramUsername: user.profile?.telegramUsername,
      telegramFirstName: user.profile?.telegramFirstName,
      telegramLastName: user.profile?.telegramLastName,
      tokens: user.gameState?.highScore || 0,
      updatedAt: new Date()
    };
    
    console.log('');
    console.log('🏆 ОБНОВЛЕНИЕ ЛИДЕРБОРДА:');
    console.log(`Отправляем рейтинг: ${leaderboardEntry.tokens}`);
    
    await db.collection('leaderboard').updateOne(
      { userId: user.userId },
      { $set: leaderboardEntry },
      { upsert: true }
    );
    
    // Обновляем ранги
    console.log('🔄 Обновление рангов...');
    const users = await db.collection('leaderboard')
      .find()
      .sort({ tokens: -1 })
      .toArray();
    
    await Promise.all(users.map((user, index) => 
      db.collection('leaderboard').updateOne(
        { _id: user._id },
        { $set: { rank: index + 1 } }
      )
    ));
    
    // Проверяем результат
    const updatedEntry = await db.collection('leaderboard').findOne({ userId: user.userId });
    
    console.log('');
    console.log('✅ РЕЗУЛЬТАТ:');
    console.log(`rank: ${updatedEntry.rank}`);
    console.log(`tokens: ${updatedEntry.tokens}`);
    console.log(`updatedAt: ${updatedEntry.updatedAt}`);
    
    console.log('');
    console.log('🎯 ПРОБЛЕМА РЕШЕНА!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

fixEvgeniRating(); 