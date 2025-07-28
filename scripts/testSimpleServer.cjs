const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());

// Простой тестовый маршрут
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API работает!' });
});

// Тест активного токена
app.get('/api/active-token', async (req, res) => {
  try {
    // Подключение к MongoDB
    const username = 'TAPDEL';
    const password = 'fpz%sE62KPzmHfM';
    const cluster = 'cluster0.ejo8obw.mongodb.net';
    const database = 'tapdel';
    
    const encodedPassword = encodeURIComponent(password);
    const MONGODB_URI = `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
    
    console.log('Подключение к MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(database);
    
    console.log('MongoDB подключен, получаем токены...');
    
    // Получаем конфигурацию токенов
    const tokenConfig = await db.collection('system_config').findOne({ key: 'tokens' });
    
    if (tokenConfig && tokenConfig.value) {
      const activeToken = tokenConfig.value.find(token => token.isActive);
      
      res.json({
        success: true,
        token: {
          symbol: activeToken?.symbol || 'BOOST',
          name: activeToken?.name || 'BOOST Token',
          address: activeToken?.address || '0x15cefa2ffb0759b519c15e23025a718978be9322',
          decimals: activeToken?.decimals || 18
        }
      });
    } else {
      res.json({
        success: true,
        token: {
          symbol: 'BOOST',
          name: 'BOOST Token',
          address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
          decimals: 18
        }
      });
    }
    
    await client.close();
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`Тестовый сервер запущен на порту ${PORT}`);
}); 