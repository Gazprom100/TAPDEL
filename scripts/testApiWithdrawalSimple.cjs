require('dotenv').config({ path: './backend/TAPDEL.env' });

const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

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

async function testApiWithdrawalSimple() {
  let client = null;
  
  try {
    const testUserId = 'api_simple_test_user';
    const testAmount = 0.001;
    const testAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';

    console.log('🧪 Упрощенное тестирование API вывода...\n');

    // 1. Подготовка пользователя напрямую в БД
    console.log('👤 1. Подготовка тестового пользователя через БД...');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    await db.collection('users').updateOne(
      { userId: testUserId },
      {
        $set: {
          userId: testUserId,
          gameState: {
            tokens: 5.0, // Достаточно для вывода
            highScore: 0
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log('✅ Пользователь подготовлен: 5.0 DEL');

    // 2. Проверка баланса через API
    console.log('\n💰 2. Проверка баланса через API...');
    
    const balanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log(`✅ Текущий баланс: ${balanceData.gameBalance} DEL`);
    } else {
      const error = await balanceResponse.text();
      throw new Error(`Ошибка получения баланса: ${balanceResponse.status} - ${error}`);
    }

    // 3. Создание вывода через API
    console.log('\n💸 3. Создание вывода через API...');
    
    const withdrawalResponse = await fetch(`${API_BASE_URL}/api/decimal/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        toAddress: testAddress,
        amount: testAmount
      })
    });

    if (withdrawalResponse.ok) {
      const withdrawalData = await withdrawalResponse.json();
      console.log(`✅ Вывод создан успешно!`);
      console.log(`   ID: ${withdrawalData.withdrawalId}`);
      console.log(`   Сумма: ${withdrawalData.amount} DEL`);
      console.log(`   Адрес: ${withdrawalData.toAddress}`);
      console.log(`   Статус: ${withdrawalData.status}`);

      // 4. Проверка статуса вывода
      console.log('\n📊 4. Мониторинг статуса вывода...');
      
      let attempts = 0;
      const maxAttempts = 12; // 60 секунд
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 секунд
        attempts++;
        
        const statusResponse = await fetch(`${API_BASE_URL}/api/decimal/withdrawals/${withdrawalData.withdrawalId}`);
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`   Попытка ${attempts}: Статус = ${statusData.status}`);
          
          if (statusData.status === 'sent') {
            console.log(`✅ Вывод успешно обработан!`);
            console.log(`   TX Hash: ${statusData.txHash}`);
            console.log(`   Время обработки: ${statusData.processedAt}`);
            break;
          } else if (statusData.status === 'failed') {
            console.log(`❌ Вывод завершился с ошибкой`);
            console.log(`   Время обработки: ${statusData.processedAt}`);
            
            // Получаем детали ошибки из БД
            const withdrawalDoc = await db.collection('withdrawals').findOne({
              _id: new require('mongodb').ObjectId(withdrawalData.withdrawalId)
            });
            if (withdrawalDoc && withdrawalDoc.error) {
              console.log(`   Ошибка: ${withdrawalDoc.error}`);
            }
            break;
          }
        } else {
          console.log(`⚠️ Ошибка проверки статуса: ${statusResponse.status}`);
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log(`⏰ Время ожидания истекло после ${maxAttempts * 5} секунд`);
      }

    } else {
      const error = await withdrawalResponse.text();
      throw new Error(`Ошибка создания вывода: ${withdrawalResponse.status} - ${error}`);
    }

    // 5. Финальная проверка баланса
    console.log('\n💰 5. Финальная проверка баланса...');
    
    const finalBalanceResponse = await fetch(`${API_BASE_URL}/api/decimal/users/${testUserId}/balance`);
    
    if (finalBalanceResponse.ok) {
      const finalBalanceData = await finalBalanceResponse.json();
      console.log(`✅ Финальный баланс: ${finalBalanceData.gameBalance} DEL`);
    } else {
      console.log(`⚠️ Ошибка получения финального баланса: ${finalBalanceResponse.status}`);
    }

    console.log('\n🎉 Тест API вывода завершен успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования API вывода:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testApiWithdrawalSimple().catch(console.error); 