const fetch = require('node-fetch');

async function checkWithdrawalStatus() {
  console.log('🔍 ПРОВЕРКА СТАТУСА ВЫВОДА И МОНИТОРИНГ ТРАНЗАКЦИЙ');
  console.log('=====================================================');
  
  const withdrawalId = '6880d1c07f62fb187a3a1636'; // ID вывода 2222 DEL
  const userId = 'telegram-297810833';
  
  try {
    // Проверка статуса конкретного вывода
    console.log('\n1️⃣ Проверка статуса вывода 2222 DEL');
    const statusResponse = await fetch(`https://tapdel.onrender.com/api/decimal/withdrawals/${withdrawalId}`);
    
    if (statusResponse.ok) {
      const withdrawal = await statusResponse.json();
      console.log('✅ Статус вывода:', {
        withdrawalId: withdrawal.withdrawalId,
        status: withdrawal.status,
        amount: withdrawal.amount,
        toAddress: withdrawal.toAddress,
        requestedAt: withdrawal.requestedAt,
        processedAt: withdrawal.processedAt,
        txHash: withdrawal.txHash
      });
      
      if (withdrawal.status === 'queued') {
        console.log('⏳ Вывод в очереди на обработку');
      } else if (withdrawal.status === 'sent') {
        console.log('✅ Вывод отправлен в блокчейн');
        console.log(`🔗 TX Hash: ${withdrawal.txHash}`);
      } else if (withdrawal.status === 'failed') {
        console.log('❌ Вывод не удался');
      }
    } else {
      console.log('❌ Ошибка получения статуса вывода');
    }
    
    // Проверка всех выводов пользователя
    console.log('\n2️⃣ Проверка всех выводов пользователя');
    const withdrawalsResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/withdrawals`);
    
    if (withdrawalsResponse.ok) {
      const withdrawals = await withdrawalsResponse.json();
      console.log('📋 Все выводы пользователя:', withdrawals.length, 'записей');
      
      withdrawals.forEach((w, index) => {
        console.log(`   ${index + 1}. ID: ${w.withdrawalId}`);
        console.log(`      Сумма: ${w.amount} DEL`);
        console.log(`      Статус: ${w.status}`);
        console.log(`      Адрес: ${w.toAddress}`);
        console.log(`      TX Hash: ${w.txHash || 'Нет'}`);
        console.log(`      Запрошен: ${w.requestedAt}`);
        console.log(`      Обработан: ${w.processedAt || 'Нет'}`);
        console.log('');
      });
    } else {
      console.log('❌ Ошибка получения истории выводов');
    }
    
    // Проверка мониторинга блокчейна
    console.log('\n3️⃣ Проверка мониторинга блокчейна');
    const infoResponse = await fetch('https://tapdel.onrender.com/api/decimal/info');
    
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      console.log('✅ DecimalChain статус:', {
        workingAddress: info.workingAddress,
        workingBalance: info.workingBalance,
        chainId: info.chainId,
        confirmationsRequired: info.confirmationsRequired
      });
    } else {
      console.log('❌ Ошибка получения информации о блокчейне');
    }
    
    // Проверка логов сервера
    console.log('\n4️⃣ Проверка логов сервера');
    console.log('📋 Возможные причины задержки:');
    console.log('   - Мониторинг блокчейна может быть приостановлен');
    console.log('   - Недостаточно газа для транзакции');
    console.log('   - Проблемы с DecimalChain RPC');
    console.log('   - Транзакция в очереди на обработку');
    
    // Проверка баланса рабочего кошелька
    console.log('\n5️⃣ Проверка баланса рабочего кошелька');
    const balanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/balance`);
    
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('💰 Балансы:', {
        gameBalance: balance.gameBalance,
        workingWalletBalance: balance.workingWalletBalance
      });
      
      if (balance.workingWalletBalance < 2222) {
        console.log('⚠️ Недостаточно средств в рабочем кошельке для вывода!');
        console.log(`   Нужно: 2222 DEL`);
        console.log(`   Доступно: ${balance.workingWalletBalance} DEL`);
      } else {
        console.log('✅ Достаточно средств в рабочем кошельке');
      }
    }
    
    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверьте логи сервера на наличие ошибок');
    console.log('2. Убедитесь, что мониторинг блокчейна активен');
    console.log('3. Проверьте баланс рабочего кошелька');
    console.log('4. Дождитесь обработки транзакции (может занять время)');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error);
    return false;
  }
}

// Запускаем проверку если скрипт вызван напрямую
if (require.main === module) {
  checkWithdrawalStatus()
    .then(success => {
      if (success) {
        console.log('\n🎉 ПРОВЕРКА СТАТУСА ЗАВЕРШЕНА!');
        process.exit(0);
      } else {
        console.log('\n💥 ПРОВЕРКА СТАТУСА ПРОВАЛИЛАСЬ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { checkWithdrawalStatus }; 