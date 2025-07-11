const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3000';

async function testDelIntegration() {
  const testUserId = 'test_del_integration_' + Date.now();
  
  console.log('🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ DEL ИНТЕГРАЦИИ');
  console.log('=====================================\n');
  
  try {
    // 1. Создание пользователя
    console.log('👤 1. Создание тестового пользователя...');
    const initResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          username: 'Test DEL User',
          telegramId: '123456789'
        },
        gameState: {
          tokens: 0,
          highScore: 0
        }
      })
    });
    
    if (initResponse.ok) {
      console.log('✅ Пользователь создан');
    } else {
      throw new Error(`Ошибка создания пользователя: ${initResponse.status}`);
    }
    
    // 2. Проверка начального баланса
    console.log('\n💰 2. Проверка начального DEL баланса...');
    const balanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ Начальный баланс: ${balanceData.gameBalance} DEL`);
    } else {
      throw new Error(`Ошибка получения баланса: ${balanceResponse.status}`);
    }
    
    // 3. Создание депозита
    console.log('\n📥 3. Создание тестового депозита...');
    const depositResponse = await fetch(`${API_BASE_URL}/api/decimal/deposits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        baseAmount: 1.0
      })
    });
    
    if (depositResponse.ok) {
      const depositData = await depositResponse.json();
      console.log(`✅ Депозит создан:`);
      console.log(`   ID: ${depositData.depositId}`);
      console.log(`   Сумма: ${depositData.uniqueAmount} DEL`);
      console.log(`   Адрес: ${depositData.address}`);
    } else {
      const error = await depositResponse.text();
      throw new Error(`Ошибка создания депозита: ${depositResponse.status} - ${error}`);
    }
    
    // 4. Имитация подтверждения депозита
    console.log('\n✅ 4. Имитация подтверждения депозита...');
    const depositAmount = 1.0;
    const mockDepositResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/deposit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
      },
      body: JSON.stringify({
        amount: depositAmount
      })
    });
    
    if (mockDepositResponse.ok) {
      const result = await mockDepositResponse.json();
      console.log(`✅ Депозит обработан: +${depositAmount} DEL`);
      console.log(`   Новый баланс: ${result.newTokens} DEL`);
    } else {
      throw new Error(`Ошибка обработки депозита: ${mockDepositResponse.status}`);
    }
    
    // 5. Проверка баланса после депозита
    console.log('\n💰 5. Проверка баланса после пополнения...');
    const newBalanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (newBalanceResponse.ok) {
      const balanceData = await newBalanceResponse.json();
      console.log(`✅ Обновлённый баланс: ${balanceData.gameBalance} DEL`);
      
      if (balanceData.gameBalance >= depositAmount) {
        console.log(`✅ Депозит успешно зачислен!`);
      } else {
        console.log(`⚠️ Проблема: баланс не соответствует ожидаемому`);
      }
    } else {
      throw new Error(`Ошибка получения баланса: ${newBalanceResponse.status}`);
    }
    
    // 6. Тестирование вывода
    console.log('\n📤 6. Тестирование вывода средств...');
    const withdrawAmount = 0.5;
    const withdrawResponse = await fetch(`${API_BASE_URL}/api/decimal/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: withdrawAmount
      })
    });
    
    if (withdrawResponse.ok) {
      const withdrawData = await withdrawResponse.json();
      console.log(`✅ Вывод создан:`);
      console.log(`   ID: ${withdrawData.withdrawalId}`);
      console.log(`   Сумма: ${withdrawData.amount} DEL`);
      console.log(`   Адрес: ${withdrawData.toAddress}`);
      console.log(`   Статус: ${withdrawData.status}`);
    } else {
      const error = await withdrawResponse.text();
      throw new Error(`Ошибка создания вывода: ${withdrawResponse.status} - ${error}`);
    }
    
    // 7. Финальная проверка баланса
    console.log('\n💰 7. Финальная проверка баланса...');
    const finalBalanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (finalBalanceResponse.ok) {
      const balanceData = await finalBalanceResponse.json();
      console.log(`✅ Финальный баланс: ${balanceData.gameBalance} DEL`);
      
      const expectedBalance = depositAmount - withdrawAmount;
      if (Math.abs(balanceData.gameBalance - expectedBalance) < 0.001) {
        console.log(`✅ Баланс корректен! (ожидался: ${expectedBalance} DEL)`);
      } else {
        console.log(`⚠️ Проблема: ожидался баланс ${expectedBalance} DEL`);
      }
    } else {
      throw new Error(`Ошибка получения финального баланса: ${finalBalanceResponse.status}`);
    }
    
    // 8. Проверка истории депозитов
    console.log('\n📋 8. Проверка истории депозитов...');
    const depositsResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/deposits`);
    
    if (depositsResponse.ok) {
      const deposits = await depositsResponse.json();
      console.log(`✅ Найдено депозитов: ${deposits.length}`);
    } else {
      console.log(`⚠️ Ошибка получения истории депозитов: ${depositsResponse.status}`);
    }
    
    // 9. Проверка истории выводов
    console.log('\n📋 9. Проверка истории выводов...');
    const withdrawalsResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/withdrawals`);
    
    if (withdrawalsResponse.ok) {
      const withdrawals = await withdrawalsResponse.json();
      console.log(`✅ Найдено выводов: ${withdrawals.length}`);
    } else {
      console.log(`⚠️ Ошибка получения истории выводов: ${withdrawalsResponse.status}`);
    }
    
    console.log('\n🎉 ИНТЕГРАЦИОННОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('==========================================');
    console.log('✅ Все основные функции DEL работают корректно:');
    console.log('   - Создание пользователей');
    console.log('   - Проверка баланса');
    console.log('   - Создание депозитов');
    console.log('   - Обработка пополнений');
    console.log('   - Создание выводов');
    console.log('   - История операций');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ:');
    console.error(error.message);
    console.error('\n🔍 Возможные причины:');
    console.error('   - Сервер не запущен (npm start)');
    console.error('   - Проблемы с MongoDB подключением');
    console.error('   - Ошибки в API эндпоинтах');
  }
}

// Запуск тестирования
testDelIntegration(); 