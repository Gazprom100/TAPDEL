const databaseConfig = require('../config/database');

async function fixUserBalance() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ БАЛАНСА ПОЛЬЗОВАТЕЛЯ');
    console.log('=====================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Получаем пользователя
    const user = await database.collection('users').findOne({
      userId: 'telegram-297810833'
    });
    
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    console.log('✅ Пользователь найден:');
    console.log(`   ID: ${user.userId}`);
    console.log(`   Текущий баланс: ${user.gameState?.tokens || 0} DEL`);
    
    // Проверяем выводы пользователя
    const withdrawals = await database.collection('withdrawals').find({
      userId: 'telegram-297810833',
      status: 'sent'
    }).toArray();
    
    console.log(`\n📤 Выводы пользователя: ${withdrawals.length}`);
    
    let totalWithdrawn = 0;
    for (const withdrawal of withdrawals) {
      console.log(`   ${withdrawal.amount} DEL - ${withdrawal.txHash}`);
      totalWithdrawn += withdrawal.amount;
    }
    
    console.log(`\n💰 Общая сумма выводов: ${totalWithdrawn} DEL`);
    
    // Проверяем депозиты пользователя
    const deposits = await database.collection('deposits').find({
      userId: 'telegram-297810833',
      matched: true
    }).toArray();
    
    console.log(`\n📥 Депозиты пользователя: ${deposits.length}`);
    
    let totalDeposited = 0;
    for (const deposit of deposits) {
      console.log(`   ${deposit.amountRequested} DEL - ${deposit.txHash || 'Нет TX'}`);
      totalDeposited += deposit.amountRequested;
    }
    
    console.log(`\n💰 Общая сумма депозитов: ${totalDeposited} DEL`);
    
    // Рассчитываем правильный баланс
    const correctBalance = totalDeposited - totalWithdrawn;
    console.log(`\n🧮 Правильный баланс: ${totalDeposited} - ${totalWithdrawn} = ${correctBalance} DEL`);
    
    // Исправляем баланс
    await database.collection('users').updateOne(
      { userId: 'telegram-297810833' },
      {
        $set: {
          "gameState.tokens": correctBalance,
          "gameState.lastSaved": new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`\n✅ Баланс исправлен!`);
    console.log(`   Старый баланс: ${user.gameState?.tokens || 0} DEL`);
    console.log(`   Новый баланс: ${correctBalance} DEL`);
    
    console.log('\n🎉 Исправление завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  }
}

fixUserBalance(); 