const databaseConfig = require('../config/database');
const decimalConfig = require('../config/decimal');

async function testNewDeposit() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ НОВОГО ДЕПОЗИТА');
    console.log('=====================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Создаем тестовый депозит
    const testDeposit = {
      userId: 'telegram-297810833',
      amount: 1000,
      uniqueAmount: 1000.8831,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 минут
      transactionHash: null,
      confirmations: 0
    };
    
    // Добавляем в базу данных
    const result = await database.collection('deposits').insertOne(testDeposit);
    console.log('✅ Тестовый депозит создан:', result.insertedId);
    
    // Проверяем все депозиты
    const deposits = await database.collection('deposits').find({}).toArray();
    console.log(`📋 Всего депозитов в базе: ${deposits.length}`);
    
    deposits.forEach((deposit, index) => {
      console.log(`${index + 1}. Депозит ${deposit.amount} DEL - ${deposit.status}`);
    });
    
    // Проверяем пользователя
    const user = await database.collection('users').findOne({ userId: 'telegram-297810833' });
    if (user) {
      console.log('👤 Пользователь найден:', user.username);
      console.log('💰 Токены:', user.gameState?.tokens || 0);
    } else {
      console.log('❌ Пользователь не найден');
    }
    
    console.log('✅ Тест завершен');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testNewDeposit(); 