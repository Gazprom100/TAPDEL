const databaseConfig = require('../config/database');

async function checkWithdrawalStatus() {
  try {
    console.log('🔍 ПРОВЕРКА СТАТУСА ВЫВОДА');
    console.log('=============================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // ID вывода из теста
    const withdrawalId = '6880d897ae0da04f638fdc1c';
    
    // Проверяем вывод в базе данных
    const withdrawal = await database.collection('withdrawals').findOne({
      _id: new (require('mongodb').ObjectId)(withdrawalId)
    });
    
    if (!withdrawal) {
      console.log('❌ Вывод не найден в базе данных');
      return;
    }
    
    console.log('📋 Информация о выводе:');
    console.log(`   ID: ${withdrawal._id}`);
    console.log(`   Пользователь: ${withdrawal.userId}`);
    console.log(`   Сумма: ${withdrawal.amount} DEL`);
    console.log(`   Адрес: ${withdrawal.toAddress}`);
    console.log(`   Статус: ${withdrawal.status}`);
    console.log(`   TX Hash: ${withdrawal.txHash || 'Нет'}`);
    console.log(`   Запрошен: ${withdrawal.requestedAt}`);
    console.log(`   Обработан: ${withdrawal.processedAt || 'Нет'}`);
    
    // Проверяем все выводы пользователя
    const userWithdrawals = await database.collection('withdrawals').find({
      userId: 'telegram-297810833'
    }).toArray();
    
    console.log(`\n📊 Все выводы пользователя (${userWithdrawals.length}):`);
    userWithdrawals.forEach((w, index) => {
      console.log(`   ${index + 1}. ${w.amount} DEL → ${w.toAddress} (${w.status})`);
    });
    
    // Проверяем баланс пользователя
    const user = await database.collection('users').findOne({
      userId: 'telegram-297810833'
    });
    
    if (user) {
      console.log(`\n💰 Баланс пользователя: ${user.gameState?.tokens || 0} DEL`);
    }
    
    console.log('\n✅ Проверка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkWithdrawalStatus(); 