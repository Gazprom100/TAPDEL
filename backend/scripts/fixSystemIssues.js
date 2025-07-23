const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');

async function fixSystemIssues() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ПРОБЛЕМ СИСТЕМЫ');
    console.log('=================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Инициализируем DecimalService
    if (!decimalService.web3) {
      await decimalService.initialize();
    }
    console.log('✅ DecimalService инициализирован');
    
    // === 1. ИСПРАВЛЕНИЕ МОНИТОРИНГА БЛОКОВ ===
    console.log('\n👁️ 1. ИСПРАВЛЕНИЕ МОНИТОРИНГА БЛОКОВ');
    console.log('========================================');
    
    // Получаем текущий блок
    const currentBlock = await decimalService.web3.eth.getBlockNumber();
    console.log(`Текущий блок: ${currentBlock}`);
    
    // Устанавливаем последний обработанный блок на 50 блоков назад
    const lastBlock = Number(currentBlock) - 50;
    console.log(`Устанавливаем последний блок: ${lastBlock}`);
    
    // Сохраняем в Redis или локально
    if (decimalService.hasRedis && decimalService.redis) {
      try {
        await decimalService.redis.set('DECIMAL_LAST_BLOCK', lastBlock.toString());
        console.log('✅ Последний блок сохранен в Redis');
      } catch (error) {
        console.log(`⚠️ Redis ошибка: ${error.message}`);
        decimalService.localLastBlock = lastBlock;
        console.log('✅ Последний блок сохранен локально');
      }
    } else {
      decimalService.localLastBlock = lastBlock;
      console.log('✅ Последний блок сохранен локально');
    }
    
    // === 2. ИСПРАВЛЕНИЕ НЕУДАЧНЫХ ВЫВОДОВ ===
    console.log('\n📤 2. ИСПРАВЛЕНИЕ НЕУДАЧНЫХ ВЫВОДОВ');
    console.log('======================================');
    
    const failedWithdrawals = await database.collection('withdrawals').find({
      status: 'failed'
    }).toArray();
    
    console.log(`Найдено неудачных выводов: ${failedWithdrawals.length}`);
    
    for (const withdrawal of failedWithdrawals) {
      console.log(`\n🔧 Исправление вывода ${withdrawal.amount} DEL:`);
      console.log(`   ID: ${withdrawal._id}`);
      console.log(`   Ошибка: ${withdrawal.error || 'Неизвестная ошибка'}`);
      
      // Проверяем баланс рабочего кошелька
      const workingBalance = await decimalService.getWorkingBalance();
      console.log(`   Баланс рабочего кошелька: ${workingBalance} DEL`);
      
      if (workingBalance < withdrawal.amount) {
        console.log(`   ❌ Недостаточно средств для вывода`);
        continue;
      }
      
      // Создаем новый вывод
      const newWithdrawal = {
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        address: withdrawal.address || '0xd6187dD54DF3002D5C82043b81EdE74187A5A647',
        status: 'queued',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      
      const result = await database.collection('withdrawals').insertOne(newWithdrawal);
      console.log(`   ✅ Новый вывод создан с ID: ${result.insertedId}`);
      
      // Принудительно обрабатываем вывод
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
          const user = await database.collection('users').findOne({ userId: withdrawal.userId });
          if (user) {
            const currentTokens = user.gameState?.tokens || 0;
            const newTokens = currentTokens - withdrawal.amount;
            
            await database.collection('users').updateOne(
              { userId: withdrawal.userId },
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
            console.log(`   Списано: -${withdrawal.amount} DEL`);
          }
          
        } else {
          console.log('   ❌ Ошибка отправки транзакции');
        }
        
      } catch (error) {
        console.error(`   ❌ Ошибка обработки вывода: ${error.message}`);
        
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
    }
    
    // === 3. ОБРАБОТКА АКТИВНЫХ ДЕПОЗИТОВ ===
    console.log('\n📥 3. ОБРАБОТКА АКТИВНЫХ ДЕПОЗИТОВ');
    console.log('=====================================');
    
    const activeDeposits = await database.collection('deposits').find({
      matched: false,
      expiresAt: { $gt: new Date() }
    }).toArray();
    
    console.log(`Найдено активных депозитов: ${activeDeposits.length}`);
    
    if (activeDeposits.length > 0) {
      console.log('🔄 Запуск мониторинга блоков для обработки депозитов...');
      
      // Запускаем мониторинг блоков
      await decimalService.startDepositWatcher(database);
      console.log('✅ Мониторинг блоков запущен');
      
      // Обрабатываем несколько блоков для поиска транзакций
      const currentBlock = await decimalService.web3.eth.getBlockNumber();
      const startBlock = Math.max(Number(currentBlock) - 100, 1);
      
      console.log(`Обрабатываем блоки с ${startBlock} по ${currentBlock}...`);
      
      for (let blockNum = startBlock; blockNum <= currentBlock; blockNum++) {
        await decimalService.processBlock(blockNum, database);
      }
      
      console.log('✅ Обработка блоков завершена');
    }
    
    // === 4. ОЧИСТКА ИСТЕКШИХ ДЕПОЗИТОВ ===
    console.log('\n🧹 4. ОЧИСТКА ИСТЕКШИХ ДЕПОЗИТОВ');
    console.log('===================================');
    
    const expiredDeposits = await database.collection('deposits').find({
      expiresAt: { $lte: new Date() },
      matched: false
    }).toArray();
    
    console.log(`Найдено истекших депозитов: ${expiredDeposits.length}`);
    
    if (expiredDeposits.length > 0) {
      const result = await database.collection('deposits').deleteMany({
        expiresAt: { $lte: new Date() },
        matched: false
      });
      
      console.log(`✅ Удалено истекших депозитов: ${result.deletedCount}`);
    }
    
    // === 5. ЗАПУСК РАБОЧИХ ПРОЦЕССОВ ===
    console.log('\n⚙️ 5. ЗАПУСК РАБОЧИХ ПРОЦЕССОВ');
    console.log('==================================');
    
    // Запускаем withdrawal worker
    await decimalService.startWithdrawalWorker(database);
    console.log('✅ Withdrawal worker запущен');
    
    // Запускаем confirmation updater
    await decimalService.startConfirmationUpdater(database);
    console.log('✅ Confirmation updater запущен');
    
    // Запускаем cleaner для истекших депозитов
    await decimalService.startExpiredDepositsCleaner(database);
    console.log('✅ Expired deposits cleaner запущен');
    
    console.log('\n🎉 Все проблемы исправлены!');
    console.log('✅ Система готова к работе');
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  }
}

fixSystemIssues(); 