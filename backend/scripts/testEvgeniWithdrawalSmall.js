const fetch = require('node-fetch');

async function testEvgeniWithdrawalSmall() {
  console.log('🎯 ТЕСТ ВЫВОДА ДЛЯ EVGENI_KRASNOV (МАЛАЯ СУММА)');
  console.log('==================================================');
  
  const userId = 'telegram-297810833'; // Evgeni_Krasnov
  const amount = 1; // 1 DEL (меньшая сумма для теста)
  const toAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
  
  try {
    // Проверка баланса пользователя
    console.log('\n1️⃣ Проверка баланса пользователя');
    const balanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/balance`);
    
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('✅ Баланс Evgeni_Krasnov:', {
        userId: balance.userId,
        gameBalance: balance.gameBalance,
        workingWalletBalance: balance.workingWalletBalance
      });
      
      // Проверяем достаточно ли средств
      if (balance.gameBalance < amount) {
        console.log(`❌ Недостаточно средств: ${balance.gameBalance} DEL < ${amount} DEL`);
        return false;
      } else {
        console.log(`✅ Достаточно средств: ${balance.gameBalance} DEL >= ${amount} DEL`);
      }
    } else {
      console.log('❌ Ошибка получения баланса');
      return false;
    }
    
    // Создание вывода
    console.log('\n2️⃣ Создание вывода 1 DEL');
    console.log(`📊 Данные вывода:`);
    console.log(`   Пользователь: Evgeni_Krasnov (${userId})`);
    console.log(`   Сумма: ${amount} DEL`);
    console.log(`   Адрес: ${toAddress}`);
    
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
      console.log('✅ ВЫВОД СОЗДАН УСПЕШНО:', {
        withdrawalId: withdrawal.withdrawalId,
        status: withdrawal.status,
        amount: withdrawal.amount,
        toAddress: withdrawal.toAddress
      });
      
      console.log('\n🎉 ВЫВОД 1 DEL ОТПРАВЛЕН!');
      console.log('📋 Детали транзакции:');
      console.log(`   ID вывода: ${withdrawal.withdrawalId}`);
      console.log(`   Статус: ${withdrawal.status}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Адрес: ${withdrawal.toAddress}`);
      console.log(`   Пользователь: Evgeni_Krasnov`);
      
      console.log('\n💡 Для вывода 2222 DEL нужно дождаться сброса rate limiting');
      console.log('⏰ Rate limiting: 3 вывода в 15 минут');
      
    } else {
      const error = await withdrawalResponse.text();
      console.log('❌ Ошибка создания вывода:', error);
      
      if (error.includes('Слишком много запросов')) {
        console.log('⚠️ Rate limiting активен - попробуйте позже');
        console.log('⏰ Ожидание: 15 минут для сброса лимита');
      } else if (error.includes('Недостаточно средств')) {
        console.log('⚠️ Недостаточно средств на балансе');
      } else {
        console.log('❌ Неизвестная ошибка');
      }
      return false;
    }
    
    // Проверка обновленного баланса
    console.log('\n3️⃣ Проверка обновленного баланса');
    const updatedBalanceResponse = await fetch(`https://tapdel.onrender.com/api/decimal/users/${userId}/balance`);
    
    if (updatedBalanceResponse.ok) {
      const updatedBalance = await updatedBalanceResponse.json();
      console.log('✅ Обновленный баланс:', {
        userId: updatedBalance.userId,
        gameBalance: updatedBalance.gameBalance,
        workingWalletBalance: updatedBalance.workingWalletBalance
      });
    } else {
      console.log('❌ Ошибка получения обновленного баланса');
    }
    
    console.log('\n🎯 ТЕСТ ЗАВЕРШЕН!');
    console.log('✅ Вывод 1 DEL от Evgeni_Krasnov создан');
    console.log('🚀 Транзакция отправлена в обработку');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования вывода:', error);
    return false;
  }
}

// Запускаем тест если скрипт вызван напрямую
if (require.main === module) {
  testEvgeniWithdrawalSmall()
    .then(success => {
      if (success) {
        console.log('\n🎉 ТЕСТ ВЫВОДА ПРОШЕЛ УСПЕШНО!');
        console.log('✅ 1 DEL отправлен на адрес 0xd6187dD54DF3002D5C82043b81EdE74187A5A647');
        process.exit(0);
      } else {
        console.log('\n💥 ТЕСТ ВЫВОДА ПРОВАЛИЛСЯ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testEvgeniWithdrawalSmall }; 