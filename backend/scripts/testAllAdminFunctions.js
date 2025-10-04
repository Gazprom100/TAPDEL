const { connectToDatabase } = require('../config/database');

async function testAllAdminFunctions() {
  try {
    console.log('🔍 КОМПЛЕКСНАЯ ПРОВЕРКА ВСЕХ ФУНКЦИЙ АДМИНКИ');
    console.log('===============================================');
    
    const { default: fetch } = await import('node-fetch');
    
    const baseUrl = 'http://localhost:3001/api';
    let failedTests = [];
    let passedTests = [];
    
    // Функция для тестирования API endpoint
    const testEndpoint = async (name, method, url, body = null) => {
      try {
        const options = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (body) {
          options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${baseUrl}${url}`, options);
        const data = await response.json();
        
        if (response.ok && data.success !== false) {
          console.log(`✅ ${name}: Работает`);
          passedTests.push(name);
          return { success: true, data };
        } else {
          console.log(`❌ ${name}: Ошибка - ${data.error || 'Неизвестная ошибка'}`);
          failedTests.push(`${name}: ${data.error || 'HTTP ' + response.status}`);
          return { success: false, data };
        }
      } catch (error) {
        console.log(`❌ ${name}: Исключение - ${error.message}`);
        failedTests.push(`${name}: ${error.message}`);
        return { success: false, error: error.message };
      }
    };
    
    console.log('\n1️⃣ ПРОВЕРКА СТАТИСТИКИ И АНАЛИТИКИ');
    console.log('=====================================');
    
    await testEndpoint('Общая статистика', 'GET', '/admin/stats');
    await testEndpoint('Пользователи', 'GET', '/admin/users');
    await testEndpoint('Транзакции', 'GET', '/admin/transactions');
    await testEndpoint('Системный мониторинг', 'GET', '/admin/system');
    await testEndpoint('Экономические метрики', 'GET', '/admin/economy');
    await testEndpoint('Логи системы', 'GET', '/admin/logs');
    
    console.log('\n2️⃣ ПРОВЕРКА ТОКЕНОВ');
    console.log('=====================');
    
    await testEndpoint('Получить токены', 'GET', '/admin/tokens');
    await testEndpoint('История токенов', 'GET', '/admin/tokens/history');
    await testEndpoint('Активный токен', 'GET', '/active-token');
    
    // Тест добавления токена
    const newToken = {
      symbol: 'TEST',
      address: '0x1234567890123456789012345678901234567890',
      decimals: 18,
      name: 'Test Token'
    };
    await testEndpoint('Добавить токен', 'POST', '/admin/tokens/add', newToken);
    
    // Тест активации токена (вернем исходный)
    const currentToken = await testEndpoint('Получить текущий токен', 'GET', '/active-token');
    if (currentToken.success) {
      const currentSymbol = currentToken.data.token.symbol;
      await testEndpoint('Активация токена', 'POST', '/admin/tokens/activate', { symbol: currentSymbol });
    }
    
    console.log('\n3️⃣ ПРОВЕРКА УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ');
    console.log('=====================================');
    
    // Получить первого пользователя для тестов
    const usersResponse = await testEndpoint('Список пользователей', 'GET', '/admin/users');
    let testUserId = null;
    
    if (usersResponse.success && usersResponse.data.users.length > 0) {
      testUserId = usersResponse.data.users[0].userId;
      console.log(`📋 Используем для тестов пользователя: ${testUserId}`);
      
      // Тест операций с пользователем
      await testEndpoint('Детали пользователя', 'GET', `/admin/users/${testUserId}`);
      await testEndpoint('Обновить пользователя', 'PUT', `/admin/users/${testUserId}`, {
        tokens: 1000,
        engineLevel: 2
      });
      await testEndpoint('Проверить обновления', 'GET', `/admin/users/${testUserId}`);
    } else {
      console.log('⚠️ Нет пользователей для тестирования операций');
    }
    
    console.log('\n4️⃣ ПРОВЕРКА ДОПОЛНИТЕЛЬНЫХ ФУНКЦИЙ');
    console.log('====================================');
    
    await testEndpoint('Очистить кеш токенов', 'POST', '/admin/tokens/clear-cache');
    
    // Тест массовых операций
    await testEndpoint('Массовые операции пользователей', 'POST', '/admin/users/bulk', {
      operation: 'test',
      userIds: [testUserId || 'test-user'],
      value: 100
    });
    
    console.log('\n5️⃣ ПРОВЕРКА ИНТЕГРАЦИЙ');
    console.log('========================');
    
    // Проверка Decimal API (если доступно)
    await testEndpoint('Статус Decimal', 'GET', '/decimal/status');
    await testEndpoint('Депозиты Decimal', 'GET', '/decimal/deposits');
    await testEndpoint('Выводы Decimal', 'GET', '/decimal/withdrawals');
    
    console.log('\n6️⃣ ПРОВЕРКА БАЗЫ ДАННЫХ');
    console.log('=========================');
    
    try {
      const database = await connectToDatabase();
      console.log('✅ Подключение к базе данных: Работает');
      
      // Проверка коллекций
      const collections = ['users', 'system_config', 'token_history', 'user_token_balances', 'transactions', 'deposits', 'withdrawals'];
      
      for (const collection of collections) {
        try {
          const count = await database.collection(collection).countDocuments();
          console.log(`✅ Коллекция ${collection}: ${count} документов`);
          passedTests.push(`БД: ${collection}`);
        } catch (error) {
          console.log(`❌ Коллекция ${collection}: Ошибка - ${error.message}`);
          failedTests.push(`БД: ${collection} - ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ База данных: ${error.message}`);
      failedTests.push(`База данных: ${error.message}`);
    }
    
    console.log('\n7️⃣ ИТОГОВЫЙ ОТЧЕТ');
    console.log('==================');
    
    console.log(`\n📊 СТАТИСТИКА ТЕСТОВ:`);
    console.log(`✅ Прошли: ${passedTests.length}`);
    console.log(`❌ Не прошли: ${failedTests.length}`);
    console.log(`📈 Успешность: ${Math.round((passedTests.length / (passedTests.length + failedTests.length)) * 100)}%`);
    
    if (failedTests.length > 0) {
      console.log(`\n❌ НЕРАБОТАЮЩИЕ ФУНКЦИИ:`);
      failedTests.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test}`);
      });
      
      console.log(`\n🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:`);
      if (failedTests.some(test => test.includes('404') || test.includes('Маршрут не найден'))) {
        console.log(`   • Проверить регистрацию роутов в server.js`);
      }
      if (failedTests.some(test => test.includes('БД'))) {
        console.log(`   • Проверить подключение к MongoDB`);
      }
      if (failedTests.some(test => test.includes('Decimal'))) {
        console.log(`   • Проверить конфигурацию Decimal API`);
      }
      if (failedTests.some(test => test.includes('ECONNREFUSED'))) {
        console.log(`   • Убедиться, что сервер запущен на порту 3001`);
      }
    } else {
      console.log(`\n🎉 ВСЕ ФУНКЦИИ АДМИНКИ РАБОТАЮТ ИСПРАВНО!`);
    }
    
    console.log(`\n📋 ДЕТАЛИ РАБОТАЮЩИХ ФУНКЦИЙ:`);
    passedTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test}`);
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

testAllAdminFunctions(); 