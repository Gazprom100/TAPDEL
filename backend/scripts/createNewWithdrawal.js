const databaseConfig = require('../config/database');
const decimalService = require('../services/decimalService');

async function createNewWithdrawal() {
  try {
    console.log('💸 СОЗДАНИЕ НОВОГО ВЫВОДА 2222 DEL');
    console.log('=====================================');
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    const userId = 'telegram-297810833'; // Evgeni_Krasnov
    const amount = 2222;
    const toAddress = '0xd6187dD54DF3002D5C82043b81EdE74187A5A647';
    
    // Проверяем пользователя
    const user = await database.collection('users').findOne({ userId: userId });
    
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    console.log('👤 Пользователь найден:', user.username || user.telegramUsername);
    console.log(`💰 Текущий баланс: ${user.gameState?.tokens || 0} DEL`);
    
    const gameBalance = user.gameState?.tokens || 0;
    
    if (gameBalance < amount) {
      console.log('❌ Недостаточно средств для вывода!');
      console.log(`   Нужно: ${amount} DEL`);
      console.log(`   Доступно: ${gameBalance} DEL`);
      return;
    }
    
    console.log('✅ Достаточно средств для вывода');
    
    // Списываем средства с баланса пользователя
    await database.collection('users').updateOne(
      { userId: userId },
      { $set: { "gameState.tokens": gameBalance - amount, updatedAt: new Date() } }
    );
    
    console.log(`💰 Средства списаны: -${amount} DEL`);
    
    // Создаем запрос на вывод
    const withdrawal = {
      userId: userId,
      toAddress: toAddress,
      amount: amount,
      txHash: null,
      status: 'queued',
      requestedAt: new Date(),
      processedAt: null
    };
    
    const result = await database.collection('withdrawals').insertOne(withdrawal);
    
    console.log('✅ Запрос на вывод создан:');
    console.log(`   ID: ${result.insertedId}`);
    console.log(`   Сумма: ${amount} DEL`);
    console.log(`   Адрес: ${toAddress}`);
    console.log(`   Статус: queued`);
    
    // Принудительно обрабатываем вывод
    console.log('\n🔄 Принудительная обработка вывода...');
    
    try {
      // Инициализируем DecimalService если нужно
      if (!decimalService.web3) {
        await decimalService.initialize();
      }
      
      // Отправляем транзакцию
      const txHash = await decimalService.signAndSend(toAddress, amount);
      
      // Обновляем статус в базе данных
      await database.collection('withdrawals').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            txHash: txHash,
            status: 'sent',
            processedAt: new Date()
          }
        }
      );
      
      console.log('✅ Вывод успешно обработан!');
      console.log(`📄 TX Hash: ${txHash}`);
      console.log(`💸 Сумма: ${amount} DEL`);
      console.log(`📍 Адрес: ${toAddress}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке вывода:', error);
      
      // Помечаем как failed и возвращаем средства
      await database.collection('withdrawals').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            status: 'failed',
            error: error.message,
            processedAt: new Date()
          }
        }
      );
      
      // Возвращаем средства пользователю
      await database.collection('users').updateOne(
        { userId: userId },
        { $inc: { "gameState.tokens": amount } }
      );
      
      console.log(`💰 Средства возвращены пользователю ${userId}: +${amount} DEL`);
    }
    
    console.log('\n✅ Создание и обработка вывода завершены');
    
  } catch (error) {
    console.error('❌ Ошибка создания вывода:', error);
  }
}

createNewWithdrawal(); 