const { connectToDatabase } = require('../config/database');
const tokenService = require('../services/tokenService');
const tokenBalanceService = require('../services/tokenBalanceService');

async function checkTokenSystem() {
  try {
    console.log('🔍 ПРОВЕРКА СИСТЕМЫ ТОКЕНОВ');
    console.log('=============================');
    
    // Подключаемся к базе данных
    const database = await connectToDatabase();
    console.log('✅ База данных подключена');
    
    // 1. Проверяем активный токен
    console.log('\n1️⃣ ПРОВЕРКА АКТИВНОГО ТОКЕНА');
    const activeToken = await tokenService.getActiveToken();
    console.log(`🪙 Активный токен: ${activeToken.symbol}`);
    console.log(`   Адрес: ${activeToken.address}`);
    console.log(`   Название: ${activeToken.name}`);
    
    // 2. Проверяем все токены
    console.log('\n2️⃣ ПРОВЕРКА ВСЕХ ТОКЕНОВ');
    const allTokens = await tokenService.getAllTokens();
    allTokens.forEach(token => {
      console.log(`   ${token.symbol}: ${token.isActive ? 'АКТИВЕН' : 'неактивен'} (${token.address})`);
    });
    
    // 3. Проверяем балансы пользователей
    console.log('\n3️⃣ ПРОВЕРКА БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ');
    const users = await database.collection('users').find({}).limit(3).toArray();
    for (const user of users) {
      const balance = user.gameState?.tokens || 0;
      console.log(`   ${user.userId}: ${balance} ${activeToken.symbol}`);
    }
    
    // 4. Проверяем историю токенов
    console.log('\n4️⃣ ПРОВЕРКА ИСТОРИИ ТОКЕНОВ');
    const tokenHistory = await database.collection('token_history').find({}).sort({ changedAt: -1 }).limit(5).toArray();
    console.log(`   Последние ${tokenHistory.length} изменений:`);
    tokenHistory.forEach(change => {
      console.log(`   ${change.changedAt.toLocaleString()}: ${change.symbol} - ${change.reason}`);
    });
    
    // 5. Проверяем балансы по токенам
    console.log('\n5️⃣ ПРОВЕРКА БАЛАНСОВ ПО ТОКЕНАМ');
    if (users.length > 0) {
      const testUser = users[0];
      const tokenBalances = await tokenBalanceService.getAllUserTokenBalances(testUser.userId);
      console.log(`   Балансы пользователя ${testUser.userId}:`);
      tokenBalances.forEach(balance => {
        console.log(`     ${balance.tokenSymbol}: ${balance.balance} (активен: ${balance.isActive})`);
      });
    }
    
    // 6. Тестируем API
    console.log('\n6️⃣ ТЕСТИРОВАНИЕ API');
    const { default: fetch } = await import('node-fetch');
    
    try {
      const response = await fetch('http://localhost:3001/api/active-token');
      const data = await response.json();
      console.log(`   API ответ: ${JSON.stringify(data)}`);
    } catch (error) {
      console.log(`   ❌ Ошибка API: ${error.message}`);
    }
    
    console.log('\n🎉 Проверка системы токенов завершена!');
    console.log('\n📋 РЕЗЮМЕ:');
    console.log(`   • Активный токен: ${activeToken.symbol}`);
    console.log(`   • Всего токенов: ${allTokens.length}`);
    console.log(`   • Пользователей проверено: ${users.length}`);
    console.log(`   • История изменений: ${tokenHistory.length} записей`);
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  }
}

checkTokenSystem(); 