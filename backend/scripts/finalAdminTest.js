async function finalAdminTest() {
  try {
    console.log('🔍 ФИНАЛЬНЫЙ ТЕСТ ИСПРАВЛЕННЫХ ФУНКЦИЙ АДМИНКИ');
    console.log('=============================================');
    
    const { default: fetch } = await import('node-fetch');
    const baseUrl = 'http://localhost:3001/api';
    
    const testEndpoint = async (name, url) => {
      try {
        const response = await fetch(`${baseUrl}${url}`);
        const data = await response.json();
        
        if (response.ok && data.error !== 'Маршрут не найден') {
          console.log(`✅ ${name}: Работает`);
          return true;
        } else {
          console.log(`❌ ${name}: ${data.error || 'Ошибка'}`);
          return false;
        }
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        return false;
      }
    };
    
    console.log('\n📊 ТЕСТИРУЕМ РАНЕЕ НЕРАБОТАЮЩИЕ ФУНКЦИИ:');
    
    const tests = [
      ['Общая статистика', '/admin/stats'],
      ['Системный мониторинг', '/admin/system'],
      ['Экономические метрики', '/admin/economy'],
      ['Детали пользователя', '/admin/users/telegram-6150470325'],
      ['Статус Decimal', '/decimal/status'],
      ['Депозиты Decimal', '/decimal/deposits'], 
      ['Выводы Decimal', '/decimal/withdrawals']
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const [name, url] of tests) {
      const success = await testEndpoint(name, url);
      if (success) passed++;
    }
    
    // Тест массовых операций
    try {
      const response = await fetch(`${baseUrl}/admin/users/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'test',
          userIds: ['test-user']
        })
      });
      
      const data = await response.json();
      if (response.ok && data.message) {
        console.log(`✅ Массовые операции: Работают`);
        passed++;
      } else {
        console.log(`❌ Массовые операции: ${data.error || 'Ошибка'}`);
      }
    } catch (error) {
      console.log(`❌ Массовые операции: ${error.message}`);
    }
    total++;
    
    console.log('\n📈 РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЙ:');
    console.log(`✅ Исправлено: ${passed}/${total} функций`);
    console.log(`📊 Успешность: ${Math.round((passed/total) * 100)}%`);
    
    if (passed === total) {
      console.log('\n🎉 ВСЕ РАНЕЕ НЕРАБОТАЮЩИЕ ФУНКЦИИ ТЕПЕРЬ ИСПРАВЛЕНЫ!');
    } else {
      console.log('\n⚠️ Некоторые функции все еще требуют доработки');
    }
    
  } catch (error) {
    console.error('❌ Ошибка финального теста:', error);
  }
}

finalAdminTest(); 