const { MongoClient } = require('mongodb');
const supabaseService = require('../services/supabaseService');
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

async function migrateToSupabase() {
  let mongoClient = null;
  
  try {
    console.log('🚀 Начинаем миграцию данных из MongoDB в Supabase');
    console.log('=' .repeat(60));
    
    // 1. Инициализация Supabase
    console.log('\n1️⃣ ИНИЦИАЛИЗАЦИЯ SUPABASE');
    console.log('-'.repeat(30));
    
    await supabaseService.initialize();
    console.log('✅ Supabase инициализирован');
    
    // 2. Подключение к MongoDB
    console.log('\n2️⃣ ПОДКЛЮЧЕНИЕ К MONGODB');
    console.log('-'.repeat(30));
    
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DB);
    console.log('✅ MongoDB подключен');
    
    // 3. Извлечение данных из MongoDB
    console.log('\n3️⃣ ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ MONGODB');
    console.log('-'.repeat(30));
    
    const mongoData = {};
    
    // Пользователи
    console.log('📦 Извлекаем пользователей...');
    mongoData.users = await db.collection('users').find({}).toArray();
    console.log(`   Найдено: ${mongoData.users.length} пользователей`);
    
    // Лидерборд
    console.log('📦 Извлекаем лидерборд...');
    mongoData.leaderboard = await db.collection('leaderboard').find({}).toArray();
    console.log(`   Найдено: ${mongoData.leaderboard.length} записей лидерборда`);
    
    // Депозиты
    console.log('📦 Извлекаем депозиты...');
    mongoData.deposits = await db.collection('deposits').find({}).toArray();
    console.log(`   Найдено: ${mongoData.deposits.length} депозитов`);
    
    // Выводы
    console.log('📦 Извлекаем выводы...');
    mongoData.withdrawals = await db.collection('withdrawals').find({}).toArray();
    console.log(`   Найдено: ${mongoData.withdrawals.length} выводов`);
    
    // Настройки админ-панели
    console.log('📦 Извлекаем настройки админ-панели...');
    mongoData.adminSettings = await db.collection('adminSettings').find({}).toArray();
    console.log(`   Найдено: ${mongoData.adminSettings.length} настроек`);
    
    // Системная конфигурация
    console.log('📦 Извлекаем системную конфигурацию...');
    mongoData.systemConfig = await db.collection('system_config').find({}).toArray();
    console.log(`   Найдено: ${mongoData.systemConfig.length} конфигураций`);
    
    // 4. Миграция данных в Supabase
    console.log('\n4️⃣ МИГРАЦИЯ ДАННЫХ В SUPABASE');
    console.log('-'.repeat(30));
    
    await supabaseService.migrateFromMongoDB(mongoData);
    
    // 5. Проверка миграции
    console.log('\n5️⃣ ПРОВЕРКА МИГРАЦИИ');
    console.log('-'.repeat(30));
    
    const stats = await supabaseService.getStatistics();
    console.log('📊 Статистика после миграции:');
    console.log(`   Пользователи: ${stats.totalUsers}`);
    console.log(`   Лидерборд: ${stats.totalLeaderboard}`);
    console.log(`   Депозиты: ${stats.totalDeposits}`);
    console.log(`   Выводы: ${stats.totalWithdrawals}`);
    
    // 6. Создание таблиц в Supabase (если нужно)
    console.log('\n6️⃣ СОЗДАНИЕ ТАБЛИЦ В SUPABASE');
    console.log('-'.repeat(30));
    
    console.log('📋 Создаем SQL скрипт для таблиц...');
    const sqlScript = generateSupabaseTablesSQL();
    console.log('✅ SQL скрипт создан (см. supabase_tables.sql)');
    
    // Сохраняем SQL скрипт в файл
    const fs = require('fs');
    fs.writeFileSync('supabase_tables.sql', sqlScript);
    
    console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('=' .repeat(60));
    console.log('📋 Следующие шаги:');
    console.log('1. Выполните SQL скрипт в Supabase Dashboard');
    console.log('2. Обновите переменные окружения в Vercel');
    console.log('3. Протестируйте новую конфигурацию');
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    throw error;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔒 Соединение с MongoDB закрыто');
    }
  }
}

