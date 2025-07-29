const { upstashRedisService } = require('../services/upstashRedisService');
const decimalService = require('../services/decimalService');
const botService = require('../services/botService');

async function testServicesStatus() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ СТАТУСА СЕРВИСОВ');
    console.log('==================================\n');
    
    const now = new Date();
    const services = [];
    
    // MongoDB
    console.log('📊 MongoDB:');
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb+srv://TAPDEL:fpz%25sE62KPzmHfM@cluster0.ejo8obw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
      const start = Date.now();
      await client.connect();
      await client.db().admin().ping();
      const responseTime = Date.now() - start;
      await client.close();
      
      services.push({
        name: 'MongoDB',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString()
      });
      console.log(`   ✅ Статус: online (${responseTime}ms)`);
    } catch (error) {
      services.push({
        name: 'MongoDB',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: error.message
      });
      console.log(`   ❌ Статус: offline (${error.message})`);
    }
    
    // Redis
    console.log('\n🔴 Redis:');
    try {
      const start = Date.now();
      await upstashRedisService.ping();
      const responseTime = Date.now() - start;
      
      services.push({
        name: 'Redis',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString()
      });
      console.log(`   ✅ Статус: online (${responseTime}ms)`);
    } catch (error) {
      services.push({
        name: 'Redis',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: 'Сервис недоступен'
      });
      console.log(`   ❌ Статус: offline (Сервис недоступен)`);
    }
    
    // DecimalChain API
    console.log('\n🔗 DecimalChain API:');
    try {
      const start = Date.now();
      await decimalService.getWorkingBalance();
      const responseTime = Date.now() - start;
      
      services.push({
        name: 'DecimalChain API',
        status: 'online',
        responseTime,
        lastCheck: now.toISOString(),
      });
      console.log(`   ✅ Статус: online (${responseTime}ms)`);
    } catch (error) {
      services.push({
        name: 'DecimalChain API',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: 'Сервис недоступен'
      });
      console.log(`   ❌ Статус: offline (Сервис недоступен)`);
    }
    
    // Telegram Bot
    console.log('\n🤖 Telegram Bot:');
    try {
      const start = Date.now();
      if (botService.bot) {
        await botService.bot.getMe();
        const responseTime = Date.now() - start;
        
        services.push({
          name: 'Telegram Bot',
          status: 'online',
          responseTime,
          lastCheck: now.toISOString()
        });
        console.log(`   ✅ Статус: online (${responseTime}ms)`);
      } else {
        services.push({
          name: 'Telegram Bot',
          status: 'offline',
          responseTime: 0,
          lastCheck: now.toISOString(),
          error: 'Бот не инициализирован'
        });
        console.log(`   ❌ Статус: offline (Бот не инициализирован)`);
      }
    } catch (error) {
      services.push({
        name: 'Telegram Bot',
        status: 'offline',
        responseTime: 0,
        lastCheck: now.toISOString(),
        error: error.message
      });
      console.log(`   ❌ Статус: offline (${error.message})`);
    }
    
    console.log('\n📋 ИТОГОВЫЕ ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:');
    console.log('=====================================');
    console.log(JSON.stringify(services, null, 2));
    
    // Статистика
    const onlineCount = services.filter(s => s.status === 'online').length;
    const totalCount = services.length;
    console.log(`\n📊 Статистика: ${onlineCount}/${totalCount} сервисов онлайн`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testServicesStatus();
