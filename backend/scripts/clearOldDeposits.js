const databaseConfig = require('../config/database');

async function clearOldDeposits() {
  try {
    console.log('🧹 ОЧИСТКА СТАРЫХ ДЕПОЗИТОВ');
    console.log('===============================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Удаляем все депозиты
    const depositsResult = await database.collection('deposits').deleteMany({});
    console.log(`🗑️ Удалено депозитов: ${depositsResult.deletedCount}`);
    
    // Удаляем все выводы
    const withdrawalsResult = await database.collection('withdrawals').deleteMany({});
    console.log(`🗑️ Удалено выводов: ${withdrawalsResult.deletedCount}`);
    
    // Проверяем, что коллекции пустые
    const depositsCount = await database.collection('deposits').countDocuments();
    const withdrawalsCount = await database.collection('withdrawals').countDocuments();
    
    console.log(`📊 Статус после очистки:`);
    console.log(`   Депозиты: ${depositsCount}`);
    console.log(`   Выводы: ${withdrawalsCount}`);
    
    console.log('✅ Очистка завершена');
    
  } catch (error) {
    console.error('❌ Ошибка очистки:', error);
  }
}

clearOldDeposits(); 