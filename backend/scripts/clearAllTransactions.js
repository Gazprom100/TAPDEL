const { MongoClient } = require('mongodb');

async function clearAllTransactions() {
  console.log('🧹 ОЧИСТКА ИСТОРИИ ВВОДОВ И ВЫВОДОВ У ВСЕХ ПОЛЬЗОВАТЕЛЕЙ');
  console.log('==========================================================');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapdel';
  
  try {
    // Подключаемся к MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение к MongoDB установлено');
    
    const database = client.db();
    
    // Очистка коллекции депозитов
    console.log('\n1️⃣ Очистка истории депозитов (вводов)');
    const depositsResult = await database.collection('deposits').deleteMany({});
    console.log(`✅ Удалено депозитов: ${depositsResult.deletedCount}`);
    
    // Очистка коллекции выводов
    console.log('\n2️⃣ Очистка истории выводов');
    const withdrawalsResult = await database.collection('withdrawals').deleteMany({});
    console.log(`✅ Удалено выводов: ${withdrawalsResult.deletedCount}`);
    
    // Очистка транзакций в профилях пользователей
    console.log('\n3️⃣ Очистка транзакций в профилях пользователей');
    const usersResult = await database.collection('users').updateMany(
      {},
      { $set: { transactions: [] } }
    );
    console.log(`✅ Обновлено пользователей: ${usersResult.modifiedCount}`);
    
    // Проверка результата
    console.log('\n4️⃣ Проверка очистки');
    
    // Подсчет оставшихся записей
    const remainingDeposits = await database.collection('deposits').countDocuments();
    const remainingWithdrawals = await database.collection('withdrawals').countDocuments();
    
    console.log('📊 Результаты очистки:');
    console.log(`   Депозиты (вводы): ${remainingDeposits} записей`);
    console.log(`   Выводы: ${remainingWithdrawals} записей`);
    
    if (remainingDeposits === 0 && remainingWithdrawals === 0) {
      console.log('✅ История полностью очищена!');
    } else {
      console.log('⚠️ Некоторые записи остались');
    }
    
    // Проверка пользователей
    const usersWithTransactions = await database.collection('users').countDocuments({
      'transactions.0': { $exists: true }
    });
    
    console.log(`   Пользователи с транзакциями: ${usersWithTransactions}`);
    
    await client.close();
    console.log('🔌 Подключение к MongoDB закрыто');
    
    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('\n📋 РЕЗУЛЬТАТЫ:');
    console.log(`✅ Удалено депозитов: ${depositsResult.deletedCount}`);
    console.log(`✅ Удалено выводов: ${withdrawalsResult.deletedCount}`);
    console.log(`✅ Обновлено пользователей: ${usersResult.modifiedCount}`);
    console.log('✅ История вводов и выводов очищена');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
    return false;
  }
}

// Запускаем очистку если скрипт вызван напрямую
if (require.main === module) {
  clearAllTransactions()
    .then(success => {
      if (success) {
        console.log('\n🎉 ОЧИСТКА ПРОШЛА УСПЕШНО!');
        console.log('✅ История вводов и выводов очищена у всех пользователей');
        process.exit(0);
      } else {
        console.log('\n💥 ОЧИСТКА ПРОВАЛИЛАСЬ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { clearAllTransactions }; 