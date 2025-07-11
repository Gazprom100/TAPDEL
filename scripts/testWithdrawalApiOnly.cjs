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

async function testWithdrawalApiOnly() {
  let client = null;
  
  try {
    console.log('🧪 Тестирование только API вывода (без DecimalService)...\n');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    // Найдем последний успешный вывод
    const lastWithdrawal = await db.collection('withdrawals')
      .findOne({ status: 'sent' }, { sort: { requestedAt: -1 } });
    
    if (!lastWithdrawal) {
      console.log('❌ Нет успешных выводов для тестирования');
      return;
    }
    
    const withdrawalId = lastWithdrawal._id.toString();
    console.log(`📋 Тестируем вывод: ${withdrawalId}`);
    console.log(`   Статус: ${lastWithdrawal.status}`);
    console.log(`   TX Hash: ${lastWithdrawal.txHash}`);
    
    // Тестируем API endpoint напрямую
    console.log('\n🔍 Тестирование API endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/api/decimal/withdrawals/${withdrawalId}`);
    
    console.log(`   HTTP Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API ответ:');
      console.log(`   withdrawalId: ${data.withdrawalId}`);
      console.log(`   status: ${data.status}`);
      console.log(`   txHash: ${data.txHash}`);
      console.log(`   amount: ${data.amount} DEL`);
    } else {
      const errorText = await response.text();
      console.log('❌ API ошибка:');
      console.log(`   ${errorText}`);
      
      // Попробуем получить детали ошибки из логов сервера
      console.log('\n🔍 Проверяем детали в БД...');
      const withdrawalFromDb = await db.collection('withdrawals').findOne({
        _id: lastWithdrawal._id
      });
      
      if (withdrawalFromDb) {
        console.log('✅ Данные в БД корректны:');
        console.log(`   _id: ${withdrawalFromDb._id}`);
        console.log(`   status: ${withdrawalFromDb.status}`);
        console.log(`   txHash: ${withdrawalFromDb.txHash}`);
        console.log(`   amount: ${withdrawalFromDb.amount}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testWithdrawalApiOnly().catch(console.error); 