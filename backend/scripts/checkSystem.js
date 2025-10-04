const { checkDatabase } = require('./checkDatabase');
const { checkApi } = require('./checkApi');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Database configuration
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%25sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

async function checkSystem() {
  console.log('🚀 Запуск полной проверки системы TAPDEL');
  console.log('=' .repeat(50));
  
  const results = {
    database: false,
    api: false,
    collections: [],
    indexes: [],
    settings: false
  };
  
  try {
    // 1. Проверка базы данных
    console.log('\n1️⃣ ПРОВЕРКА БАЗЫ ДАННЫХ');
    console.log('-'.repeat(30));
    
    try {
      await checkDatabase();
      results.database = true;
      console.log('✅ База данных: OK');
    } catch (error) {
      console.log('❌ База данных: ОШИБКА');
      console.log('   Детали:', error.message);
    }
    
    // 2. Проверка коллекций и индексов
    console.log('\n2️⃣ ПРОВЕРКА КОЛЛЕКЦИЙ И ИНДЕКСОВ');
    console.log('-'.repeat(30));
    
    let client = null;
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db(MONGODB_DB);
      
      // Проверка коллекций
      const collections = await db.listCollections().toArray();
      results.collections = collections.map(c => c.name);
      console.log('✅ Коллекции найдены:', results.collections.join(', '));
      
      // Проверка индексов
      for (const collection of collections) {
        const indexes = await db.collection(collection.name).listIndexes().toArray();
        results.indexes.push({
          collection: collection.name,
          count: indexes.length,
          indexes: indexes.map(i => i.name)
        });
        console.log(`   ${collection.name}: ${indexes.length} индексов`);
      }
      
    } catch (error) {
      console.log('❌ Ошибка проверки коллекций:', error.message);
    } finally {
      if (client) {
        await client.close();
      }
    }
    
    // 3. Проверка настроек
    console.log('\n3️⃣ ПРОВЕРКА НАСТРОЕК');
    console.log('-'.repeat(30));
    
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db(MONGODB_DB);
      
      // Проверка настроек админ-панели
      const adminSettings = await db.collection('adminSettings').findOne({ _id: 'gameSettings' });
      if (adminSettings) {
        console.log('✅ Настройки админ-панели: OK');
        console.log(`   Токен: ${adminSettings.token?.symbol || 'не установлен'}`);
        console.log(`   Базовое вознаграждение: ${adminSettings.gameMechanics?.baseReward || 'не установлено'}`);
      } else {
        console.log('❌ Настройки админ-панели: НЕ НАЙДЕНЫ');
      }
      
      // Проверка конфигурации токенов
      const tokenConfig = await db.collection('system_config').findOne({ key: 'tokens' });
      if (tokenConfig) {
        console.log('✅ Конфигурация токенов: OK');
        console.log(`   Количество токенов: ${tokenConfig.value?.length || 0}`);
        const activeToken = tokenConfig.value?.find(t => t.isActive);
        if (activeToken) {
          console.log(`   Активный токен: ${activeToken.symbol} (${activeToken.name})`);
        }
      } else {
        console.log('❌ Конфигурация токенов: НЕ НАЙДЕНА');
      }
      
      results.settings = !!(adminSettings && tokenConfig);
      
    } catch (error) {
      console.log('❌ Ошибка проверки настроек:', error.message);
    } finally {
      if (client) {
        await client.close();
      }
    }
    
    // 4. Проверка API (если сервер запущен)
    console.log('\n4️⃣ ПРОВЕРКА API');
    console.log('-'.repeat(30));
    
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    console.log(`   Проверка API по адресу: ${apiUrl}`);
    
    try {
      const apiResults = await checkApi(apiUrl);
      const successCount = apiResults.filter(r => r.success).length;
      const totalCount = apiResults.length;
      
      if (successCount === totalCount) {
        console.log('✅ API: ВСЕ ТЕСТЫ ПРОШЛИ');
        results.api = true;
      } else {
        console.log(`⚠️ API: ${successCount}/${totalCount} тестов прошли`);
        results.api = false;
      }
    } catch (error) {
      console.log('❌ API: СЕРВЕР НЕ ДОСТУПЕН');
      console.log('   Убедитесь, что сервер запущен на порту 3001');
      console.log('   Детали:', error.message);
    }
    
    // 5. Итоговый отчет
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ');
    console.log('=' .repeat(50));
    
    console.log(`База данных: ${results.database ? '✅ OK' : '❌ ОШИБКА'}`);
    console.log(`API: ${results.api ? '✅ OK' : '❌ ОШИБКА'}`);
    console.log(`Настройки: ${results.settings ? '✅ OK' : '❌ ОШИБКА'}`);
    console.log(`Коллекций: ${results.collections.length}`);
    console.log(`Индексов: ${results.indexes.reduce((sum, i) => sum + i.count, 0)}`);
    
    if (results.database && results.settings) {
      console.log('\n🎉 СИСТЕМА ГОТОВА К РАБОТЕ!');
      console.log('\n📋 Следующие шаги:');
      console.log('1. Запустите сервер: npm start');
      console.log('2. Проверьте API: npm run check:api');
      console.log('3. Откройте админ-панель: http://localhost:3001/admin');
    } else {
      console.log('\n⚠️ СИСТЕМА ТРЕБУЕТ ДОРАБОТКИ');
      console.log('\n🔧 Рекомендации:');
      if (!results.database) {
        console.log('- Проверьте подключение к MongoDB');
        console.log('- Убедитесь, что переменные окружения настроены');
      }
      if (!results.settings) {
        console.log('- Запустите скрипт инициализации настроек');
      }
      if (!results.api) {
        console.log('- Запустите сервер и повторите проверку API');
      }
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка при проверке системы:', error);
    throw error;
  }
}

// Запуск проверки
if (require.main === module) {
  checkSystem()
    .then(() => {
      console.log('\n✅ Проверка системы завершена');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Проверка системы завершилась с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { checkSystem };
