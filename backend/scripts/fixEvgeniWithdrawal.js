const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');

async function fixEvgeniWithdrawal() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ВЫВОДА 3000 DEL');
    console.log('=================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Ищем неудачный вывод на 3000 DEL
    const failedWithdrawal = await database.collection('withdrawals').findOne({
      userId: 'telegram-297810833',
      amount: 3000,
      status: 'failed'
    });
    
    if (!failedWithdrawal) {
      console.log('❌ Неудачный вывод на 3000 DEL не найден');
      return;
    }
    
    console.log('✅ Найден неудачный вывод:');
    console.log(`   ID: ${failedWithdrawal._id}`);
    console.log(`   Сумма: ${failedWithdrawal.amount} DEL`);
    console.log(`   Статус: ${failedWithdrawal.status}`);
    console.log(`   Ошибка: ${failedWithdrawal.error || 'Неизвестная ошибка'}`);
    console.log(`   Создан: ${failedWithdrawal.createdAt}`);
    
    // Получаем пользователя
    const user = await database.collection('users').findOne({
      userId: 'telegram-297810833'
    });
    
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    console.log(`\n👤 Пользователь:`);
    console.log(`   ID: ${user.userId}`);
    console.log(`   Баланс: ${user.gameState?.tokens || 0} DEL`);
    
    // Проверяем баланс рабочего кошелька
    console.log('\n💰 Проверка баланса рабочего кошелька...');
    
    if (!decimalService.web3) {
      await decimalService.initialize();
    }
    
    const workingBalance = await decimalService.getWorkingBalance();
    console.log(`   Баланс рабочего кошелька: ${workingBalance} DEL`);
    
    if (workingBalance < 3000) {
      console.log(`   ❌ Недостаточно средств! Нужно: 3000 DEL, доступно: ${workingBalance} DEL`);
      return;
    }
    
    console.log(`   ✅ Достаточно средств для вывода`);
    
    // Создаем новый вывод
    console.log('\n🔄 Создание нового вывода...');
    
    const newWithdrawal = {
      userId: 'telegram-297810833',
      amount: 3000,
      address: '0xd6187dD54DF3002D5C82043b81EdE74187A5A647', // Адрес Evgeni
      status: 'queued',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
    };
    
    const result = await database.collection('withdrawals').insertOne(newWithdrawal);
    console.log(`   ✅ Новый вывод создан с ID: ${result.insertedId}`);
    
    // Принудительно обрабатываем вывод
    console.log('\n⚡ Принудительная обработка вывода...');
    
    try {
      const txHash = await decimalService.signAndSend(
        newWithdrawal.address,
        newWithdrawal.amount
      );
      
      if (txHash) {
        console.log(`   ✅ Транзакция отправлена! TX Hash: ${txHash}`);
        
        // Обновляем статус вывода
        await database.collection('withdrawals').updateOne(
          { _id: result.insertedId },
          {
            $set: {
              status: 'sent',
              txHash: txHash,
              sentAt: new Date()
            }
          }
        );
        
        console.log('   ✅ Статус вывода обновлен на "sent"');
        
        // Обновляем баланс пользователя
        const currentTokens = user.gameState?.tokens || 0;
        const newTokens = currentTokens - 3000;
        
        await database.collection('users').updateOne(
          { userId: 'telegram-297810833' },
          {
            $set: {
              "gameState.tokens": newTokens,
              "gameState.lastSaved": new Date(),
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`   ✅ Баланс пользователя обновлен!`);
        console.log(`   Старый баланс: ${currentTokens} DEL`);
        console.log(`   Новый баланс: ${newTokens} DEL`);
        console.log(`   Списано: -3000 DEL`);
        
      } else {
        console.log('   ❌ Ошибка отправки транзакции');
      }
      
    } catch (error) {
      console.error('   ❌ Ошибка обработки вывода:', error);
      
      // Обновляем статус на failed
      await database.collection('withdrawals').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            status: 'failed',
            error: error.message,
            failedAt: new Date()
          }
        }
      );
    }
    
    console.log('\n🎉 Исправление завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  }
}

fixEvgeniWithdrawal(); 