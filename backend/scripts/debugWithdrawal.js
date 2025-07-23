const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env' });

async function debugWithdrawal() {
  console.log('🔍 ОТЛАДКА ВЫВОДОВ И ПОИСК ID');
  console.log('===============================');
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tapdel';
  
  try {
    // Подключаемся к MongoDB
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение к MongoDB установлено');
    
    const database = client.db();
    
    // Поиск всех выводов
    console.log('\n1️⃣ Поиск всех выводов в базе данных');
    const allWithdrawals = await database.collection('withdrawals').find({}).toArray();
    
    console.log(`📋 Найдено выводов: ${allWithdrawals.length}`);
    
    if (allWithdrawals.length === 0) {
      console.log('❌ Выводы не найдены в базе данных');
      console.log('💡 Возможно, история была очищена');
      return false;
    }
    
    // Показываем все выводы
    allWithdrawals.forEach((w, index) => {
      console.log(`\n${index + 1}. Вывод ID: ${w._id}`);
      console.log(`   Пользователь: ${w.userId}`);
      console.log(`   Сумма: ${w.amount} DEL`);
      console.log(`   Адрес: ${w.toAddress}`);
      console.log(`   Статус: ${w.status}`);
      console.log(`   TX Hash: ${w.txHash || 'Нет'}`);
      console.log(`   Запрошен: ${w.requestedAt}`);
      console.log(`   Обработан: ${w.processedAt || 'Нет'}`);
    });
    
    // Поиск выводов пользователя Evgeni_Krasnov
    console.log('\n2️⃣ Поиск выводов пользователя Evgeni_Krasnov');
    const evgeniWithdrawals = await database.collection('withdrawals').find({
      userId: 'telegram-297810833'
    }).toArray();
    
    console.log(`📋 Выводы Evgeni_Krasnov: ${evgeniWithdrawals.length}`);
    
    evgeniWithdrawals.forEach((w, index) => {
      console.log(`\n${index + 1}. Вывод ID: ${w._id}`);
      console.log(`   Сумма: ${w.amount} DEL`);
      console.log(`   Адрес: ${w.toAddress}`);
      console.log(`   Статус: ${w.status}`);
      console.log(`   TX Hash: ${w.txHash || 'Нет'}`);
    });
    
    // Поиск выводов на конкретный адрес
    console.log('\n3️⃣ Поиск выводов на адрес 0xd6187dD54DF3002D5C82043b81EdE74187A5A647');
    const addressWithdrawals = await database.collection('withdrawals').find({
      toAddress: '0xd6187dD54DF3002D5C82043b81EdE74187A5A647'
    }).toArray();
    
    console.log(`📋 Выводы на адрес: ${addressWithdrawals.length}`);
    
    addressWithdrawals.forEach((w, index) => {
      console.log(`\n${index + 1}. Вывод ID: ${w._id}`);
      console.log(`   Пользователь: ${w.userId}`);
      console.log(`   Сумма: ${w.amount} DEL`);
      console.log(`   Статус: ${w.status}`);
      console.log(`   TX Hash: ${w.txHash || 'Нет'}`);
    });
    
    // Поиск выводов на сумму 2222
    console.log('\n4️⃣ Поиск выводов на сумму 2222 DEL');
    const amountWithdrawals = await database.collection('withdrawals').find({
      amount: 2222
    }).toArray();
    
    console.log(`📋 Выводы на 2222 DEL: ${amountWithdrawals.length}`);
    
    amountWithdrawals.forEach((w, index) => {
      console.log(`\n${index + 1}. Вывод ID: ${w._id}`);
      console.log(`   Пользователь: ${w.userId}`);
      console.log(`   Адрес: ${w.toAddress}`);
      console.log(`   Статус: ${w.status}`);
      console.log(`   TX Hash: ${w.txHash || 'Нет'}`);
    });
    
    // Проверка пользователей
    console.log('\n5️⃣ Проверка пользователей');
    const users = await database.collection('users').find({
      userId: 'telegram-297810833'
    }).toArray();
    
    console.log(`📋 Пользователи Evgeni_Krasnov: ${users.length}`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Пользователь: ${user.userId}`);
      console.log(`   Имя: ${user.firstName} ${user.lastName}`);
      console.log(`   Баланс: ${user.gameState?.tokens || 0} DEL`);
      console.log(`   Создан: ${user.createdAt}`);
    });
    
    await client.close();
    console.log('🔌 Подключение к MongoDB закрыто');
    
    console.log('\n🎯 РЕЗУЛЬТАТЫ ОТЛАДКИ:');
    console.log(`✅ Всего выводов: ${allWithdrawals.length}`);
    console.log(`✅ Выводов Evgeni_Krasnov: ${evgeniWithdrawals.length}`);
    console.log(`✅ Выводов на адрес: ${addressWithdrawals.length}`);
    console.log(`✅ Выводов на 2222 DEL: ${amountWithdrawals.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error);
    return false;
  }
}

// Запускаем отладку если скрипт вызван напрямую
if (require.main === module) {
  debugWithdrawal()
    .then(success => {
      if (success) {
        console.log('\n🎉 ОТЛАДКА ЗАВЕРШЕНА!');
        process.exit(0);
      } else {
        console.log('\n💥 ОТЛАДКА ПРОВАЛИЛАСЬ!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Неожиданная ошибка:', error);
      process.exit(1);
    });
}

module.exports = { debugWithdrawal }; 