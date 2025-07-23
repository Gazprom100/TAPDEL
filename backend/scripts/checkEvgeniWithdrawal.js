const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');

async function checkEvgeniWithdrawal() {
  try {
    console.log('🔍 ПРОВЕРКА ВЫВОДА EVGENI_KRASNOV');
    console.log('=====================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Ищем пользователя
    const user = await database.collection('users').findOne({
      $or: [
        { username: 'Evgeni_Krasnov' },
        { telegramUsername: 'Evgeni_Krasnov' },
        { userId: 'Evgeni_Krasnov' }
      ]
    });
    
    if (!user) {
      console.log('❌ Пользователь Evgeni_Krasnov не найден');
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${user.userId}`);
    console.log(`   Username: ${user.username || user.telegramUsername}`);
    console.log(`   Текущий баланс: ${user.gameState?.tokens || 0} DEL`);
    
    // Ищем выводы пользователя
    const withdrawals = await database.collection('withdrawals').find({
      userId: user.userId
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`\n📋 Выводы пользователя (всего: ${withdrawals.length}):`);
    
    for (const withdrawal of withdrawals) {
      console.log(`\n   Вывод ID: ${withdrawal._id}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Статус: ${withdrawal.status}`);
      console.log(`   Адрес: ${withdrawal.address}`);
      console.log(`   Создан: ${withdrawal.createdAt}`);
      
      if (withdrawal.processingStartedAt) {
        console.log(`   Начало обработки: ${withdrawal.processingStartedAt}`);
      }
      
      if (withdrawal.txHash) {
        console.log(`   TX Hash: ${withdrawal.txHash}`);
      }
      
      if (withdrawal.error) {
        console.log(`   Ошибка: ${withdrawal.error}`);
      }
      
      // Проверяем вывод на 3000 DEL
      if (withdrawal.amount === 3000) {
        console.log(`\n🎯 НАЙДЕН ВЫВОД НА 3000 DEL!`);
        console.log(`   Статус: ${withdrawal.status}`);
        
        if (withdrawal.status === 'processing' && !withdrawal.txHash) {
          console.log(`   ⚠️ ВЫВОД ЗАСТРЯЛ В ОБРАБОТКЕ!`);
          console.log(`   Нужно принудительно обработать`);
        } else if (withdrawal.status === 'completed' && withdrawal.txHash) {
          console.log(`   ✅ ВЫВОД УСПЕШНО ЗАВЕРШЕН!`);
          console.log(`   TX Hash: ${withdrawal.txHash}`);
        } else if (withdrawal.status === 'failed') {
          console.log(`   ❌ ВЫВОД ПРОВАЛЕН!`);
          console.log(`   Ошибка: ${withdrawal.error || 'Неизвестная ошибка'}`);
        }
      }
    }
    
    // Проверяем активные выводы
    const activeWithdrawals = withdrawals.filter(w => 
      w.status === 'queued' || w.status === 'processing'
    );
    
    console.log(`\n🔄 Активные выводы: ${activeWithdrawals.length}`);
    
    if (activeWithdrawals.length > 0) {
      console.log('   Список активных выводов:');
      for (const withdrawal of activeWithdrawals) {
        console.log(`   - ${withdrawal.amount} DEL (${withdrawal.status})`);
      }
    }
    
    console.log('\n✅ Проверка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkEvgeniWithdrawal(); 