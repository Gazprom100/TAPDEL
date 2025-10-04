require('dotenv').config();
const { MongoClient } = require('mongodb');

async function cleanupTestUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('tapdel');
    
    console.log('🧹 Начинаем очистку тестовых пользователей...');
    
    // Удаляем пользователей с тестовыми userId
    const testUserPatterns = [
      /^test/i,
      /^demo/i,
      /^example/i,
      /^user\d+$/i,
      /^player\d+$/i,
      /^admin_test/i,
      /^temp_/i
    ];
    
    let deletedCount = 0;
    
    for (const pattern of testUserPatterns) {
      const result = await db.collection('users').deleteMany({
        userId: { $regex: pattern }
      });
      
      if (result.deletedCount > 0) {
        console.log(`✅ Удалено ${result.deletedCount} пользователей с паттерном ${pattern}`);
        deletedCount += result.deletedCount;
      }
    }
    
    // Удаляем пользователей с тестовыми telegramId
    const testTelegramPatterns = [
      /^123456789$/,
      /^987654321$/,
      /^555666777$/
    ];
    
    for (const pattern of testTelegramPatterns) {
      const result = await db.collection('users').deleteMany({
        'profile.telegramId': { $regex: pattern }
      });
      
      if (result.deletedCount > 0) {
        console.log(`✅ Удалено ${result.deletedCount} пользователей с telegramId ${pattern}`);
        deletedCount += result.deletedCount;
      }
    }
    
    // Удаляем пользователей с тестовыми именами
    const testNamePatterns = [
      /^test/i,
      /^demo/i,
      /^example/i,
      /^user\d+$/i,
      /^player\d+$/i
    ];
    
    for (const pattern of testNamePatterns) {
      const result = await db.collection('users').deleteMany({
        $or: [
          { 'profile.username': { $regex: pattern } },
          { 'profile.telegramUsername': { $regex: pattern } }
        ]
      });
      
      if (result.deletedCount > 0) {
        console.log(`✅ Удалено ${result.deletedCount} пользователей с именем ${pattern}`);
        deletedCount += result.deletedCount;
      }
    }
    
    // Удаляем связанные записи из других коллекций
    const collectionsToClean = ['leaderboard', 'deposits', 'withdrawals', 'user_token_balances'];
    
    for (const collectionName of collectionsToClean) {
      let collectionDeletedCount = 0;
      
      for (const pattern of testUserPatterns) {
        const result = await db.collection(collectionName).deleteMany({
          userId: { $regex: pattern }
        });
        
        if (result.deletedCount > 0) {
          collectionDeletedCount += result.deletedCount;
        }
      }
      
      if (collectionDeletedCount > 0) {
        console.log(`✅ Удалено ${collectionDeletedCount} записей из ${collectionName}`);
      }
    }
    
    console.log(`🎉 Очистка завершена! Всего удалено: ${deletedCount} тестовых пользователей и связанных записей`);
    
    // Показываем статистику
    const totalUsers = await db.collection('users').countDocuments();
    const totalLeaderboard = await db.collection('leaderboard').countDocuments();
    const totalDeposits = await db.collection('deposits').countDocuments();
    const totalWithdrawals = await db.collection('withdrawals').countDocuments();
    
    console.log('\n📊 Статистика после очистки:');
    console.log(`- Пользователей: ${totalUsers}`);
    console.log(`- Записей в лидерборде: ${totalLeaderboard}`);
    console.log(`- Депозитов: ${totalDeposits}`);
    console.log(`- Выводов: ${totalWithdrawals}`);
    
  } catch (error) {
    console.error('❌ Ошибка очистки тестовых пользователей:', error);
  } finally {
    await client.close();
  }
}

cleanupTestUsers(); 