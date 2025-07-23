const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');
const config = require('../config/decimal');

async function forceProcessWithdrawal() {
  try {
    console.log('🔧 ПРИНУДИТЕЛЬНАЯ ОБРАБОТКА ВЫВОДА');
    console.log('=====================================');
    
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
    
    if (withdrawal.status === 'sent') {
      console.log('✅ Вывод уже отправлен');
      console.log(`🔗 TX Hash: ${withdrawal.txHash}`);
      return;
    }
    
    if (withdrawal.status === 'failed') {
      console.log('❌ Вывод уже помечен как failed');
      return;
    }
    
    // Проверяем баланс рабочего кошелька
    console.log('\n💰 Проверка баланса рабочего кошелька...');
    const workingBalance = await decimalService.getWorkingBalance();
    console.log(`   Баланс рабочего кошелька: ${workingBalance} DEL`);
    
    if (workingBalance < withdrawal.amount) {
      console.log('❌ Недостаточно средств в рабочем кошельке!');
      console.log(`   Нужно: ${withdrawal.amount} DEL`);
      console.log(`   Доступно: ${workingBalance} DEL`);
      return;
    }
    
    console.log('✅ Достаточно средств для вывода');
    
    // Принудительно обрабатываем вывод
    console.log('\n🔄 Принудительная обработка вывода...');
    
    try {
      // Инициализируем DecimalService если нужно
      if (!decimalService.web3) {
        await decimalService.initialize();
      }
      
      // Отправляем транзакцию
      const txHash = await decimalService.signAndSend(withdrawal.toAddress, withdrawal.amount);
      
      // Обновляем статус в базе данных
      await database.collection('withdrawals').updateOne(
        { _id: withdrawal._id },
        {
          $set: {
            txHash: txHash,
            status: 'sent',
            processedAt: new Date()
          },
          $unset: { processingStartedAt: 1 }
        }
      );
      
      console.log('✅ Вывод успешно обработан!');
      console.log(`📄 TX Hash: ${txHash}`);
      console.log(`💸 Сумма: ${withdrawal.amount} DEL`);
      console.log(`📍 Адрес: ${withdrawal.toAddress}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке вывода:', error);
      
      // Помечаем как failed и возвращаем средства
      await database.collection('withdrawals').updateOne(
        { _id: withdrawal._id },
        {
          $set: {
            status: 'failed',
            error: error.message,
            processedAt: new Date()
          },
          $unset: { processingStartedAt: 1 }
        }
      );
      
      // Возвращаем средства пользователю
      await database.collection('users').updateOne(
        { userId: withdrawal.userId },
        { $inc: { "gameState.tokens": withdrawal.amount } }
      );
      
      console.log(`💰 Средства возвращены пользователю ${withdrawal.userId}: +${withdrawal.amount} DEL`);
    }
    
    console.log('\n✅ Принудительная обработка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка принудительной обработки:', error);
  }
}

forceProcessWithdrawal(); 