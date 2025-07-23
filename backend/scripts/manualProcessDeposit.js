const databaseConfig = require('../config/database');
const config = require('../config/decimal');

async function manualProcessDeposit() {
  try {
    console.log('🔧 РУЧНАЯ ОБРАБОТКА ДЕПОЗИТА');
    console.log('================================');
    
    // Информация о транзакции из explorer
    const txHash = '0xC3AB0FB9CEB1BCFB597B143C8DC34BE3032263A6922258F1EC73C2EC7EA88BEC';
    const txValue = 1000.8831; // Сумма из explorer
    const txTo = '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43'; // Рабочий адрес
    const blockNumber = 27161200; // Примерный номер блока
    
    console.log(`📋 Информация о транзакции:`);
    console.log(`   TX Hash: ${txHash}`);
    console.log(`   Сумма: ${txValue} DEL`);
    console.log(`   Кому: ${txTo}`);
    console.log(`   Блок: ${blockNumber}`);
    
    // Подключаемся к базе данных
    const database = await databaseConfig.connect();
    console.log('✅ База данных подключена');
    
    // Ищем подходящий депозит
    const deposits = await database.collection('deposits').find({
      matched: false,
      expiresAt: { $gt: new Date() }
    }).toArray();
    
    console.log(`\n🔍 Поиск подходящего депозита:`);
    console.log(`   Активных депозитов: ${deposits.length}`);
    
    let matchingDeposit = null;
    
    for (const deposit of deposits) {
      const roundedValue = Math.round(txValue * 10000) / 10000;
      const depositRounded = Math.round(deposit.uniqueAmount * 10000) / 10000;
      const EPSILON = 0.00005;
      
      console.log(`\n   Депозит ${deposit.uniqueAmount} DEL:`);
      console.log(`     Округленная сумма TX: ${roundedValue}`);
      console.log(`     Округленная сумма депозита: ${depositRounded}`);
      console.log(`     Разница: ${Math.abs(roundedValue - depositRounded)}`);
      console.log(`     Подходит: ${Math.abs(roundedValue - depositRounded) <= EPSILON ? '✅ ДА' : '❌ НЕТ'}`);
      
      if (Math.abs(roundedValue - depositRounded) <= EPSILON) {
        matchingDeposit = deposit;
        console.log(`   🎉 НАЙДЕН ПОДХОДЯЩИЙ ДЕПОЗИТ!`);
        console.log(`   ID: ${deposit._id}`);
        console.log(`   Пользователь: ${deposit.userId}`);
        console.log(`   Запрошенная сумма: ${deposit.amountRequested} DEL`);
        console.log(`   Уникальная сумма: ${deposit.uniqueAmount} DEL`);
      }
    }
    
    if (!matchingDeposit) {
      console.log('\n❌ Подходящий депозит не найден!');
      return;
    }
    
    // Проверяем, не была ли транзакция уже обработана
    const existingDeposit = await database.collection('deposits').findOne({
      txHash: txHash
    });
    
    if (existingDeposit) {
      console.log(`\n⚠️ Транзакция уже обработана!`);
      console.log(`   Депозит ID: ${existingDeposit._id}`);
      console.log(`   Статус: ${existingDeposit.matched ? 'matched' : 'waiting'}`);
      console.log(`   Подтверждения: ${existingDeposit.confirmations || 0}`);
      return;
    }
    
    // Обрабатываем депозит вручную
    console.log('\n🔄 Ручная обработка депозита...');
    
    // Обновляем депозит
    await database.collection('deposits').updateOne(
      { _id: matchingDeposit._id },
      {
        $set: {
          txHash: txHash,
          matched: true,
          confirmations: 6, // Предполагаем, что прошло достаточно подтверждений
          matchedAt: new Date()
        }
      }
    );
    
    console.log('✅ Депозит обновлен');
    
    // Получаем пользователя
    const user = await database.collection('users').findOne({ userId: matchingDeposit.userId });
    if (!user) {
      console.error(`❌ Пользователь ${matchingDeposit.userId} не найден`);
      return;
    }
    
    // Обновляем баланс пользователя
    const currentTokens = user.gameState?.tokens || 0;
    const newTokens = currentTokens + matchingDeposit.amountRequested;
    
    await database.collection('users').updateOne(
      { userId: matchingDeposit.userId },
      {
        $set: {
          "gameState.tokens": newTokens,
          "gameState.lastSaved": new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Баланс пользователя обновлен!`);
    console.log(`   Пользователь: ${user.username || user.telegramUsername}`);
    console.log(`   Старый баланс: ${currentTokens} DEL`);
    console.log(`   Новый баланс: ${newTokens} DEL`);
    console.log(`   Добавлено: +${matchingDeposit.amountRequested} DEL`);
    
    console.log('\n🎉 Депозит успешно обработан!');
    
  } catch (error) {
    console.error('❌ Ошибка обработки:', error);
  }
}

manualProcessDeposit(); 