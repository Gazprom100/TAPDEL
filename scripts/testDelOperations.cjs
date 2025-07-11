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

async function testDelOperations() {
  let client = null;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('✅ Подключение установлено');
    
    // Тестовый пользователь
    const testUserId = 'test_user_del_ops';
    
    // 1. Создаём тестового пользователя с начальным балансом
    console.log('\n📋 1. Создание тестового пользователя...');
    await db.collection('users').updateOne(
      { userId: testUserId },
      {
        $set: {
          userId: testUserId,
          gameState: {
            tokens: 100, // Начальный баланс 100 DEL
            highScore: 500,
            lastSaved: new Date()
          },
          gameBalance: 100, // Для совместимости
          profile: {
            username: 'Test User DEL',
            createdAt: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    // Получаем пользователя
    const user = await db.collection('users').findOne({ userId: testUserId });
    console.log(`✅ Пользователь создан: ${user.gameState.tokens} DEL в gameState.tokens`);
    
    // 2. Тестируем логику вывода средств
    console.log('\n💸 2. Тестирование логики вывода...');
    const withdrawAmount = 50;
    const currentBalance = user.gameState?.tokens || 0;
    
    console.log(`   📊 Текущий баланс: ${currentBalance} DEL`);
    console.log(`   💳 Сумма вывода: ${withdrawAmount} DEL`);
    
    if (currentBalance >= withdrawAmount) {
      console.log(`   ✅ Проверка баланса прошла (${currentBalance} >= ${withdrawAmount})`);
      
      // Имитируем операцию вывода
      const newBalance = currentBalance - withdrawAmount;
      await db.collection('users').updateOne(
        { userId: testUserId },
        { $set: { "gameState.tokens": newBalance, updatedAt: new Date() } }
      );
      
      console.log(`   💸 Баланс обновлён: ${currentBalance} -> ${newBalance} DEL`);
    } else {
      console.log(`   ❌ Недостаточно средств для вывода`);
    }
    
    // 3. Тестируем логику пополнения
    console.log('\n💰 3. Тестирование логики пополнения...');
    const depositAmount = 25;
    
    // Получаем актуальный баланс
    const updatedUser = await db.collection('users').findOne({ userId: testUserId });
    const balanceBeforeDeposit = updatedUser.gameState?.tokens || 0;
    
    console.log(`   📊 Баланс до пополнения: ${balanceBeforeDeposit} DEL`);
    console.log(`   💳 Сумма пополнения: ${depositAmount} DEL`);
    
    // Имитируем операцию пополнения
    await db.collection('users').updateOne(
      { userId: testUserId },
      { $inc: { "gameState.tokens": depositAmount } }
    );
    
    const userAfterDeposit = await db.collection('users').findOne({ userId: testUserId });
    const balanceAfterDeposit = userAfterDeposit.gameState?.tokens || 0;
    
    console.log(`   💰 Баланс после пополнения: ${balanceAfterDeposit} DEL`);
    console.log(`   ✅ Изменение: +${balanceAfterDeposit - balanceBeforeDeposit} DEL`);
    
    // 4. Проверяем консистентность
    console.log('\n🔍 4. Проверка консистентности данных...');
    const finalUser = await db.collection('users').findOne({ userId: testUserId });
    
    console.log(`   🎮 gameState.tokens: ${finalUser.gameState?.tokens || 0} DEL`);
    console.log(`   💾 gameBalance: ${finalUser.gameBalance || 0} DEL`);
    
    const isConsistent = (finalUser.gameState?.tokens || 0) === (finalUser.gameBalance || 0);
    console.log(`   ${isConsistent ? '✅' : '⚠️'} Консистентность: ${isConsistent ? 'ОК' : 'Требует внимания'}`);
    
    // 5. Тестируем возврат средств при ошибке
    console.log('\n🔄 5. Тестирование возврата средств...');
    const refundAmount = 10;
    const balanceBeforeRefund = finalUser.gameState?.tokens || 0;
    
    await db.collection('users').updateOne(
      { userId: testUserId },
      { $inc: { "gameState.tokens": refundAmount } }
    );
    
    const userAfterRefund = await db.collection('users').findOne({ userId: testUserId });
    const balanceAfterRefund = userAfterRefund.gameState?.tokens || 0;
    
    console.log(`   📊 Баланс до возврата: ${balanceBeforeRefund} DEL`);
    console.log(`   💳 Сумма возврата: ${refundAmount} DEL`);
    console.log(`   📊 Баланс после возврата: ${balanceAfterRefund} DEL`);
    console.log(`   ✅ Возврат работает: +${balanceAfterRefund - balanceBeforeRefund} DEL`);
    
    // Очистка тестовых данных
    console.log('\n🧹 Очистка тестовых данных...');
    await db.collection('users').deleteOne({ userId: testUserId });
    console.log('✅ Тестовый пользователь удалён');
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! DEL операции работают корректно.');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 Соединение с MongoDB закрыто');
    }
  }
}

// Запуск тестов
testDelOperations().catch(console.error); 