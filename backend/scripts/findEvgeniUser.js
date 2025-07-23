const databaseConfig = require('../config/database');

async function findEvgeniUser() {
  try {
    console.log('🔍 ПОИСК ПОЛЬЗОВАТЕЛЯ EVGENI');
    console.log('==============================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Ищем пользователей с именем Evgeni
    const users = await database.collection('users').find({
      $or: [
        { username: { $regex: /evgeni/i } },
        { telegramUsername: { $regex: /evgeni/i } },
        { userId: { $regex: /evgeni/i } }
      ]
    }).toArray();
    
    console.log(`\n📋 Найдено пользователей: ${users.length}`);
    
    for (const user of users) {
      console.log(`\n👤 Пользователь:`);
      console.log(`   ID: ${user.userId}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Telegram: ${user.telegramUsername || 'N/A'}`);
      console.log(`   Баланс: ${user.gameState?.tokens || 0} DEL`);
      console.log(`   Создан: ${user.createdAt}`);
    }
    
    // Также ищем выводы с большими суммами
    const largeWithdrawals = await database.collection('withdrawals').find({
      amount: { $gte: 2000 }
    }).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`\n💰 Крупные выводы (>= 2000 DEL):`);
    
    for (const withdrawal of largeWithdrawals) {
      console.log(`\n   Вывод:`);
      console.log(`   ID: ${withdrawal._id}`);
      console.log(`   Пользователь: ${withdrawal.userId}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Статус: ${withdrawal.status}`);
      console.log(`   Адрес: ${withdrawal.address}`);
      console.log(`   Создан: ${withdrawal.createdAt}`);
      
      if (withdrawal.txHash) {
        console.log(`   TX Hash: ${withdrawal.txHash}`);
      }
    }
    
    console.log('\n✅ Поиск завершен');
    
  } catch (error) {
    console.error('❌ Ошибка поиска:', error);
  }
}

findEvgeniUser(); 