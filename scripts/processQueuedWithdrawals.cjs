#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/tapdel?retryWrites=true&w=majority&appName=Cluster0';
const decimalService = require('../backend/services/decimalService');

async function processQueuedWithdrawals() {
  console.log('🚀 Принудительная обработка застрявших выводов...\n');
  
  let client;
  
  try {
    // Подключаемся к MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const database = client.db('tapdel');
    console.log('✅ MongoDB подключен');
    
    // Инициализируем DecimalService
    await decimalService.initialize();
    console.log('✅ DecimalService инициализирован');
    
    // Находим застрявшие выводы
    const queuedWithdrawals = await database.collection('withdrawals').find({
      status: 'queued'
    }).toArray();
    
    console.log(`📊 Найдено ${queuedWithdrawals.length} выводов в очереди`);
    
    if (queuedWithdrawals.length === 0) {
      console.log('✅ Нет выводов для обработки');
      return;
    }
    
    // Обрабатываем каждый вывод
    for (const withdrawal of queuedWithdrawals) {
      try {
        console.log(`\n🔄 Обрабатываем вывод ${withdrawal._id}:`);
        console.log(`   Пользователь: ${withdrawal.userId}`);
        console.log(`   Сумма: ${withdrawal.amount} DEL`);
        console.log(`   Адрес: ${withdrawal.toAddress}`);
        
        // Помечаем как обрабатываемый
        await database.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          { $set: { status: 'processing', processingStartedAt: new Date() } }
        );
        
        // Отправляем транзакцию
        const txHash = await decimalService.signAndSend(withdrawal.toAddress, withdrawal.amount);
        
        // Обновляем статус
        await database.collection('withdrawals').updateOne(
          { _id: withdrawal._id },
          {
            $set: {
              status: 'sent',
              txHash: txHash,
              processedAt: new Date()
            },
            $unset: { processingStartedAt: 1 }
          }
        );
        
        console.log(`   ✅ Успешно отправлен! TX: ${txHash}`);
        
      } catch (error) {
        console.error(`   ❌ Ошибка обработки: ${error.message}`);
        
        // Возвращаем средства пользователю
        await database.collection('users').updateOne(
          { userId: withdrawal.userId },
          { $inc: { "gameState.tokens": withdrawal.amount } }
        );
        
        // Помечаем как failed
        await database.collection('withdrawals').updateOne(
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
        
        console.log(`   💰 Средства возвращены пользователю: +${withdrawal.amount} DEL`);
      }
    }
    
    console.log('\n✅ Обработка завершена');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    if (decimalService) {
      await decimalService.disconnect();
    }
    if (client) {
      await client.close();
    }
  }
}

// Запускаем если вызван напрямую
if (require.main === module) {
  processQueuedWithdrawals().then(() => {
    console.log('🏁 Скрипт завершен');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Неожиданная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { processQueuedWithdrawals }; 