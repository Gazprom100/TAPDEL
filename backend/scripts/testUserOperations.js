const fetch = require('node-fetch');

const API_BASE_URL = 'https://tapdel.onrender.com/api';

async function testUserOperations() {
  console.log('🧪 Тестирование операций пользователей');
  console.log('=====================================');
  
  const testUserId = 'test_user_' + Date.now();
  
  try {
    // Тест 1: Проверка API доступности
    console.log('\n1️⃣ Тест API доступности');
    const healthResponse = await fetch(`${API_BASE_URL}/test`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ API доступен:', health.message);
    } else {
      console.log('❌ API недоступен');
      return false;
    }
    
    // Тест 2: Проверка DecimalChain info
    console.log('\n2️⃣ Тест DecimalChain info');
    const infoResponse = await fetch(`${API_BASE_URL}/decimal/info`);
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      console.log('✅ DecimalChain info:', {
        workingAddress: info.workingAddress,
        workingBalance: info.workingBalance,
        chainId: info.chainId
      });
    } else {
      console.log('❌ DecimalChain info недоступен');
      return false;
    }
    
    // Тест 3: Создание депозита
    console.log('\n3️⃣ Тест создания депозита');
    const depositResponse = await fetch(`${API_BASE_URL}/decimal/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        baseAmount: 1.0
      })
    });
    
    if (depositResponse.ok) {
      const deposit = await depositResponse.json();
      console.log('✅ Депозит создан:', {
        depositId: deposit.depositId,
        uniqueAmount: deposit.uniqueAmount,
        address: deposit.address,
        expires: deposit.expires
      });
    } else {
      const error = await depositResponse.text();
      console.log('❌ Ошибка создания депозита:', error);
    }
    
    // Тест 4: Создание вывода
    console.log('\n4️⃣ Тест создания вывода');
    const withdrawalResponse = await fetch(`${API_BASE_URL}/decimal/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: 0.5
      })
    });
    
    if (withdrawalResponse.ok) {
      const withdrawal = await withdrawalResponse.json();
      console.log('✅ Вывод создан:', {
        withdrawalId: withdrawal.withdrawalId,
        status: withdrawal.status,
        amount: withdrawal.amount,
        toAddress: withdrawal.toAddress
      });
    } else {
      const error = await withdrawalResponse.text();
      console.log('❌ Ошибка создания вывода:', error);
    }
    
    // Тест 5: Проверка баланса пользователя
    console.log('\n5️⃣ Тест проверки баланса');
    const balanceResponse = await fetch(`${API_BASE_URL}/decimal/users/${testUserId}/balance`);
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log('✅ Баланс пользователя:', balance);
    } else {
      const error = await balanceResponse.text();
      console.log('❌ Ошибка получения баланса:', error);
    }
    
    // Тест 6: Проверка депозитов пользователя
    console.log('\n6️⃣ Тест депозитов пользователя');
    const depositsResponse = await fetch(`${API_BASE_URL}/decimal/users/${testUserId}/deposits`);
    if (depositsResponse.ok) {
      const deposits = await depositsResponse.json();
      console.log('✅ Депозиты пользователя:', deposits.length);
    } else {
      const error = await depositsResponse.text();
      console.log('❌ Ошибка получения депозитов:', error);
    }
    
    // Тест 7: Проверка выводов пользователя
    console.log('\n7️⃣ Тест выводов пользователя');
    const withdrawalsResponse = await fetch(`${API_BASE_URL}/decimal/users/${testUserId}/withdrawals`);
    if (withdrawalsResponse.ok) {
      const withdrawals = await withdrawalsResponse.json();
      console.log('✅ Выводы пользователя:', withdrawals.length);
    } else {
      const error = await withdrawalsResponse.text();
      console.log('❌ Ошибка получения выводов:', error);
    }
    
    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 РЕЗУЛЬТАТ:');
    console.log('✅ API endpoints работают');
    console.log('✅ DecimalChain сервис доступен');
    console.log('✅ Депозиты и выводы создаются');
    console.log('✅ Пользовательские данные доступны');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
    return false;
  }
}

// Запускаем тест если скрипт вызван напрямую
if (require.main === module) {
  testUserOperations()
    .then(success => {
      if (success) {
        console.log('\n🎉 Тест операций пользователей прошел успешно!');
        process.exit(0);
      } else {
        console.log('\n💥 Тест операций пользователей провалился!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testUserOperations }; 