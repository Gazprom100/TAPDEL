const { connectToDatabase } = require('../config/database');

async function optimizeDatabase() {
  let db;
  
  try {
    console.log('🔧 Начинаем оптимизацию базы данных...');
    
    db = await connectToDatabase();
    
    // Индексы для коллекции users
    console.log('📊 Создаем индексы для users...');
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    await db.collection('users').createIndex({ 'gameState.tokens': 1 });
    await db.collection('users').createIndex({ 'gameState.highScore': -1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    
    // Индексы для коллекции leaderboard
    console.log('🏆 Создаем индексы для leaderboard...');
    await db.collection('leaderboard').createIndex({ userId: 1 }, { unique: true });
    await db.collection('leaderboard').createIndex({ score: -1 });
    await db.collection('leaderboard').createIndex({ tokenSymbol: 1, score: -1 });
    
    // Индексы для коллекции user_token_balances
    console.log('💰 Создаем индексы для user_token_balances...');
    await db.collection('user_token_balances').createIndex({ userId: 1, tokenSymbol: 1 }, { unique: true });
    await db.collection('user_token_balances').createIndex({ tokenSymbol: 1, balance: -1 });
    
    // Индексы для коллекции withdrawals
    console.log('💸 Создаем индексы для withdrawals...');
    await db.collection('withdrawals').createIndex({ userId: 1 });
    await db.collection('withdrawals').createIndex({ status: 1 });
    await db.collection('withdrawals').createIndex({ createdAt: -1 });
    await db.collection('withdrawals').createIndex({ txHash: 1 }, { sparse: true });
    
    // Индексы для коллекции deposits
    console.log('📥 Создаем индексы для deposits...');
    await db.collection('deposits').createIndex({ userId: 1 });
    await db.collection('deposits').createIndex({ status: 1 });
    await db.collection('deposits').createIndex({ createdAt: -1 });
    await db.collection('deposits').createIndex({ txHash: 1 }, { sparse: true });
    
    // Индексы для коллекции token_history
    console.log('📈 Создаем индексы для token_history...');
    await db.collection('token_history').createIndex({ userId: 1 });
    await db.collection('token_history').createIndex({ tokenSymbol: 1 });
    await db.collection('token_history').createIndex({ createdAt: -1 });
    
    // Индексы для коллекции system_config
    console.log('⚙️ Создаем индексы для system_config...');
    await db.collection('system_config').createIndex({ key: 1 }, { unique: true });
    
    // Индексы для коллекции tokens
    console.log('🪙 Создаем индексы для tokens...');
    await db.collection('tokens').createIndex({ symbol: 1 }, { unique: true });
    await db.collection('tokens').createIndex({ isActive: 1 });
    
    // Индексы для коллекции wallet_balances
    console.log('🏦 Создаем индексы для wallet_balances...');
    await db.collection('wallet_balances').createIndex({ tokenSymbol: 1 }, { unique: true });
    await db.collection('wallet_balances').createIndex({ updatedAt: -1 });
    
    console.log('✅ Все индексы созданы успешно!');
    
    // Анализ производительности
    console.log('📊 Анализируем производительность...');
    
    const collections = [
      'users', 'leaderboard', 'user_token_balances', 
      'withdrawals', 'deposits', 'token_history', 
      'system_config', 'tokens', 'wallet_balances'
    ];
    
    for (const collectionName of collections) {
      const stats = await db.collection(collectionName).stats();
      console.log(`📈 ${collectionName}: ${stats.count} документов, ${Math.round(stats.size / 1024)}KB`);
    }
    
    console.log('🎉 Оптимизация базы данных завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка оптимизации базы данных:', error);
  }
}

// Запуск оптимизации
optimizeDatabase(); 