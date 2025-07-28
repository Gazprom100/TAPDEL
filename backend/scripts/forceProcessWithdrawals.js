require('dotenv').config();
const { MongoClient } = require('mongodb');
const decimalService = require('../services/decimalService');

const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%25sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

async function forceProcessWithdrawals() {
  try {
    console.log('🔧 Принудительная обработка выводов...');
    
    // Инициализируем DecimalService
    await decimalService.initialize();
    console.log('✅ DecimalService инициализирован');
    
    // Подключаемся к БД
    const client = new MongoClient(generateCleanMongoURI());
    await client.connect();
    const db = client.db('tapdel');
    console.log('✅ Подключено к MongoDB');
    
    // Находим выводы в очереди и processing
    const withdrawals = await db.collection('withdrawals').find({
      status: { $in: ['queued', 'processing'] }
    }).sort({ requestedAt: 1 }).toArray();
    
    console.log(`📊 Найдено выводов для обработки: ${withdrawals.length}`);
    
    for (const withdrawal of withdrawals) {
      console.log(`\n🔄 Обрабатываем вывод ${withdrawal._id}`);
      console.log(`   Пользователь: ${withdrawal.userId}`);
      console.log(`   Сумма: ${withdrawal.amount} токенов`);
      console.log(`   Адрес: ${withdrawal.toAddress}`);
      console.log(`   Статус: ${withdrawal.status}`);
      
      try {
        // Помечаем как обрабатываемый
        await db.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          { $set: { status: 'processing', processingStartedAt: new Date() } }
        );
        
        // Проверяем баланс рабочего кошелька
        const workingBalance = await decimalService.getWorkingBalance();
        console.log(`   💰 Баланс рабочего кошелька: ${workingBalance} BOOST`);
        
        if (workingBalance < withdrawal.amount) {
          throw new Error(`Insufficient working wallet balance: ${workingBalance} < ${withdrawal.amount}`);
        }
        
        // Отправляем транзакцию
        console.log(`   📤 Отправляем транзакцию...`);
        const txHash = await decimalService.signAndSend(withdrawal.toAddress, withdrawal.amount);
        
        // Помечаем как отправленный
        await db.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          {
            $set: {
              txHash: txHash,
              status: 'sent',
              processedAt: new Date()
            },
            $unset: { processingStartedAt: 1 }
          }
        );
        
        console.log(`   ✅ Вывод обработан успешно!`);
        console.log(`   📄 TX Hash: ${txHash}`);
        
      } catch (error) {
        console.error(`   ❌ Ошибка вывода: ${error.message}`);
        
        // Возвращаем средства пользователю
        await db.collection('users').updateOne(
          { userId: withdrawal.userId },
          { $inc: { "gameState.tokens": withdrawal.amount } }
        );
        
        // Помечаем как failed
        await db.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          {
            $set: {
              status: 'failed',
              error: error.message,
              processedAt: new Date()
            },
            $unset: { processingStartedAt: 1 }
          }
        );
        
        console.log(`   💰 Средства возвращены пользователю: +${withdrawal.amount} токенов`);
      }
    }
    
    console.log('\n✅ Принудительная обработка завершена');
    
    await client.close();
    await decimalService.disconnect();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
forceProcessWithdrawals(); 