const fetch = require('node-fetch');

// API endpoints to test
const API_ENDPOINTS = [
  {
    name: 'Health Check',
    url: '/api/health',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Test Endpoint',
    url: '/api/test',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Leaderboard',
    url: '/api/leaderboard',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Admin Statistics',
    url: '/api/admin/statistics',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Admin Settings',
    url: '/api/admin/settings',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Token Configuration',
    url: '/api/admin/tokens',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: 'Active Token',
    url: '/api/active-token',
    method: 'GET',
    expectedStatus: 200
  }
];

// Test user data
const TEST_USER = {
  userId: 'test-user-' + Date.now(),
  profile: {
    username: 'Test User',
    telegramId: 123456789,
    telegramFirstName: 'Test',
    telegramLastName: 'User',
    telegramUsername: 'testuser'
  },
  gameState: {
    tokens: 1000,
    highScore: 500,
    engineLevel: 'Mk I',
    gearboxLevel: 'L1',
    batteryLevel: 'B1',
    hyperdriveLevel: 'H1',
    powerGridLevel: 'P1',
    lastSaved: new Date()
  }
};

async function checkApi(baseUrl) {
  console.log(`🔍 Проверка API по адресу: ${baseUrl}`);
  
  const results = [];
  
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`\n📡 Тестирование: ${endpoint.name}`);
      console.log(`   URL: ${baseUrl}${endpoint.url}`);
      
      const response = await fetch(`${baseUrl}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const status = response.status;
      const isSuccess = status === endpoint.expectedStatus;
      
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
      
      console.log(`   Статус: ${status} ${isSuccess ? '✅' : '❌'}`);
      console.log(`   Ожидался: ${endpoint.expectedStatus}`);
      
      if (data && typeof data === 'object') {
        console.log(`   Ответ: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   Ответ: ${String(data).substring(0, 200)}...`);
      }
      
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status,
        expectedStatus: endpoint.expectedStatus,
        success: isSuccess,
        data
      });
      
    } catch (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        expectedStatus: endpoint.expectedStatus,
        success: false,
        error: error.message
      });
    }
  }
  
  // Test user operations
  console.log('\n👤 Тестирование операций с пользователем...');
  
  try {
    // Create user
    console.log('   Создание тестового пользователя...');
    const createResponse = await fetch(`${baseUrl}/api/users/${TEST_USER.userId}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    if (createResponse.ok) {
      console.log('   ✅ Пользователь создан успешно');
      
      // Get user
      console.log('   Получение пользователя...');
      const getResponse = await fetch(`${baseUrl}/api/users/${TEST_USER.userId}`);
      if (getResponse.ok) {
        console.log('   ✅ Пользователь получен успешно');
        
        // Update game state
        console.log('   Обновление игрового состояния...');
        const updateResponse = await fetch(`${baseUrl}/api/users/${TEST_USER.userId}/gamestate`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...TEST_USER.gameState,
            tokens: 1500,
            highScore: 750
          })
        });
        
        if (updateResponse.ok) {
          console.log('   ✅ Игровое состояние обновлено успешно');
        } else {
          console.log(`   ❌ Ошибка обновления игрового состояния: ${updateResponse.status}`);
        }
      } else {
        console.log(`   ❌ Ошибка получения пользователя: ${getResponse.status}`);
      }
    } else {
      console.log(`   ❌ Ошибка создания пользователя: ${createResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Ошибка операций с пользователем: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 Результаты проверки API:');
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`   Успешно: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('   🎉 Все тесты прошли успешно!');
  } else {
    console.log('   ⚠️ Некоторые тесты не прошли. Проверьте логи выше.');
  }
  
  return results;
}

// Запуск проверки
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3001';
  
  checkApi(baseUrl)
    .then((results) => {
      console.log('\n✅ Проверка API завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка при проверке API:', error);
      process.exit(1);
    });
}

module.exports = { checkApi };
