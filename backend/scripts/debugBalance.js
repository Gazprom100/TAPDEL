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

async function debugBalance() {
  let client;
  
  try {
    console.log('🔍 ДИАГНОСТИКА БАЛАНСА ПОЛЬЗОВАТЕЛЯ\n');
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    
    // 1. Ищем пользователя AIRDROPSVSDONUTS
    console.log('👤 Поиск пользователя AIRDROPSVSDONUTS...');
    const user = await db.collection('users').findOne({
      $or: [
        { 'profile.telegramUsername': 'AIRDROPSVSDONUTS' },
        { 'profile.username': { $regex: /AIRDROPSVSDONUTS/i } }
      ]
    });
    
    if (!user) {
      console.log('❌ Пользователь AIRDROPSVSDONUTS не найден');
      
      // Покажем всех пользователей для справки
      const allUsers = await db.collection('users').find({}).toArray();
      console.log('\n📋 Все пользователи в базе:');
      allUsers.forEach((u, i) => {
        console.log(`   ${i+1}. ${u.userId}: ${u.profile?.telegramUsername || u.profile?.username || 'без имени'}`);
      });
      return;
    }
    
    console.log('✅ Пользователь найден!\n');
    
    // 2. Детальный анализ данных пользователя
    console.log('📊 ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:');
    console.log('=' * 50);
    console.log(`   userId: ${user.userId}`);
    console.log(`   Telegram username: ${user.profile?.telegramUsername}`);
    console.log(`   Display name: ${user.profile?.username}`);
    console.log(`   Telegram ID: ${user.profile?.telegramId}`);
    console.log('');
    
    console.log('💰 БАЛАНСЫ:');
    console.log(`   gameState.tokens (игровые): ${user.gameState?.tokens || 0}`);
    console.log(`   gameState.highScore (рейтинг): ${user.gameState?.highScore || 0}`);
    console.log(`   gameBalance (DEL): ${user.gameBalance || 0}`);
    console.log('');
    
    console.log('🎮 ИГРОВОЕ СОСТОЯНИЕ:');
    console.log(`   engineLevel: ${user.gameState?.engineLevel}`);
    console.log(`   gearboxLevel: ${user.gameState?.gearboxLevel}`);
    console.log(`   batteryLevel: ${user.gameState?.batteryLevel}`);
    console.log(`   hyperdriveLevel: ${user.gameState?.hyperdriveLevel}`);
    console.log(`   powerGridLevel: ${user.gameState?.powerGridLevel}`);
    console.log(`   lastSaved: ${user.gameState?.lastSaved}`);
    console.log('');
    
    // 3. Проверяем транзакции
    console.log('💳 ТРАНЗАКЦИИ:');
    const transactions = user.transactions || [];
    console.log(`   Количество: ${transactions.length}`);
    if (transactions.length > 0) {
      console.log('   Последние 5 транзакций:');
      transactions.slice(0, 5).forEach((tx, i) => {
        console.log(`     ${i+1}. ${tx.type}: ${tx.amount} DEL (${new Date(tx.timestamp).toLocaleString()})`);
      });
    }
    console.log('');
    
    // 4. Проверяем депозиты
    console.log('📥 ДЕПОЗИТЫ:');
    const deposits = await db.collection('deposits').find({ userId: user.userId }).toArray();
    console.log(`   Количество: ${deposits.length}`);
    if (deposits.length > 0) {
      deposits.forEach((deposit, i) => {
        console.log(`     ${i+1}. ${deposit.amountRequested} DEL → ${deposit.uniqueAmount} DEL`);
        console.log(`        Status: ${deposit.matched ? 'MATCHED' : 'WAITING'}`);
        console.log(`        TX: ${deposit.txHash || 'None'}`);
        console.log(`        Created: ${deposit.createdAt.toLocaleString()}`);
        console.log(`        Expires: ${deposit.expiresAt.toLocaleString()}`);
        console.log('');
      });
    }
    
    // 5. Проверяем выводы
    console.log('📤 ВЫВОДЫ:');
    const withdrawals = await db.collection('withdrawals').find({ userId: user.userId }).toArray();
    console.log(`   Количество: ${withdrawals.length}`);
    if (withdrawals.length > 0) {
      withdrawals.forEach((withdrawal, i) => {
        console.log(`     ${i+1}. ${withdrawal.amount} DEL → ${withdrawal.toAddress}`);
        console.log(`        Status: ${withdrawal.status}`);
        console.log(`        TX: ${withdrawal.txHash || 'None'}`);
        console.log(`        Requested: ${withdrawal.requestedAt.toLocaleString()}`);
        console.log(`        Processed: ${withdrawal.processedAt ? new Date(withdrawal.processedAt).toLocaleString() : 'Not yet'}`);
        console.log('');
      });
    }
    
    // 6. Проверяем лидерборд
    console.log('🏆 ЛИДЕРБОРД:');
    const leaderboardEntry = await db.collection('leaderboard').findOne({ userId: user.userId });
    if (leaderboardEntry) {
      console.log(`   Rank: ${leaderboardEntry.rank}`);
      console.log(`   Tokens (rating): ${leaderboardEntry.tokens}`);
      console.log(`   Username: ${leaderboardEntry.username}`);
      console.log(`   Updated: ${leaderboardEntry.updatedAt.toLocaleString()}`);
    } else {
      console.log('   ❌ Не найден в лидерборде');
    }
    console.log('');
    
    // 7. ДИАГНОЗ
    console.log('🔬 ДИАГНОЗ:');
    console.log('=' * 50);
    
    const gameTokens = user.gameState?.tokens || 0;
    const delBalance = user.gameBalance || 0;
    const highScore = user.gameState?.highScore || 0;
    
    console.log('📋 Анализ данных:');
    console.log(`   1. gameState.tokens (${gameTokens}) - это игровые очки`);
    console.log(`   2. gameBalance (${delBalance}) - это реальный DEL баланс`);
    console.log(`   3. highScore (${highScore}) - это рейтинг (всего натапано)`);
    console.log('');
    
    if (gameTokens > 0 && delBalance === 0) {
      console.log('❌ ПРОБЛЕМА НАЙДЕНА:');
      console.log('   У пользователя есть игровые токены, но нет DEL баланса');
      console.log('   Это означает что refreshBalance() показывает gameBalance (0)');
      console.log('   но пользователь видит tokens (игровые очки)');
      console.log('');
      console.log('🔧 РЕШЕНИЕ:');
      console.log('   Нужно либо:');
      console.log('   a) Перенести tokens в gameBalance (конвертация игровых в DEL)');
      console.log('   b) Убрать показ tokens и показывать только gameBalance');
      console.log('   c) Пополнить gameBalance через депозит DEL');
    } else if (gameTokens === delBalance && delBalance > 0) {
      console.log('✅ Данные синхронизированы');
    } else {
      console.log('⚠️ Возможная проблема с синхронизацией данных');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugBalance(); 