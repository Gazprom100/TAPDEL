const { MongoClient } = require('mongodb');

async function testOptimizedMonitoring() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ ОПТИМИЗИРОВАННОГО МОНИТОРИНГА');
    console.log('==============================================\n');
    
    // Подключаемся к базе данных
    const generateCleanMongoURI = () => {
      const username = 'TAPDEL';
      const password = 'fpz%sE62KPzmHfM';
      const cluster = 'cluster0.ejo8obw.mongodb.net';
      const database = 'tapdel';
      
      const encodedPassword = encodeURIComponent(password);
      return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
    };

    const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();
    const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const database = client.db(MONGODB_DB);
    
    console.log('✅ Подключение к MongoDB установлено\n');
    
    // Проверяем активные депозиты
    const activeDeposits = await database.collection('deposits').countDocuments({
      matched: false,
      expiresAt: { $gt: new Date() }
    });
    
    console.log(`📥 АКТИВНЫЕ ДЕПОЗИТЫ: ${activeDeposits}`);
    
    if (activeDeposits > 0) {
      const deposits = await database.collection('deposits').find({
        matched: false,
        expiresAt: { $gt: new Date() }
      }).toArray();
      
      for (const deposit of deposits) {
        const timeLeft = Math.round((deposit.expiresAt - new Date()) / 1000 / 60);
        console.log(`   - ${deposit.userId}: ${deposit.uniqueAmount} DEL (истекает через ${timeLeft} мин)`);
      }
    }
    
    // Проверяем активные выводы
    const queuedWithdrawals = await database.collection('withdrawals').countDocuments({
      status: 'queued'
    });
    
    const processingWithdrawals = await database.collection('withdrawals').countDocuments({
      status: 'processing'
    });
    
    console.log(`\n📤 АКТИВНЫЕ ВЫВОДЫ:`);
    console.log(`   В очереди: ${queuedWithdrawals}`);
    console.log(`   В обработке: ${processingWithdrawals}`);
    
    if (queuedWithdrawals > 0) {
      const withdrawals = await database.collection('withdrawals').find({
        status: 'queued'
      }).toArray();
      
      for (const withdrawal of withdrawals) {
        const timeWaiting = Math.round((new Date() - withdrawal.requestedAt) / 1000 / 60);
        console.log(`   - ${withdrawal.userId}: ${withdrawal.amount} DEL → ${withdrawal.toAddress} (ожидает ${timeWaiting} мин)`);
      }
    }
    
    if (processingWithdrawals > 0) {
      const withdrawals = await database.collection('withdrawals').find({
        status: 'processing'
      }).toArray();
      
      for (const withdrawal of withdrawals) {
        const timeProcessing = Math.round((new Date() - withdrawal.processingStartedAt) / 1000);
        console.log(`   - ${withdrawal.userId}: ${withdrawal.amount} DEL → ${withdrawal.toAddress} (обрабатывается ${timeProcessing} сек)`);
      }
    }
    
    // Проверяем застрявшие выводы
    const stuckWithdrawals = await database.collection('withdrawals').countDocuments({
      status: 'processing',
      processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } // 5 минут
    });
    
    console.log(`\n⚠️ ЗАСТРЯВШИЕ ВЫВОДЫ (>5 мин): ${stuckWithdrawals}`);
    
    if (stuckWithdrawals > 0) {
      const withdrawals = await database.collection('withdrawals').find({
        status: 'processing',
        processingStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
      }).toArray();
      
      for (const withdrawal of withdrawals) {
        const timeStuck = Math.round((new Date() - withdrawal.processingStartedAt) / 1000 / 60);
        console.log(`   - ${withdrawal.userId}: ${withdrawal.amount} DEL (застрял на ${timeStuck} мин)`);
      }
    }
    
    // Рекомендации по мониторингу
    console.log(`\n💡 РЕКОМЕНДАЦИИ ПО МОНИТОРИНГУ:`);
    
    if (activeDeposits === 0 && queuedWithdrawals === 0 && processingWithdrawals === 0) {
      console.log(`   ✅ Нет активных заявок - мониторинг блоков можно приостановить`);
      console.log(`   💤 Система будет работать в режиме ожидания`);
    } else {
      console.log(`   🔍 Есть активные заявки - мониторинг блоков необходим`);
      console.log(`   ⚡ Система будет обрабатывать транзакции в реальном времени`);
    }
    
    if (stuckWithdrawals > 0) {
      console.log(`   🚨 ВНИМАНИЕ: Есть застрявшие выводы, требуется вмешательство`);
    }
    
    // Статистика по коллекциям
    console.log(`\n📊 СТАТИСТИКА КОЛЛЕКЦИЙ:`);
    
    const depositsCount = await database.collection('deposits').countDocuments();
    const withdrawalsCount = await database.collection('withdrawals').countDocuments();
    const usersCount = await database.collection('users').countDocuments();
    
    console.log(`   Пользователей: ${usersCount}`);
    console.log(`   Всего депозитов: ${depositsCount}`);
    console.log(`   Всего выводов: ${withdrawalsCount}`);
    
    // Статистика по статусам выводов
    const withdrawalStats = await database.collection('withdrawals').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log(`\n📈 СТАТУСЫ ВЫВОДОВ:`);
    for (const stat of withdrawalStats) {
      console.log(`   ${stat._id}: ${stat.count}`);
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ТЕСТИРОВАНИЯ:');
    console.error(error.message);
  } finally {
    await client.close();
    console.log('\n✅ Тестирование завершено');
  }
}

testOptimizedMonitoring().catch(console.error); 