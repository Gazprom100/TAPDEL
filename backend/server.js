const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
app.use(express.static(path.join(__dirname, '../dist')));

// Routes
app.use('/api/telegram', telegramRoutes);
app.use('/api', apiRoutes);
app.use('/api/decimal', decimalRoutes);

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const startServer = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Initialize bot before starting server
      await botService.initialize();

      // Initialize DecimalChain service
      let decimalInitialized = false;
      try {
        await decimalService.initialize();
        decimalInitialized = true;
        console.log('✅ DecimalChain сервис инициализирован');
      } catch (error) {
        console.error('⚠️ DecimalChain сервис недоступен:', error.message);
        console.log('ℹ️ Сервер запустится без DecimalChain функционала');
      }

      const server = app.listen(PORT, async () => {
        console.log('==> Server Configuration:');
        console.log(`Express Port: ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`App URL: ${process.env.APP_URL}`);
        console.log(`Bot Status: ${botService.bot ? 'Active' : 'Disabled'}`);
        console.log(`DecimalChain Status: ${decimalInitialized ? 'Active' : 'Disabled'}`);
        
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