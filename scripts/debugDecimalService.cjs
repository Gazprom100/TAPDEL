const { MongoClient } = require('mongodb');

// MongoDB настройки
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

async function debugDecimalService() {
  let client = null;
  
  try {
    console.log('🔍 ОТЛАДКА DECIMAL SERVICE');
    console.log('=========================\n');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('✅ Подключение к MongoDB установлено');
    
    // 1. Проверяем очередь выводов
    console.log('\n📋 1. Проверка очереди выводов:');
    
    const queuedWithdrawals = await db.collection('withdrawals').find({
      status: 'queued'
    }).toArray();
    
    console.log(`   Выводов в статусе "queued": ${queuedWithdrawals.length}`);
    
    if (queuedWithdrawals.length > 0) {
      console.log('   Ожидающие обработки:');
      queuedWithdrawals.forEach((w, index) => {
        console.log(`   ${index + 1}. ${w.amount} DEL → ${w.toAddress} (${w._id})`);
        console.log(`      Создан: ${w.requestedAt}`);
      });
    }
    
    // 2. Проверяем недавние неудачные выводы
    console.log('\n❌ 2. Недавние неудачные выводы:');
    
    const failedWithdrawals = await db.collection('withdrawals')
      .find({ status: 'failed' })
      .sort({ processedAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`   Неудачных выводов: ${failedWithdrawals.length}`);
    
    failedWithdrawals.forEach((w, index) => {
      console.log(`   ${index + 1}. ${w.amount} DEL → ${w.toAddress}`);
      console.log(`      Ошибка: ${w.error || 'Не указана'}`);
      console.log(`      Время обработки: ${(new Date(w.processedAt) - new Date(w.requestedAt)) / 1000}с`);
    });
    
    // 3. Создадим тестовый вывод малой суммы
    console.log('\n🧪 3. Создание тестового вывода:');
    
    const testWithdrawal = {
      userId: 'debug_test_withdrawal',
      toAddress: '0xd6187dD54DF3002D5C82043b81EdE74187A5A647',
      amount: 0.001, // Очень малая сумма для теста
      txHash: null,
      status: 'queued',
      requestedAt: new Date(),
      processedAt: null,
      debug: true
    };
    
    const insertResult = await db.collection('withdrawals').insertOne(testWithdrawal);
    console.log(`   ✅ Тестовый вывод создан: ${insertResult.insertedId}`);
    console.log(`   Сумма: ${testWithdrawal.amount} DEL`);
    console.log(`   Адрес: ${testWithdrawal.toAddress}`);
    
    // 4. Мониторинг обработки в течение 30 секунд
    console.log('\n⏳ 4. Мониторинг обработки (30 секунд):');
    
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Ждём 5 секунд
      
      const updatedWithdrawal = await db.collection('withdrawals').findOne({
        _id: insertResult.insertedId
      });
      
      console.log(`   [${(i + 1) * 5}с] Статус: ${updatedWithdrawal.status}`);
      
      if (updatedWithdrawal.status !== 'queued') {
        console.log(`   📄 Результат:`);
        console.log(`      Статус: ${updatedWithdrawal.status}`);
        console.log(`      TX Hash: ${updatedWithdrawal.txHash || 'Отсутствует'}`);
        console.log(`      Ошибка: ${updatedWithdrawal.error || 'Нет'}`);
        console.log(`      Время обработки: ${updatedWithdrawal.processedAt}`);
        break;
      }
      
      if (i === 5) {
        console.log(`   ⚠️  Вывод всё ещё в статусе "queued" после 30 секунд`);
        console.log(`   💡 Возможные причины:`);
        console.log(`      - DecimalService не запущен`);
        console.log(`      - Проблемы с withdrawalWorker`);
        console.log(`      - Ошибки в логике обработки`);
      }
    }
    
    // 5. Проверяем состояние DecimalService
    console.log('\n🔧 5. Диагностика DecimalService:');
    
    try {
      const fetch = require('node-fetch');
      const infoResponse = await fetch('http://localhost:3000/api/decimal/info');
      
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        console.log(`   ✅ DecimalService отвечает`);
        console.log(`   💰 Рабочий баланс: ${info.workingBalance} DEL`);
        console.log(`   🌐 RPC URL: ${info.rpcUrl}`);
        console.log(`   ⛓️  Chain ID: ${info.chainId}`);
      } else {
        console.log(`   ❌ DecimalService недоступен: ${infoResponse.status}`);
      }
    } catch (apiError) {
      console.log(`   ❌ Ошибка API DecimalService: ${apiError.message}`);
    }
    
    // 6. Рекомендации по исправлению
    console.log('\n💡 6. Рекомендации:');
    
    if (queuedWithdrawals.length > 0) {
      console.log('   📝 В очереди есть необработанные выводы');
      console.log('   🔄 Проверьте работу withdrawalWorker в DecimalService');
    }
    
    if (failedWithdrawals.length > 0) {
      const avgProcessTime = failedWithdrawals.reduce((sum, w) => {
        return sum + (new Date(w.processedAt) - new Date(w.requestedAt));
      }, 0) / failedWithdrawals.length / 1000;
      
      console.log(`   📊 Средне время до ошибки: ${avgProcessTime.toFixed(1)}с`);
      
      if (avgProcessTime < 1) {
        console.log('   ⚡ Очень быстрые ошибки - проблема в конфигурации');
      } else if (avgProcessTime > 10) {
        console.log('   🐌 Медленные ошибки - проблема с сетью/RPC');
      }
    }
    
    console.log('\n🔧 Следующие шаги:');
    console.log('   1. Проверить логи сервера на ошибки DecimalService');
    console.log('   2. Убедиться что withdrawalWorker запущен');
    console.log('   3. Проверить переменные окружения для DecimalChain');
    console.log('   4. Протестировать подключение к RPC узлу');
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Соединение с MongoDB закрыто');
    }
  }
}

// Запуск отладки
debugDecimalService().catch(console.error); 