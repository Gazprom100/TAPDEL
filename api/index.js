const express = require('express');
const cors = require('cors');
const path = require('path');

// Импортируем маршруты из backend
const apiRoutes = require('../backend/routes/api');
const adminRoutes = require('../backend/routes/admin');
const decimalRoutes = require('../backend/routes/decimal');
const telegramRoutes = require('../backend/routes/telegram');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Подключаем маршруты
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/decimal', decimalRoutes);
app.use('/api/telegram', telegramRoutes);

// Fallback для всех остальных маршрутов
app.get('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
