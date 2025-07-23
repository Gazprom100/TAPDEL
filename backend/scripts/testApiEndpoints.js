const fetch = require('node-fetch');

async function testApiEndpoints() {
  console.log('🧪 ТЕСТИРОВАНИЕ API ЭНДПОИНТОВ');
  console.log('=====================================');
  
  const baseUrl = 'https://tapdel.onrender.com/api/decimal';
  const testUserId = 'telegram-297810833';
  
  try {
    // 1. Тест создания депозита
    console.log('\n1️⃣ Тест создания депозита...');
    const depositResponse = await fetch(`${baseUrl}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        baseAmount: 1000
      })
    });
    
    console.log(`📊 Статус ответа: ${depositResponse.status}`);
    
    if (depositResponse.ok) {
      const deposit = await depositResponse.json();
      console.log('✅ Депозит создан успешно:');
      console.log(`   ID: ${deposit.depositId}`);
      console.log(`   Сумма: ${deposit.amountRequested} DEL`);
      console.log(`   Уникальная сумма: ${deposit.uniqueAmount} DEL`);
      console.log(`   Адрес: ${deposit.address}`);
      console.log(`   Истекает: ${deposit.expires}`);
    } else {
      const error = await depositResponse.text();
      console.log('❌ Ошибка создания депозита:', error);
    }
    
    // 2. Тест создания вывода
    console.log('\n2️⃣ Тест создания вывода...');
    const withdrawalResponse = await fetch(`${baseUrl}/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: '0xd6187dD54DF3002D5C82043b81EdE74187A5A647',
        amount: 100
      })
    });
    
    console.log(`📊 Статус ответа: ${withdrawalResponse.status}`);
    
    if (withdrawalResponse.ok) {
      const withdrawal = await withdrawalResponse.json();
      console.log('✅ Вывод создан успешно:');
      console.log(`   ID: ${withdrawal.withdrawalId}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Адрес: ${withdrawal.toAddress}`);
      console.log(`   Статус: ${withdrawal.status}`);
    } else {
      const error = await withdrawalResponse.text();
      console.log('❌ Ошибка создания вывода:', error);
    }
    
    // 3. Тест получения депозитов пользователя
    console.log('\n3️⃣ Тест получения депозитов пользователя...');
    const depositsResponse = await fetch(`${baseUrl}/deposits?userId=${testUserId}`);
    
    console.log(`📊 Статус ответа: ${depositsResponse.status}`);
    
    if (depositsResponse.ok) {
      const deposits = await depositsResponse.json();
      console.log(`✅ Найдено депозитов: ${deposits.length}`);
      deposits.forEach((deposit, index) => {
        console.log(`   ${index + 1}. ${deposit.amountRequested} DEL - ${deposit.status}`);
      });
    } else {
      const error = await depositsResponse.text();
      console.log('❌ Ошибка получения депозитов:', error);
    }
    
    // 4. Тест получения выводов пользователя
    console.log('\n4️⃣ Тест получения выводов пользователя...');
    const withdrawalsResponse = await fetch(`${baseUrl}/withdrawals?userId=${testUserId}`);
    
    console.log(`📊 Статус ответа: ${withdrawalsResponse.status}`);
    
    if (withdrawalsResponse.ok) {
      const withdrawals = await withdrawalsResponse.json();
      console.log(`✅ Найдено выводов: ${withdrawals.length}`);
      withdrawals.forEach((withdrawal, index) => {
        console.log(`   ${index + 1}. ${withdrawal.amount} DEL - ${withdrawal.status}`);
      });
    } else {
      const error = await withdrawalsResponse.text();
      console.log('❌ Ошибка получения выводов:', error);
    }
    
    console.log('\n✅ Тестирование завершено');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testApiEndpoints(); 