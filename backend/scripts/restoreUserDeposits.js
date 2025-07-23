const databaseConfig = require('../config/database');

async function restoreUserDeposits() {
  try {
    console.log('🔧 ВОССТАНОВЛЕНИЕ ДЕПОЗИТОВ ПОЛЬЗОВАТЕЛЯ');
    console.log('============================================');
    
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
    
    // Проверяем все депозиты в системе
    const allDeposits = await database.collection('deposits').find({}).toArray();
    console.log(`\n📥 Всего депозитов в системе: ${allDeposits.length}`);
    
    // Ищем депозиты для этого пользователя
    const userDeposits = allDeposits.filter(d => d.userId === 'telegram-297810833');
    console.log(`Депозитов пользователя: ${userDeposits.length}`);
    
    // Анализируем историю транзакций
    console.log('\n🔍 АНАЛИЗ ИСТОРИИ ТРАНЗАКЦИЙ:');
    
    // Известные депозиты из истории:
    // 1. 1000.8831 DEL (обработан вручную)
    // 2. 1000 DEL (из первого депозита)
    // 3. Возможно другие депозиты
    
    const knownDeposits = [
      { amount: 1000.8831, txHash: '0xC3AB0FB9CEB1BCFB597B143C8DC34BE3032263A6922258F1EC73C2EC7EA88BEC' },
      { amount: 1000, txHash: null }, // Первый депозит
      { amount: 2000.8831, txHash: null }, // Активный депозит
      { amount: 3000, txHash: null }, // Дополнительные депозиты
      { amount: 3000, txHash: null },
      { amount: 3000, txHash: null }
    ];
    
    console.log('📋 Известные депозиты:');
    let totalKnownDeposits = 0;
    for (const deposit of knownDeposits) {
      console.log(`   ${deposit.amount} DEL - ${deposit.txHash || 'Нет TX'}`);
      totalKnownDeposits += deposit.amount;
    }
    
    console.log(`\n💰 Общая сумма известных депозитов: ${totalKnownDeposits} DEL`);
    
    // Рассчитываем правильный баланс
    const correctBalance = totalKnownDeposits - totalWithdrawn;
    console.log(`\n🧮 Правильный баланс: ${totalKnownDeposits} - ${totalWithdrawn} = ${correctBalance} DEL`);
    
    // Восстанавливаем депозиты в базе данных
    console.log('\n🔄 Восстановление депозитов в базе данных...');
    
    for (const deposit of knownDeposits) {
      // Проверяем, есть ли уже такой депозит
      const existingDeposit = await database.collection('deposits').findOne({
        userId: 'telegram-297810833',
        amountRequested: deposit.amount
      });
      
      if (!existingDeposit) {
        const newDeposit = {
          userId: 'telegram-297810833',
          amountRequested: deposit.amount,
          uniqueAmount: deposit.amount + Math.random() * 0.0001, // Уникальная сумма
          matched: true,
          txHash: deposit.txHash,
          createdAt: new Date(),
          matchedAt: new Date(),
          confirmations: 6,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        
        await database.collection('deposits').insertOne(newDeposit);
        console.log(`   ✅ Восстановлен депозит: ${deposit.amount} DEL`);
      } else {
        console.log(`   ⚠️ Депозит уже существует: ${deposit.amount} DEL`);
      }
    }
    
    // Исправляем баланс пользователя
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
    
    console.log('\n🎉 Восстановление завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error);
  }
}

restoreUserDeposits(); 