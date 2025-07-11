require('dotenv').config({ path: './backend/TAPDEL.env' });

const { MongoClient } = require('mongodb');

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

async function checkWithdrawalStatus() {
  let client = null;
  
  try {
    console.log('🔍 Проверка статуса выводов в БД...\n');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    // Найдем последние выводы
    const withdrawals = await db.collection('withdrawals')
      .find({})
      .sort({ requestedAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`📋 Найдено ${withdrawals.length} выводов:\n`);
    
    withdrawals.forEach((withdrawal, index) => {
      console.log(`${index + 1}. ID: ${withdrawal._id}`);
      console.log(`   Пользователь: ${withdrawal.userId}`);
      console.log(`   Сумма: ${withdrawal.amount} DEL`);
      console.log(`   Адрес: ${withdrawal.toAddress}`);
      console.log(`   Статус: ${withdrawal.status}`);
      console.log(`   Создан: ${withdrawal.requestedAt}`);
      
      if (withdrawal.txHash) {
        console.log(`   TX Hash: ${withdrawal.txHash}`);
      }
      
      if (withdrawal.processedAt) {
        console.log(`   Обработан: ${withdrawal.processedAt}`);
      }
      
      if (withdrawal.error) {
        console.log(`   Ошибка: ${withdrawal.error}`);
      }
      
      console.log('');
    });
    
    // Проверим статистику
    const stats = await db.collection('withdrawals').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    console.log('📊 Статистика выводов:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} шт., ${stat.totalAmount} DEL`);
    });

  } catch (error) {
    console.error('❌ Ошибка проверки статуса выводов:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkWithdrawalStatus().catch(console.error); 