function generateSupabaseTablesSQL() {
  return `
-- Создание таблиц для TAPDEL в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  profile JSONB,
  gameState JSONB,
  gameBalance DECIMAL DEFAULT 0,
  transactions JSONB DEFAULT '[]',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица лидерборда
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  username TEXT,
  telegramId BIGINT,
  telegramUsername TEXT,
  telegramFirstName TEXT,
  telegramLastName TEXT,
  tokens DECIMAL DEFAULT 0,
  rank INTEGER,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица депозитов
CREATE TABLE IF NOT EXISTS deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  uniqueAmount DECIMAL NOT NULL,
  matched BOOLEAN DEFAULT FALSE,
  txHash TEXT,
  confirmations INTEGER DEFAULT 0,
  expiresAt TIMESTAMP WITH TIME ZONE,
  matchedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица выводов
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  toAddress TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT DEFAULT 'queued',
  txHash TEXT,
  error TEXT,
  processingStartedAt TIMESTAMP WITH TIME ZONE,
  processedAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Таблица настроек админ-панели
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings JSONB NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Таблица системной конфигурации
CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Таблица истории токенов
CREATE TABLE IF NOT EXISTS token_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenSymbol TEXT NOT NULL,
  oldValue JSONB,
  newValue JSONB,
  changedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_userId ON users(userId);
CREATE INDEX IF NOT EXISTS idx_users_telegramId ON users(profile->>'telegramId');
CREATE INDEX IF NOT EXISTS idx_leaderboard_tokens ON leaderboard(tokens DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_userId ON leaderboard(userId);
CREATE INDEX IF NOT EXISTS idx_deposits_userId ON deposits(userId);
CREATE INDEX IF NOT EXISTS idx_deposits_matched ON deposits(matched);
CREATE INDEX IF NOT EXISTS idx_deposits_expiresAt ON deposits(expiresAt);
CREATE INDEX IF NOT EXISTS idx_withdrawals_userId ON withdrawals(userId);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_createdAt ON withdrawals(createdAt);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_token_history_userId ON token_history(userId);
CREATE INDEX IF NOT EXISTS idx_token_history_changedAt ON token_history(changedAt DESC);

-- Включение Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_history ENABLE ROW LEVEL SECURITY;

-- Политики безопасности (разрешаем все для service role)
CREATE POLICY "Enable all for service role" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON leaderboard FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON deposits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON withdrawals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON admin_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON system_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable all for service role" ON token_history FOR ALL USING (auth.role() = 'service_role');

-- Политики для анонимного доступа (только чтение)
CREATE POLICY "Enable read for anon" ON users FOR SELECT USING (true);
CREATE POLICY "Enable read for anon" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Enable read for anon" ON deposits FOR SELECT USING (true);
CREATE POLICY "Enable read for anon" ON withdrawals FOR SELECT USING (true);

-- Функция для автоматического обновления updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка дефолтных настроек
INSERT INTO admin_settings (settings) VALUES (
  '{
    "token": {
      "symbol": "BOOST",
      "contractAddress": "0x15cefa2ffb0759b519c15e23025a718978be9322",
      "decimals": 18
    },
    "gameMechanics": {
      "baseReward": 1,
      "maxFingers": 5,
      "rateWindow": 1000
    },
    "gearMultipliers": {
      "N": 0,
      "1": 1,
      "2": 1.5,
      "3": 2,
      "4": 3,
      "M": 5
    },
    "gearThresholds": {
      "1": 1,
      "2": 5,
      "3": 10,
      "4": 15,
      "M": 20
    },
    "energy": {
      "recoveryRate": 0.033,
      "consumptionRate": {
        "N": 0,
        "1": 0.006,
        "2": 0.009,
        "3": 0.012,
        "4": 0.015,
        "M": 0.0165
      }
    },
    "components": {
      "engines": [100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000],
      "gearboxes": [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600],
      "batteries": [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200],
      "hyperdrives": [5000, 10000, 20000, 40000, 80000],
      "powerGrids": [500, 1000, 2000, 4000, 8000]
    }
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Вставка дефолтной конфигурации токенов
INSERT INTO system_config (key, value) VALUES (
  'tokens',
  '[
    {
      "symbol": "BOOST",
      "address": "0x15cefa2ffb0759b519c15e23025a718978be9322",
      "decimals": 18,
      "name": "BOOST Token",
      "isActive": true
    },
    {
      "symbol": "DEL",
      "address": "0x0000000000000000000000000000000000000000",
      "decimals": 18,
      "name": "Decimal Token",
      "isActive": false
    }
  ]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Готово!
SELECT 'TAPDEL таблицы созданы успешно!' as status;
`;
}

// Запуск миграции
if (require.main === module) {
  migrateToSupabase()
    .then(() => {
      console.log('✅ Миграция завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Миграция завершилась с ошибкой:', error);
      process.exit(1);
    });
}

module.exports = { migrateToSupabase };
