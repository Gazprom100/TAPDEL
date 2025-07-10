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

async function fixAllBalances() {
  let client;
  
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ БАЛАНСОВ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ\n');
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`📊 Найдено пользователей: ${users.length}\n`);
    
    let fixedCount = 0;
    let totalTokensBefore = 0;
    let totalGameBalanceBefore = 0;
    let totalTokensAfter = 0;
    let totalGameBalanceAfter = 0;
    
    for (const user of users) {
      const tokens = user.gameState?.tokens || 0;
      const gameBalance = user.gameBalance || 0;
      const highScore = user.gameState?.highScore || 0;
      
      totalTokensBefore += tokens;
      totalGameBalanceBefore += gameBalance;
      
      const hasMismatch = Math.abs(tokens - gameBalance) > 0.001;
      
      if (hasMismatch) {
        console.log(`🔧 Исправляем ${user.profile?.telegramUsername || user.profile?.username || user.userId}:`);
        console.log(`   tokens: ${tokens.toFixed(3)} → gameBalance: ${tokens.toFixed(3)}`);
        
        await db.collection('users').updateOne(
          { userId: user.userId },
          { $set: { gameBalance: tokens } }
        );
        
        fixedCount++;
      } else {
        console.log(`✅ ${user.profile?.telegramUsername || user.profile?.username || user.userId}: OK`);
      }
    }
    
    // Проверяем результат
    const updatedUsers = await db.collection('users').find({}).toArray();
    
    for (const user of updatedUsers) {
      const tokens = user.gameState?.tokens || 0;
      const gameBalance = user.gameBalance || 0;
      
      totalTokensAfter += tokens;
      totalGameBalanceAfter += gameBalance;
    }
    
    console.log('\n📈 РЕЗУЛЬТАТ:');
    console.log('=' * 50);
    console.log(`Исправлено пользователей: ${fixedCount}/${users.length}`);
    console.log(`Общий tokens до: ${totalTokensBefore.toFixed(3)}`);
    console.log(`Общий gameBalance до: ${totalGameBalanceBefore.toFixed(3)}`);
    console.log(`Общий tokens после: ${totalTokensAfter.toFixed(3)}`);
    console.log(`Общий gameBalance после: ${totalGameBalanceAfter.toFixed(3)}`);
    
    if (fixedCount > 0) {
      console.log('\n✅ Все балансы синхронизированы!');
    } else {
      console.log('\n✅ Все балансы уже были синхронизированы');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

fixAllBalances(); 