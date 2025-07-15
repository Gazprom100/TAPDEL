const config = require('../config/decimal');

async function testDepositWindows() {
  try {
    console.log('🕐 ТЕСТИРОВАНИЕ ВРЕМЕННЫХ ОКОН ДЕПОЗИТОВ');
    console.log('==========================================\n');
    
    // Получаем информацию о временных окнах
    const windowsInfo = config.getDepositWindowsInfo();
    
    console.log('📅 ТЕКУЩЕЕ ВРЕМЯ:');
    console.log(`   UTC: ${new Date().toISOString()}`);
    console.log(`   Локальное: ${new Date().toLocaleString()}`);
    console.log(`   Час UTC: ${windowsInfo.currentHour}:00`);
    console.log(`   Окно активно: ${windowsInfo.isActive ? '✅' : '❌'}`);
    
    console.log('\n🕐 ВРЕМЕННЫЕ ОКНА:');
    console.log('='.repeat(50));
    
    for (const window of windowsInfo.windows) {
      const status = window.isActive ? '🟢 АКТИВНО' : '⚪ НЕАКТИВНО';
      console.log(`${status} ${window.name}:`);
      console.log(`   Время: ${window.startTime} - ${window.endTime}`);
      console.log(`   Статус: ${window.isActive ? 'Открыто для депозитов' : 'Закрыто'}`);
      console.log('-'.repeat(30));
    }
    
    if (!windowsInfo.isActive) {
      console.log('\n⏰ СЛЕДУЮЩЕЕ ОКНО:');
      console.log(`   Название: ${windowsInfo.nextWindow.name}`);
      console.log(`   Время начала: ${windowsInfo.nextWindowStart.toISOString()}`);
      console.log(`   До начала: ${windowsInfo.timeUntilNext} минут`);
      
      // Конвертируем в часы и минуты
      const hours = Math.floor(windowsInfo.timeUntilNext / 60);
      const minutes = windowsInfo.timeUntilNext % 60;
      console.log(`   До начала: ${hours}ч ${minutes}м`);
    }
    
    // Тестируем создание депозита
    console.log('\n🧪 ТЕСТ СОЗДАНИЯ ДЕПОЗИТА:');
    console.log('='.repeat(50));
    
    const testUserId = 'test-user-123';
    const testAmount = 1.0;
    
    if (windowsInfo.isActive) {
      console.log('✅ Окно активно - депозит можно создать');
      
      // Генерируем уникальную сумму
      const uniqueAmount = config.generateUniqueAmount(testAmount, testUserId);
      console.log(`   Базовая сумма: ${testAmount} DEL`);
      console.log(`   Уникальная сумма: ${uniqueAmount} DEL`);
      console.log(`   Адрес: ${config.WORKING_ADDRESS}`);
      
      // Рассчитываем время истечения
      const expiresAt = new Date(Date.now() + config.DEPOSIT_DURATION * 60 * 1000);
      console.log(`   Истекает: ${expiresAt.toISOString()}`);
      console.log(`   Длительность: ${config.DEPOSIT_DURATION} минут`);
      
    } else {
      console.log('❌ Окно неактивно - депозит нельзя создать');
      console.log(`   Следующее окно: ${windowsInfo.nextWindow.name}`);
      console.log(`   Время до следующего окна: ${windowsInfo.timeUntilNext} минут`);
    }
    
    // Показываем все окна на сегодня
    console.log('\n📋 РАСПИСАНИЕ НА СЕГОДНЯ:');
    console.log('='.repeat(50));
    
    const today = new Date();
    const todayWindows = config.DEPOSIT_WINDOWS.map(window => {
      const startTime = new Date(today);
      startTime.setUTCHours(window.start, 0, 0, 0);
      
      const endTime = new Date(today);
      endTime.setUTCHours(window.end, 0, 0, 0);
      
      const isPast = today > endTime;
      const isActive = today >= startTime && today < endTime;
      const isFuture = today < startTime;
      
      let status;
      if (isPast) status = '🕐 ПРОШЛО';
      else if (isActive) status = '🟢 АКТИВНО';
      else status = '⏳ БУДУЩЕЕ';
      
      return {
        ...window,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status
      };
    });
    
    for (const window of todayWindows) {
      console.log(`${window.status} ${window.name}:`);
      console.log(`   ${window.startTime} - ${window.endTime}`);
      console.log('-'.repeat(30));
    }
    
    // Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(50));
    
    if (windowsInfo.isActive) {
      console.log('✅ Сейчас можно создавать депозиты');
      console.log('✅ Мониторинг блоков активен');
      console.log('✅ Система готова к приему транзакций');
    } else {
      console.log('💤 Сейчас нельзя создавать депозиты');
      console.log('💤 Мониторинг блоков приостановлен (если нет активных заявок)');
      console.log('⏰ Дождитесь следующего окна или создайте депозит заранее');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(error.message);
  }
}

testDepositWindows().catch(console.error); 