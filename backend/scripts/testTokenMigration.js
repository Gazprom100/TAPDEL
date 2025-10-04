const { connectToDatabase } = require('../config/database');
const tokenService = require('../services/tokenService');
const tokenBalanceService = require('../services/tokenBalanceService');

async function testTokenMigration() {
  try {
    console.log('🧪 ТЕСТ МИГРАЦИИ ТОКЕНОВ');
    console.log('==========================');
    
    // Подключаемся к базе данных
    const database = await connectToDatabase();
    console.log('✅ База данных подключена');
    
    // Получаем текущий активный токен
    const activeToken = await tokenService.getActiveToken();
    console.log(`🪙 Текущий активный токен: ${activeToken.symbol}`);
    
    // Получаем всех пользователей
    const users = await database.collection('users').find({}).limit(5).toArray();
    console.log(`📊 Найдено ${users.length} пользователей для тестирования`);
    
    // Показываем текущие балансы
    for (const user of users) {
      const currentBalance = user.gameState?.tokens || 0;
      console.log(`   ${user.userId}: ${currentBalance} ${activeToken.symbol}`);
    }
    
    // Получаем все токены
    const allTokens = await tokenService.getAllTokens();
    console.log('\n📋 Доступные токены:');
    allTokens.forEach(token => {
      console.log(`   ${token.symbol}: ${token.isActive ? 'АКТИВЕН' : 'неактивен'}`);
    });
    
    // Тестируем миграцию (если есть другие токены)
    const inactiveTokens = allTokens.filter(t => !t.isActive);
    if (inactiveTokens.length > 0) {
      const testToken = inactiveTokens[0];
      console.log(`\n🔄 Тестируем миграцию на ${testToken.symbol}...`);
      
      // Активируем тестовый токен
      const success = await tokenService.activateToken(testToken.symbol);
      
      if (success) {
        console.log(`✅ Токен ${testToken.symbol} активирован`);
        
        // Проверяем новые балансы
        const newActiveToken = await tokenService.getActiveToken();
        console.log(`🪙 Новый активный токен: ${newActiveToken.symbol}`);
        
        // Показываем обновленные балансы
        for (const user of users) {
          const updatedUser = await database.collection('users').findOne({ userId: user.userId });
          const newBalance = updatedUser.gameState?.tokens || 0;
          console.log(`   ${user.userId}: ${newBalance} ${newActiveToken.symbol}`);
        }
        
        // Возвращаем обратно исходный токен
        console.log(`\n🔄 Возвращаем исходный токен ${activeToken.symbol}...`);
        await tokenService.activateToken(activeToken.symbol);
        console.log(`✅ Исходный токен восстановлен`);
        
      } else {
        console.log(`❌ Ошибка активации токена ${testToken.symbol}`);
      }
    } else {
      console.log('⚠️ Нет неактивных токенов для тестирования');
    }
    
    console.log('\n🎉 Тест миграции завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testTokenMigration(); 