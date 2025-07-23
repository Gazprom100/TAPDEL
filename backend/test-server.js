const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './.env' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Тестовые роуты
app.get('/api/test', (req, res) => {
  res.json({ message: 'API работает!', timestamp: new Date() });
});

app.get('/api/leaderboard', (req, res) => {
  res.json([]);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Тестовый сервер запущен на порту ${PORT}`);
}); 