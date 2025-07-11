require('dotenv').config({ path: './backend/TAPDEL.env' });

const { MongoClient } = require('mongodb');
const decimalService = require('../backend/services/decimalService');

// Генерация чистого MongoDB URI
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

async function debugFullWithdrawal() {
  let client = null;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('🚀 Инициализация DecimalService...');
    await decimalService.initialize();
    
    const testUserId = 'debug_withdrawal_user';
    const testAmount = 0.001;
    const testAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    
    // 1. Подготовка тестового пользователя
    console.log('\n👤 1. Подготовка тестового пользователя...');
    
    await db.collection('users').updateOne(
      { userId: testUserId },
      {
        $set: {
          userId: testUserId,
          gameState: {
            tokens: 10.0, // Достаточно для вывода
            highScore: 0
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const user = await db.collection('users').findOne({ userId: testUserId });
    console.log(`✅ Пользователь подготовлен: ${user.gameState.tokens} DEL`);
    
    // 2. Проверяем состояние DecimalService
    console.log('\n⚙️ 2. Проверка состояния DecimalService...');
    
    try {
      const workingBalance = await decimalService.getWorkingBalance();
      console.log(`✅ Баланс рабочего кошелька: ${workingBalance} DEL`);
      
      if (workingBalance < testAmount) {
        throw new Error(`Недостаточно газа для вывода. Нужно: ${testAmount}, доступно: ${workingBalance}`);
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки баланса: ${error.message}`);
      return;
    }
    
    // 3. Создание заявки на вывод через API логику
    console.log('\n📝 3. Создание заявки на вывод...');
    
    // Проверяем баланс пользователя (как в API)
    const gameBalance = user.gameState?.tokens || 0;
    
    if (gameBalance < testAmount) {
      throw new Error(`Недостаточно средств. Доступно: ${gameBalance} DEL`);
    }
    
    // Списываем средства с баланса пользователя
    await db.collection('users').updateOne(
      { userId: testUserId },
      { $set: { "gameState.tokens": gameBalance - testAmount, updatedAt: new Date() } }
    );
    
    // Создаем запрос на вывод
    const withdrawal = {
      userId: testUserId,
      toAddress: testAddress,
      amount: testAmount,
      txHash: null,
      status: 'queued',
      requestedAt: new Date(),
      processedAt: null
    };
    
    const result = await db.collection('withdrawals').insertOne(withdrawal);
    console.log(`✅ Заявка создана: ID ${result.insertedId}`);
    console.log(`   Баланс изменился: ${gameBalance} → ${gameBalance - testAmount} DEL`);
    
    // 4. Прямая отправка через DecimalService (имитация worker)
    console.log('\n🚀 4. Прямая отправка через DecimalService...');
    
    try {
      console.log('   Начинаем отправку транзакции...');
      const txHash = await decimalService.signAndSend(testAddress, testAmount);
      
      // Обновляем статус вывода
      await db.collection('withdrawals').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            txHash: txHash,
            status: 'sent',
            processedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Транзакция успешно отправлена!`);
      console.log(`   TX Hash: ${txHash}`);
      console.log(`   Адрес получателя: ${testAddress}`);
      console.log(`   Сумма: ${testAmount} DEL`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки транзакции:`, error);
      console.error(`   Тип ошибки: ${error.constructor.name}`);
      console.error(`   Сообщение: ${error.message}`);
      
      if (error.message.includes('Invalid argument type')) {
        console.error(`\n🔍 АНАЛИЗ ОШИБКИ "Invalid argument type":`);
        
        // Попробуем диагностировать каждый параметр
        const privateKey = require('../backend/config/decimal').getPrivateKey();
        const fromAddress = require('../backend/config/decimal').WORKING_ADDRESS;
        
        console.log(`   Приватный ключ: ${privateKey.substring(0, 10)}... (длина: ${privateKey.length})`);
        console.log(`   От адреса: ${fromAddress}`);
        console.log(`   К адресу: ${testAddress}`);
        console.log(`   Сумма: ${testAmount} (тип: ${typeof testAmount})`);
        
        try {
          const nonce = await decimalService.getNonce(fromAddress);
          console.log(`   Nonce: ${nonce} (тип: ${typeof nonce})`);
        } catch (nonceError) {
          console.error(`   Ошибка получения nonce: ${nonceError.message}`);
        }
      }
      
      // Возвращаем средства пользователю при ошибке
      await db.collection('users').updateOne(
        { userId: testUserId },
        { $inc: { "gameState.tokens": testAmount } }
      );
      
      await db.collection('withdrawals').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            status: 'failed',
            processedAt: new Date(),
            error: error.message
          }
        }
      );
      
      console.log(`✅ Средства возвращены пользователю`);
    }
    
    // 5. Финальная проверка
    console.log('\n📊 5. Финальная проверка состояния...');
    
    const finalUser = await db.collection('users').findOne({ userId: testUserId });
    const finalWithdrawal = await db.collection('withdrawals').findOne({ _id: result.insertedId });
    
    console.log(`   Финальный баланс пользователя: ${finalUser.gameState.tokens} DEL`);
    console.log(`   Статус вывода: ${finalWithdrawal.status}`);
    
    if (finalWithdrawal.txHash) {
      console.log(`   TX Hash: ${finalWithdrawal.txHash}`);
    }
    
    if (finalWithdrawal.error) {
      console.log(`   Ошибка: ${finalWithdrawal.error}`);
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    if (client) {
      await client.close();
    }
    process.exit(0);
  }
}

debugFullWithdrawal().catch(console.error); 