const { MongoClient } = require('mongodb');

// MongoDB настройки
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

async function debugWithdrawal() {
  let client = null;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    const testUserId = 'test_user_del';
    
    // 1. Проверяем текущее состояние пользователя
    console.log('\n📊 1. Текущее состояние пользователя:');
    const user = await db.collection('users').findOne({ userId: testUserId });
    if (user) {
      console.log(`   gameState.tokens: ${user.gameState?.tokens || 'undefined'}`);
      console.log(`   gameBalance: ${user.gameBalance || 'undefined'}`);
      console.log(`   updatedAt: ${user.updatedAt}`);
    } else {
      console.log('   Пользователь не найден!');
      return;
    }
    
    // 2. Имитируем операцию вывода
    console.log('\n💸 2. Имитация операции вывода...');
    const currentBalance = user.gameState?.tokens || 0;
    const withdrawAmount = 1.0;
    
    console.log(`   Текущий баланс: ${currentBalance} DEL`);
    console.log(`   Сумма вывода: ${withdrawAmount} DEL`);
    
    if (currentBalance >= withdrawAmount) {
      const newBalance = currentBalance - withdrawAmount;
      console.log(`   Новый баланс должен быть: ${newBalance} DEL`);
      
      // Обновляем баланс
      const updateResult = await db.collection('users').updateOne(
        { userId: testUserId },
        { $set: { "gameState.tokens": newBalance, updatedAt: new Date() } }
      );
      
      console.log(`   MongoDB updateOne результат:`);
      console.log(`     acknowledged: ${updateResult.acknowledged}`);
      console.log(`     modifiedCount: ${updateResult.modifiedCount}`);
      console.log(`     matchedCount: ${updateResult.matchedCount}`);
      
      // 3. Проверяем обновленное состояние
      console.log('\n✅ 3. Проверка обновленного состояния:');
      const updatedUser = await db.collection('users').findOne({ userId: testUserId });
      console.log(`   gameState.tokens: ${updatedUser.gameState?.tokens || 'undefined'}`);
      console.log(`   gameBalance: ${updatedUser.gameBalance || 'undefined'}`);
      console.log(`   updatedAt: ${updatedUser.updatedAt}`);
      
      // 4. Создаем запись о выводе
      console.log('\n📝 4. Создание записи о выводе:');
      const withdrawal = {
        userId: testUserId,
        toAddress: '0xDEBUG1234567890123456789012345678901234',
        amount: withdrawAmount,
        txHash: null,
        status: 'queued',
        requestedAt: new Date(),
        processedAt: null,
        debug: true
      };
      
      const insertResult = await db.collection('withdrawals').insertOne(withdrawal);
      console.log(`   Withdrawal ID: ${insertResult.insertedId}`);
      
    } else {
      console.log(`   ❌ Недостаточно средств для вывода`);
    }
    
    // 5. Проверяем все выводы пользователя
    console.log('\n📋 5. Все выводы пользователя:');
    const withdrawals = await db.collection('withdrawals')
      .find({ userId: testUserId })
      .sort({ requestedAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`   Всего выводов: ${withdrawals.length}`);
    withdrawals.forEach((w, index) => {
      console.log(`   ${index + 1}. ${w.amount} DEL → ${w.toAddress} (${w.status}) ${w.debug ? '[DEBUG]' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Соединение с MongoDB закрыто');
    }
  }
}

// Запуск отладки
debugWithdrawal().catch(console.error); 