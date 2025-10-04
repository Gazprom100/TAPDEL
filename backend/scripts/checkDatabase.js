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

// Collections that should exist
const REQUIRED_COLLECTIONS = [
  'users',
  'leaderboard',
  'deposits',
  'withdrawals',
  'adminSettings',
  'system_config',
  'token_history'
];

// Indexes for each collection
const COLLECTION_INDEXES = {
  users: [
    { key: { userId: 1 }, options: { unique: true } },
    { key: { telegramId: 1 }, options: { sparse: true } },
    { key: { 'gameState.tokens': -1 } },
    { key: { 'gameState.highScore': -1 } },
    { key: { createdAt: 1 } },
    { key: { updatedAt: 1 } }
  ],
  leaderboard: [
    { key: { tokens: -1 } },
    { key: { userId: 1 }, options: { unique: true } },
    { key: { telegramId: 1 }, options: { sparse: true } },
    { key: { rank: 1 } },
    { key: { updatedAt: 1 } }
  ],
  deposits: [
    { key: { userId: 1 } },
    { key: { matched: 1 } },
    { key: { expiresAt: 1 } },
    { key: { createdAt: 1 } },
    { key: { uniqueAmount: 1 } }
  ],
  withdrawals: [
    { key: { userId: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: 1 } },
    { key: { processedAt: 1 } }
  ],
  adminSettings: [
    { key: { _id: 1 } },
    { key: { updatedAt: 1 } }
  ],
  system_config: [
    { key: { key: 1 }, options: { unique: true } },
    { key: { updatedAt: 1 } }
  ],
  token_history: [
    { key: { changedAt: -1 } },
    { key: { userId: 1 } },
    { key: { tokenSymbol: 1 } }
  ]
};

async function checkDatabase() {
  let client = null;
  
  try {
    console.log('🔍 Проверка подключения к базе данных...');
    console.log('📍 URI маска:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Подключение к MongoDB
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    console.log('✅ Подключение к MongoDB успешно');
    
    // Проверка ping
    await client.db().admin().ping();
    console.log('✅ Ping к MongoDB успешен');
    
    const db = client.db(MONGODB_DB);
    
    // Проверка существующих коллекций
    console.log('\n📊 Проверка коллекций...');
    const existingCollections = await db.listCollections().toArray();
    const collectionNames = existingCollections.map(c => c.name);
    
    console.log('Существующие коллекции:', collectionNames);
    
    // Создание недостающих коллекций
    for (const collectionName of REQUIRED_COLLECTIONS) {
      if (!collectionNames.includes(collectionName)) {
        console.log(`➕ Создание коллекции: ${collectionName}`);
        await db.createCollection(collectionName);
      } else {
        console.log(`✅ Коллекция ${collectionName} уже существует`);
      }
    }
    
    // Создание индексов
    console.log('\n🔧 Создание индексов...');
    for (const [collectionName, indexes] of Object.entries(COLLECTION_INDEXES)) {
      console.log(`📋 Создание индексов для ${collectionName}...`);
      
      for (const index of indexes) {
        try {
          await db.collection(collectionName).createIndex(index.key, index.options || {});
          console.log(`  ✅ Индекс создан: ${JSON.stringify(index.key)}`);
        } catch (error) {
          if (error.code === 85) { // Index already exists
            console.log(`  ⚠️ Индекс уже существует: ${JSON.stringify(index.key)}`);
          } else {
            console.error(`  ❌ Ошибка создания индекса: ${error.message}`);
          }
        }
      }
    }
    
    // Проверка статистики
    console.log('\n📈 Статистика базы данных:');
    for (const collectionName of REQUIRED_COLLECTIONS) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`  ${collectionName}: ${count} документов`);
      } catch (error) {
        console.error(`  ❌ Ошибка подсчета документов в ${collectionName}: ${error.message}`);
      }
    }
    
    // Создание дефолтных настроек
    console.log('\n⚙️ Создание дефолтных настроек...');
    
    // Настройки админ-панели
    const adminSettings = await db.collection('adminSettings').findOne({ _id: 'gameSettings' });
    if (!adminSettings) {
      const defaultSettings = {
        _id: 'gameSettings',
        token: {
          symbol: 'BOOST',
          contractAddress: '0x15cefa2ffb0759b519c15e23025a718978be9322',
          decimals: 18
        },
        gameMechanics: {
          baseReward: 1,
          maxFingers: 5,
          rateWindow: 1000
        },
        gearMultipliers: {
          'N': 0,
          '1': 1,
          '2': 1.5,
          '3': 2,
          '4': 3,
          'M': 5
        },
        gearThresholds: {
          '1': 1,
          '2': 5,
          '3': 10,
          '4': 15,
          'M': 20
        },
        energy: {
          recoveryRate: 0.033,
          consumptionRate: {
            'N': 0,
            '1': 0.006,
            '2': 0.009,
            '3': 0.012,
            '4': 0.015,
            'M': 0.0165
          }
        },
        components: {
          engines: [100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000],
          gearboxes: [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600],
          batteries: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200],
          hyperdrives: [5000, 10000, 20000, 40000, 80000],
          powerGrids: [500, 1000, 2000, 4000, 8000]
        },
        updatedAt: new Date()
      };
      
      await db.collection('adminSettings').insertOne(defaultSettings);
      console.log('✅ Дефолтные настройки админ-панели созданы');
    } else {
      console.log('✅ Настройки админ-панели уже существуют');
    }
    
    // Конфигурация токенов
    const tokenConfig = await db.collection('system_config').findOne({ key: 'tokens' });
    if (!tokenConfig) {
      const defaultTokens = [
        {
          symbol: 'BOOST',
          address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
          decimals: 18,
          name: 'BOOST Token',
          isActive: true
        },
        {
          symbol: 'DEL',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          name: 'Decimal Token',
          isActive: false
        }
      ];
      
      await db.collection('system_config').insertOne({
        key: 'tokens',
        value: defaultTokens,
        updatedAt: new Date()
      });
      console.log('✅ Дефолтная конфигурация токенов создана');
    } else {
      console.log('✅ Конфигурация токенов уже существует');
    }
    
    console.log('\n🎉 Проверка и настройка базы данных завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при работе с базой данных:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 Соединение с базой данных закрыто');
    }
  }
}

// Запуск проверки
if (require.main === module) {
  checkDatabase()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabase };
