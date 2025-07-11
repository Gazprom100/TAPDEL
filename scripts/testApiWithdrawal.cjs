require('dotenv').config({ path: './backend/TAPDEL.env' });

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testApiWithdrawal() {
  try {
    const testUserId = 'api_test_user';
    const testAmount = 0.001;
    const testAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';

    console.log('🧪 Тестирование API вывода...\n');

    // 1. Подготовка пользователя через API
    console.log('👤 1. Подготовка тестового пользователя...');
    
    const prepareResponse = await fetch(`${API_BASE_URL}/api/users/${testUserId}/deposit`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || 'default-secret'
      },
      body: JSON.stringify({ amount: 5.0 })
    });

    if (prepareResponse.ok) {
      const prepareData = await prepareResponse.json();
      console.log(`✅ Пользователь подготовлен: баланс ${prepareData.newTokens} DEL`);
    } else {
      throw new Error(`Ошибка подготовки пользователя: ${prepareResponse.status}`);
    }

    // 2. Проверка баланса
    console.log('\n💰 2. Проверка баланса пользователя...');
    
    const balanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ Текущий баланс: ${balanceData.gameBalance} DEL`);
      
      if (balanceData.gameBalance < testAmount) {
        throw new Error(`Недостаточно средств для вывода. Нужно: ${testAmount}, доступно: ${balanceData.gameBalance}`);
      }
    } else {
      throw new Error(`Ошибка получения баланса: ${balanceResponse.status}`);
    }

    // 3. Создание вывода через API
    console.log('\n💸 3. Создание вывода через API...');
    
    const withdrawalResponse = await fetch(`${API_BASE_URL}/api/decimal/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: testAddress,
        amount: testAmount
      })
    });

    if (withdrawalResponse.ok) {
      const withdrawalData = await withdrawalResponse.json();
      console.log(`✅ Вывод создан успешно!`);
      console.log(`   ID: ${withdrawalData.withdrawalId}`);
      console.log(`   Сумма: ${withdrawalData.amount} DEL`);
      console.log(`   Адрес: ${withdrawalData.toAddress}`);
      console.log(`   Статус: ${withdrawalData.status}`);

      // 4. Проверка статуса вывода
      console.log('\n📊 4. Мониторинг статуса вывода...');
      
      let attempts = 0;
      const maxAttempts = 12; // 60 секунд
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд
        attempts++;
        
        const statusResponse = await fetch(`${API_BASE_URL}/api/decimal/withdrawals/${withdrawalData.withdrawalId}`);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`   Попытка ${attempts}: Статус = ${statusData.status}`);
          
          if (statusData.status === 'sent') {
            console.log(`✅ Вывод успешно обработан!`);
            console.log(`   TX Hash: ${statusData.txHash}`);
            console.log(`   Время обработки: ${statusData.processedAt}`);
            break;
          } else if (statusData.status === 'failed') {
            console.log(`❌ Вывод завершился с ошибкой`);
            console.log(`   Время обработки: ${statusData.processedAt}`);
            break;
          }
        } else {
          console.log(`⚠️ Ошибка проверки статуса: ${statusResponse.status}`);
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log(`⏰ Время ожидания истекло после ${maxAttempts * 5} секунд`);
      }

    } else {
      const error = await withdrawalResponse.text();
      throw new Error(`Ошибка создания вывода: ${withdrawalResponse.status} - ${error}`);
    }

    // 5. Финальная проверка баланса
    console.log('\n💰 5. Финальная проверка баланса...');
    
    const finalBalanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (finalBalanceResponse.ok) {
      const finalBalanceData = await finalBalanceResponse.json();
      console.log(`✅ Финальный баланс: ${finalBalanceData.gameBalance} DEL`);
    } else {
      console.log(`⚠️ Ошибка получения финального баланса: ${finalBalanceResponse.status}`);
    }

    console.log('\n🎉 Тест API вывода завершен!');

  } catch (error) {
    console.error('❌ Ошибка тестирования API вывода:', error.message);
  }
}

testApiWithdrawal().catch(console.error); 