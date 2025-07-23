const databaseConfig = require('../config/database');

async function testDepositProcessing() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ОБРАБОТКИ ДЕПОЗИТОВ');
    console.log('=======================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Проверяем все депозиты
    const deposits = await database.collection('deposits').find({}).toArray();
    console.log(`📋 Всего депозитов в базе: ${deposits.length}`);
    
    deposits.forEach((deposit, index) => {
      console.log(`${index + 1}. Депозит ${deposit.amountRequested} DEL:`);
      console.log(`   Уникальная сумма: ${deposit.uniqueAmount} DEL`);
      console.log(`   Статус: ${deposit.matched ? 'matched' : 'waiting'}`);
      console.log(`   Подтверждения: ${deposit.confirmations || 0}`);
      console.log(`   TX Hash: ${deposit.txHash || 'Нет'}`);
      console.log(`   Создан: ${deposit.createdAt}`);
      console.log(`   Истекает: ${deposit.expiresAt}`);
      console.log('');
    });
    
    // Проверяем активные депозиты
    const activeDeposits = await database.collection('deposits').find({
      matched: false,
      expiresAt: { $gt: new Date() }
    }).toArray();
    
    console.log(`🔍 Активных депозитов: ${activeDeposits.length}`);
    
    if (activeDeposits.length > 0) {
      console.log('📋 Активные депозиты:');
      activeDeposits.forEach((deposit, index) => {
        console.log(`   ${index + 1}. ${deposit.uniqueAmount} DEL (${deposit.userId})`);
      });
    }
    
    // Проверяем мониторинг блоков
    console.log('\n🔍 Проверка мониторинга блоков...');
    console.log('📊 Система должна мониторить новые блоки для поиска транзакций');
    console.log('📋 Рабочий адрес: 0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43');
    
    // Проверяем пользователей с депозитами
    const usersWithDeposits = await database.collection('users').find({
      userId: { $in: deposits.map(d => d.userId) }
    }).toArray();
    
    console.log(`\n👥 Пользователи с депозитами: ${usersWithDeposits.length}`);
    usersWithDeposits.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username || user.telegramUsername}: ${user.gameState?.tokens || 0} DEL`);
    });
    
    console.log('\n✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testDepositProcessing(); 