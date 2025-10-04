const username = 'TAPDEL';
const password = 'fpz%25sE62KPzmHfM'; // Уже закодированный пароль
const cluster = 'cluster0.ejo8obw.mongodb.net';
const database = 'tapdel';

console.log('Исходный пароль:', password);

const MONGODB_URI = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;

console.log('Полный URI:', MONGODB_URI);

// Тестируем подключение
const { MongoClient } = require('mongodb');

async function testConnection() {
  try {
    console.log('Тестируем подключение...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Подключение успешно!');
    await client.close();
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
  }
}

testConnection(); 