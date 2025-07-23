const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0'
};

async function debugWithdrawal(withdrawalId) {
  console.log(`🔍 Отладка вывода: ${withdrawalId}`);
  
  try {
    const client = new MongoClient(config.MONGODB_URI);
    await client.connect();
    const db = client.db('tapdel');
    
    // Получаем вывод
    const withdrawal = await db.collection('withdrawals').findOne({
      _id: new (require('mongodb').ObjectId)(withdrawalId)
    });
    
    if (!withdrawal) {
      console.log(`❌ Вывод ${withdrawalId} не найден`);
      return;
    }
    
    console.log(`📋 Детали вывода:`);
    console.log(`   ID: ${withdrawal._id}`);
    console.log(`   Пользователь: ${withdrawal.userId}`);
    console.log(`   Сумма: ${withdrawal.amount} DEL`);
    console.log(`   Адрес: ${withdrawal.toAddress}`);
    console.log(`   Статус: ${withdrawal.status}`);
    console.log(`   Создан: ${withdrawal.requestedAt}`);
    console.log(`   Обработан: ${withdrawal.processedAt}`);
    console.log(`   TX Hash: ${withdrawal.txHash}`);
    console.log(`   Ошибка: ${withdrawal.error || 'Нет'}`);
    console.log(`   Начало обработки: ${withdrawal.processingStartedAt || 'Нет'}`);
    
    // Проверяем пользователя
    const user = await db.collection('users').findOne({ userId: withdrawal.userId });
    if (user) {
      console.log(`\n👤 Пользователь:`);
      console.log(`   Баланс: ${user.gameState?.tokens || 0} DEL`);
      console.log(`   Обновлен: ${user.updatedAt}`);
    } else {
      console.log(`\n❌ Пользователь ${withdrawal.userId} не найден`);
    }
    
    // Проверяем все выводы пользователя
    const allWithdrawals = await db.collection('withdrawals').find({
      userId: withdrawal.userId
    }).sort({ requestedAt: -1 }).limit(5).toArray();
    
    console.log(`\n📊 Последние 5 выводов пользователя:`);
    for (const w of allWithdrawals) {
      console.log(`   ${w.amount} DEL → ${w.status} (${w.requestedAt})`);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
  }
}

// Получаем ID вывода из аргументов
const withdrawalId = process.argv[2];

if (!withdrawalId) {
  console.error('❌ Укажите ID вывода: node scripts/debugWithdrawal.js <withdrawalId>');
  process.exit(1);
}

debugWithdrawal(withdrawalId); 