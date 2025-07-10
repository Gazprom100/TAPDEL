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

async function checkEvgeni() {
  let client;
  
  try {
    console.log('🔍 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ EVGENI_KRASNOV\n');
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
    
    console.log('✅ Пользователь найден!');
    console.log(`userId: ${user.userId}`);
    console.log(`telegramUsername: ${user.profile?.telegramUsername}`);
    console.log(`username: ${user.profile?.username}`);
    console.log('');
    
    console.log('💰 БАЛАНСЫ:');
    console.log(`tokens: ${user.gameState?.tokens || 0}`);
    console.log(`gameBalance: ${user.gameBalance || 0}`);
    console.log(`highScore: ${user.gameState?.highScore || 0}`);
    console.log('');
    
    console.log('💳 ТРАНЗАКЦИИ:');
    const transactions = user.transactions || [];
    console.log(`Количество: ${transactions.length}`);
    if (transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`  ${i+1}. ${tx.type}: ${tx.amount} DEL (${new Date(tx.timestamp).toLocaleString()})`);
      });
    }
    console.log('');
    
    // Проверяем лидерборд
    console.log('🏆 ЛИДЕРБОРД:');
    const leaderboardEntry = await db.collection('leaderboard').findOne({ userId: user.userId });
    if (leaderboardEntry) {
      console.log(`rank: ${leaderboardEntry.rank}`);
      console.log(`tokens (rating): ${leaderboardEntry.tokens}`);
      console.log(`username: ${leaderboardEntry.username}`);
      console.log(`updatedAt: ${leaderboardEntry.updatedAt}`);
    } else {
      console.log('❌ Не найден в лидерборде');
    }
    console.log('');
    
    // Анализ проблемы
    console.log('🔬 АНАЛИЗ ПРОБЛЕМЫ:');
    const tokens = user.gameState?.tokens || 0;
    const highScore = user.gameState?.highScore || 0;
    const leaderboardScore = leaderboardEntry?.tokens || 0;
    
    console.log(`tokens (игровые): ${tokens}`);
    console.log(`highScore (рейтинг): ${highScore}`);
    console.log(`leaderboard.tokens: ${leaderboardScore}`);
    
    if (Math.abs(highScore - leaderboardScore) > 0.001) {
      console.log('❌ ПРОБЛЕМА: highScore не соответствует лидерборду');
      console.log(`Разница: ${Math.abs(highScore - leaderboardScore)}`);
    } else {
      console.log('✅ Рейтинг синхронизирован');
    }
    
    // Проверяем когда последний раз обновлялся
    console.log('');
    console.log('⏰ ВРЕМЯ ОБНОВЛЕНИЯ:');
    console.log(`gameState.lastSaved: ${user.gameState?.lastSaved}`);
    if (leaderboardEntry) {
      console.log(`leaderboard.updatedAt: ${leaderboardEntry.updatedAt}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkEvgeni(); 