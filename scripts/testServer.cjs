const { MongoClient } = require('mongodb');

// Подключение к MongoDB
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  const encodedPassword = encodeURIComponent(password);
  return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();

async function testConnection() {
  let client;
  
  try {
    console.log('🔍 Тестирование подключения к MongoDB...');
    console.log('URI:', MONGODB_URI);
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    console.log('✅ Подключение к MongoDB успешно');
    
    const db = client.db('tapdel');
    const collections = await db.listCollections().toArray();
    console.log('📋 Коллекции в базе данных:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testConnection(); 