const { MongoClient } = require('mongodb');

async function checkDeposits() {
  try {
    console.log('🔍 ПРОВЕРКА ДЕПОЗИТОВ И ТРАНЗАКЦИИ 123.8831 DEL');
    console.log('================================================\n');
    
    // Подключаемся к базе данных
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
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const database = client.db(MONGODB_DB);
    
    console.log('✅ Подключение к MongoDB установлено\n');
    
    const userId = 'telegram-7013973686';
    const targetAmount = 123.8831;
    
    // Проверяем все депозиты пользователя
    console.log(`📥 ВСЕ ДЕПОЗИТЫ ПОЛЬЗОВАТЕЛЯ ${userId}:`);
    console.log('='.repeat(50));
    
    const allDeposits = await database.collection('deposits').find({
      userId: userId
    }).sort({ createdAt: -1 }).toArray();
    
    if (allDeposits.length === 0) {
      console.log('❌ Депозитов не найдено');
    } else {
      console.log(`Найдено депозитов: ${allDeposits.length}\n`);
      
      for (const deposit of allDeposits) {
        const timeAgo = Math.round((new Date() - deposit.createdAt) / 1000 / 60);
        const isExpired = deposit.expiresAt < new Date();
        const isMatched = deposit.matched;
        
        console.log(`ID: ${deposit._id}`);
        console.log(`  Запрошено: ${deposit.amountRequested} DEL`);
        console.log(`  Уникальная сумма: ${deposit.uniqueAmount} DEL`);
        console.log(`  Создан: ${timeAgo} мин назад`);
        console.log(`  Истекает: ${deposit.expiresAt.toLocaleString()}`);
        console.log(`  Статус: ${deposit.status || 'active'}`);
        console.log(`  Обработан: ${isMatched ? 'Да' : 'Нет'}`);
        console.log(`  Истек: ${isExpired ? 'Да' : 'Нет'}`);
        if (deposit.txHash) {
          console.log(`  TX Hash: ${deposit.txHash}`);
        }
        console.log('-'.repeat(30));
      }
    }
    
    // Ищем депозит с суммой близкой к 123.8831
    console.log(`\n🎯 ПОИСК ДЕПОЗИТА С СУММОЙ ${targetAmount} DEL:`);
    console.log('='.repeat(50));
    
    const matchingDeposits = allDeposits.filter(deposit => {
      const diff = Math.abs(deposit.uniqueAmount - targetAmount);
      return diff < 0.001; // допуск 0.001 DEL
    });
    
    if (matchingDeposits.length > 0) {
      console.log(`✅ Найдено ${matchingDeposits.length} депозитов с подходящей суммой:`);
      for (const deposit of matchingDeposits) {
        console.log(`  - ${deposit.uniqueAmount} DEL (ID: ${deposit._id})`);
        console.log(`    Статус: ${deposit.status || 'active'}`);
        console.log(`    Обработан: ${deposit.matched ? 'Да' : 'Нет'}`);
      }
    } else {
      console.log('❌ Депозитов с суммой 123.8831 DEL не найдено');
      
      // Показываем ближайшие суммы
      console.log('\n📊 БЛИЖАЙШИЕ СУММЫ:');
      const sortedByDiff = allDeposits
        .map(deposit => ({
          ...deposit,
          diff: Math.abs(deposit.uniqueAmount - targetAmount)
        }))
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5);
      
      for (const deposit of sortedByDiff) {
        console.log(`  - ${deposit.uniqueAmount} DEL (разница: ${deposit.diff.toFixed(6)} DEL)`);
      }
    }
    
    // Проверяем выводы
    console.log(`\n📤 ВЫВОДЫ ПОЛЬЗОВАТЕЛЯ ${userId}:`);
    console.log('='.repeat(50));
    
    const withdrawals = await database.collection('withdrawals').find({
      userId: userId
    }).sort({ requestedAt: -1 }).toArray();
    
    if (withdrawals.length === 0) {
      console.log('❌ Выводов не найдено');
    } else {
      console.log(`Найдено выводов: ${withdrawals.length}\n`);
      
      for (const withdrawal of withdrawals) {
        const timeAgo = Math.round((new Date() - withdrawal.requestedAt) / 1000 / 60);
        console.log(`ID: ${withdrawal._id}`);
        console.log(`  Сумма: ${withdrawal.amount} DEL`);
        console.log(`  Адрес: ${withdrawal.toAddress}`);
        console.log(`  Статус: ${withdrawal.status}`);
        console.log(`  Запрошен: ${timeAgo} мин назад`);
        if (withdrawal.txHash) {
          console.log(`  TX Hash: ${withdrawal.txHash}`);
        }
        console.log('-'.repeat(30));
      }
    }
    
    // Проверяем баланс пользователя
    console.log(`\n💰 БАЛАНС ПОЛЬЗОВАТЕЛЯ ${userId}:`);
    console.log('='.repeat(50));
    
    const user = await database.collection('users').findOne({ userId: userId });
    if (user) {
      console.log(`gameState.tokens: ${user.gameState?.tokens || 0} DEL`);
      console.log(`gameBalance: ${user.gameBalance || 0} DEL`);
      console.log(`highScore: ${user.gameState?.highScore || 0}`);
    } else {
      console.log('❌ Пользователь не найден');
    }
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ПРОВЕРКИ:');
    console.error(error.message);
  } finally {
    await client.close();
    console.log('\n✅ Проверка завершена');
  }
}

checkDeposits().catch(console.error); 