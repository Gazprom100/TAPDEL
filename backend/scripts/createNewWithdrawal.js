const fetch = require('node-fetch');

async function createNewWithdrawal() {
  console.log('🆕 СОЗДАНИЕ НОВОГО ВЫВОДА 2222 DEL');
  console.log('====================================');
  
  const userId = 'telegram-297810833';
  const toAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
  const amount = 2222;
  
  try {
    // Проверяем баланс пользователя
    console.log('\n1️⃣ Проверка баланса пользователя');
    const balanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/balance`);
    
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('✅ Баланс пользователя:', {
        userId: balance.userId,
        gameBalance: balance.gameBalance,
        workingWalletBalance: balance.workingWalletBalance
      });
      
      if (balance.gameBalance < amount) {
        console.log(`❌ Недостаточно средств: ${balance.gameBalance} < ${amount}`);
        return false;
      }
      
      console.log(`✅ Достаточно средств: ${balance.gameBalance} >= ${amount}`);
    } else {
      console.log('❌ Ошибка получения баланса');
      return false;
    }
    
    // Создаем вывод
    console.log('\n2️⃣ Создание вывода 2222 DEL');
    const withdrawalResponse = await fetch('https://tapdel.onrender.com/api/decimal/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        toAddress: toAddress,
        amount: amount
      })
    });
    
    if (withdrawalResponse.ok) {
      const withdrawal = await withdrawalResponse.json();
      console.log('✅ Вывод создан успешно:', {
        withdrawalId: withdrawal.withdrawalId,
        status: withdrawal.status,
        amount: withdrawal.amount,
        toAddress: withdrawal.toAddress
      });
      
      // Проверяем обновленный баланс
      console.log('\n3️⃣ Проверка обновленного баланса');
      const newBalanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/balance`);
      
      if (newBalanceResponse.ok) {
        const newBalance = await newBalanceResponse.json();
        console.log('✅ Обновленный баланс:', {
          userId: newBalance.userId,
          gameBalance: newBalance.gameBalance,
          workingWalletBalance: newBalance.workingWalletBalance
        });
        
        const balanceReduction = balance.gameBalance - newBalance.gameBalance;
        console.log(`💰 Списано с баланса: ${balanceReduction} DEL`);
      }
      
      // Ждем немного и проверяем статус
      console.log('\n4️⃣ Ожидание обработки (10 секунд)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const statusResponse = await fetch(`https://tapdel.onrender.com/api/decimal/withdrawals/${withdrawal.withdrawalId}`);
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('✅ Статус вывода:', {
          withdrawalId: status.withdrawalId,
          status: status.status,
          txHash: status.txHash,
          processedAt: status.processedAt
        });
        
        if (status.status === 'sent' && status.txHash) {
          console.log('🎉 ВЫВОД ОТПРАВЛЕН В БЛОКЧЕЙН!');
          console.log(`🔗 TX Hash: ${status.txHash}`);
          console.log(`📊 Сумма: ${status.amount} DEL`);
          console.log(`📍 Адрес: ${status.toAddress}`);
        } else if (status.status === 'processing') {
          console.log('⏳ Вывод в обработке...');
          console.log('💡 Может потребоваться время для отправки в блокчейн');
        } else {
          console.log(`⚠️ Неожиданный статус: ${status.status}`);
        }
      }
      
      return true;
      
    } else {
      const error = await withdrawalResponse.text();
      console.log('❌ Ошибка создания вывода:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания вывода:', error);
    return false;
  }
}

// Запускаем создание если скрипт вызван напрямую
if (require.main === module) {
  createNewWithdrawal()
    .then(success => {
      if (success) {
        console.log('\n🎉 НОВЫЙ ВЫВОД СОЗДАН УСПЕШНО!');
        console.log('✅ 2222 DEL отправлены в обработку');
        process.exit(0);
      } else {
        console.log('\n💥 СОЗДАНИЕ ВЫВОДА ПРОВАЛИЛОСЬ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { createNewWithdrawal }; 