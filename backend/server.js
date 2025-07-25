const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './.env' });

const telegramRoutes = require('./routes/telegram');
const apiRoutes = require('./routes/api');
const decimalRoutes = require('./routes/decimal');
const botService = require('./services/botService');
const decimalService = require('./services/decimalService');

// ОПТИМИЗАЦИЯ: Импортируем оптимизированные сервисы
const databaseConfig = require('./config/database');
const cacheService = require('./services/cacheService');

// ВРЕМЕННО: Условная загрузка rate limiter (для deployment)
let rateLimiterMiddleware = null;
try {
  rateLimiterMiddleware = require('./middleware/rateLimiter');
} catch (error) {
  console.warn('⚠️ Rate limiter недоступен (отсутствуют зависимости):', error.message);
}

const app = express();
const PORT = process.env.PORT || 3001; // Изменили порт чтобы избежать конфликта

// === ГЛОБАЛЬНЫЙ ЛОГГЕР ===
app.use((req, res, next) => {
  console.log('==> GLOBAL:', req.method, req.path);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// ОПТИМИЗАЦИЯ: Rate limiting middleware (если доступен)
// ВРЕМЕННО ОТКЛЮЧЕН для диагностики
// if (rateLimiterMiddleware) {
//   app.use(rateLimiterMiddleware.getLoggingMiddleware());
//   app.use(rateLimiterMiddleware.getDynamicLimiter());
// } else {
//   console.log('⚠️ Rate limiting отключен (зависимости недоступны)');
// }
console.log('⚠️ Rate limiting временно отключен для диагностики');

// === API ROUTES (правильный порядок: сначала специфичные, потом общие) ===
console.log('🔗 Регистрирую API роуты...');



// 1. Специфичные роуты (более конкретные)
app.use('/api/telegram', (req, res, next) => { 
  console.log('➡️ /api/telegram', req.method, req.path); 
  next(); 
}, telegramRoutes);

app.use('/api/decimal', (req, res, next) => { 
  console.log('➡️ /api/decimal', req.method, req.path); 
  next(); 
}, decimalRoutes);

// 2. Общий API роут (должен быть последним среди API)
app.use('/api', (req, res, next) => { 
  console.log('➡️ /api', req.method, req.path); 
  next(); 
}, apiRoutes);

// === 404 для API (после всех API-роутов!) ===
app.use('/api/*', (req, res) => {
  console.log('❌ 404 API middleware:', req.method, req.path);
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// === STATIC FILES (только для не-API) ===
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, '../dist'))(req, res, next);
});

// === SPA FALLBACK (только для не-API) ===
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const startServer = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // ОПТИМИЗАЦИЯ: Инициализируем оптимизированные сервисы
      console.log('🚀 Инициализация оптимизированных сервисов...');
      
      // Инициализируем оптимизированную базу данных
      await databaseConfig.connect();
      
      // Инициализируем кеширование
      await cacheService.initialize();
      
      // ОПТИМИЗАЦИЯ: Инициализируем rate limiting (если доступен)
      if (rateLimiterMiddleware) {
        await rateLimiterMiddleware.initialize();
      }
      
      // Initialize bot before starting server (сохраняем оригинальную логику)
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
        
      } catch (error) {
        console.error('⚠️ DecimalChain сервис недоступен:', error.message);
        console.error('📋 Подробности ошибки:', error);
        console.log('ℹ️ Сервер запустится без DecimalChain функционала');
        console.log('🔧 Для активации DecimalChain исправьте Redis подключение');
        
        // Добавляем fallback middleware для DecimalChain
        const decimalUnavailableMiddleware = (req, res) => {
          res.status(503).json({ 
            error: 'DecimalChain сервис временно недоступен',
            details: 'Проблема с Redis подключением - проверьте REDIS_URL',
            status: 'service_unavailable',
            configured: false
          });
        };
        
        // Переопределяем DecimalChain роуты на fallback
        app.use('/api/decimal', decimalUnavailableMiddleware);
      }


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