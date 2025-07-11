const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './TAPDEL.env' });

const telegramRoutes = require('./routes/telegram');
const apiRoutes = require('./routes/api');
const decimalRoutes = require('./routes/decimal');
const botService = require('./services/botService');
const decimalService = require('./services/decimalService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes ПЕРЕД static middleware
app.use('/api/telegram', telegramRoutes);
app.use('/api', apiRoutes);

// Static files ПОСЛЕ API роутов
app.use(express.static(path.join(__dirname, '../dist')));

// DecimalChain роуты будут подключены после инициализации сервиса

// Start server
const startServer = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Initialize bot before starting server
      await botService.initialize();

      // Initialize DecimalChain service
      let decimalInitialized = false;
      try {
        console.log('🔄 Инициализируем DecimalChain сервис...');
        console.log('📋 Проверяем переменные окружения:');
        console.log(`   REDIS_URL: ${process.env.REDIS_URL ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
        console.log(`   DECIMAL_WORKING_ADDRESS: ${process.env.DECIMAL_WORKING_ADDRESS ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
        console.log(`   DECIMAL_WORKING_PRIVKEY_ENC: ${process.env.DECIMAL_WORKING_PRIVKEY_ENC ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
        console.log(`   DECIMAL_KEY_PASSPHRASE: ${process.env.DECIMAL_KEY_PASSPHRASE ? 'Установлен' : 'НЕ УСТАНОВЛЕН'}`);
        
        // Добавляем timeout для инициализации
        const initPromise = decimalService.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: DecimalChain инициализация превысила 30 секунд')), 30000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        decimalInitialized = true;
        console.log('✅ DecimalChain сервис инициализирован');
        
        // Подключаем DecimalChain роуты после успешной инициализации
        app.use('/api/decimal', decimalRoutes);
        console.log('🔗 DecimalChain API роуты подключены');
        
      } catch (error) {
        console.error('⚠️ DecimalChain сервис недоступен:', error.message);
        console.error('📋 Подробности ошибки:', error);
        console.log('ℹ️ Сервер запустится без DecimalChain функционала');
        console.log('🔧 Для активации DecimalChain исправьте Redis подключение');
        
        // Добавляем fallback роуты для DecimalChain
        app.get('/api/decimal/*', (req, res) => {
          res.status(503).json({ 
            error: 'DecimalChain сервис временно недоступен',
            details: 'Проблема с Redis подключением - проверьте REDIS_URL',
            status: 'service_unavailable',
            configured: false
          });
        });
        
        app.post('/api/decimal/*', (req, res) => {
          res.status(503).json({ 
            error: 'DecimalChain сервис временно недоступен',
            details: 'Проблема с Redis подключением - проверьте REDIS_URL',
            status: 'service_unavailable',
            configured: false
          });
        });
      }

      // Serve SPA - только для НЕ-API роутов
      app.get('*', (req, res) => {
        // Проверяем что это не API запрос
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API endpoint not found', path: req.path });
        }
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      });

      const server = app.listen(PORT, async () => {
        console.log('==> Server Configuration:');
        console.log(`Express Port: ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`App URL: ${process.env.APP_URL}`);
        console.log(`Bot Status: ${botService.bot ? 'Active' : 'Disabled'}`);
        console.log(`DecimalChain Status: ${decimalInitialized ? 'Active' : 'Disabled'}`);
        
        // ПОДКЛЮЧАЕМ БАЗУ ДАННЫХ К TELEGRAM БОТУ
        if (botService.bot) {
          try {
            const { MongoClient } = require('mongodb');
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
            
            // Подключаем БД к боту
            botService.setDatabase(database);
            console.log('✅ База данных подключена к Telegram боту');
            
            // Запускаем мониторинг DecimalChain если он инициализирован
            if (decimalInitialized) {
              await decimalService.startWatching(database);
              console.log('🔍 DecimalChain мониторинг запущен');
            }
          } catch (error) {
            console.error('❌ Ошибка подключения БД к боту:', error);
          }
        }
        
        // Запускаем мониторинг DecimalChain если он инициализирован
        if (decimalInitialized) {
          try {
            // Получаем подключение к базе данных из API маршрутов
            const { MongoClient } = require('mongodb');
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
            
            // Запускаем мониторинг блокчейна
            await decimalService.startWatching(database);
            console.log('🔍 DecimalChain мониторинг запущен');
          } catch (error) {
            console.error('❌ Ошибка запуска DecimalChain мониторинга:', error);
          }
        }
        
        console.log('==> Server is ready to handle requests');
        resolve(server);
      }).on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
        } else {
          console.error('Server error:', error);
        }
        reject(error);
      });
    } catch (error) {
      console.error('Failed to initialize services:', error);
      reject(error);
    }
  });
};

// Graceful shutdown
const gracefulShutdown = async (server) => {
  console.log('\nStarting graceful shutdown...');
  
  await botService.shutdown();
  await decimalService.disconnect();
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

// Start server
let server = null;

startServer()
  .then((s) => {
    server = s;
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown(server));
process.on('SIGINT', () => gracefulShutdown(server));

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown(server);
}); 