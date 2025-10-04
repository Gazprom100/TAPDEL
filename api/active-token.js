const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

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

let client = null;
let db = null;

// Инициализация подключения к MongoDB
const connectToDatabase = async () => {
  if (!client) {
    try {
      console.log('🔗 Подключение к MongoDB...');
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(MONGODB_DB);
      console.log('✅ MongoDB подключен');
    } catch (error) {
      console.error('❌ Ошибка подключения к MongoDB:', error);
      throw error;
    }
  }
  return db;
};

// GET /api/active-token
app.get('/api/active-token', async (req, res) => {
  try {
    const database = await connectToDatabase();
    
    // Получаем конфигурацию токенов из БД или используем дефолтную
    const tokenConfig = await database.collection('system_config').findOne({ key: 'tokens' });
    
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
    
    const tokens = tokenConfig?.value || defaultTokens;
    const activeToken = tokens.find(token => token.isActive) || tokens[0];
    
    res.json({
      success: true,
      token: {
        symbol: activeToken.symbol,
        name: activeToken.name,
        address: activeToken.address,
        decimals: activeToken.decimals
      }
    });
  } catch (error) {
    console.error('Ошибка получения активного токена:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = app;
