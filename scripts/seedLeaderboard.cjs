const { MongoClient } = require('mongodb');

// Используем правильные учетные данные MongoDB
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%sE62KPzmHfM'; // Оригинальный пароль с %
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  // Кодируем пароль для URL
  const encodedPassword = encodeURIComponent(password);
  
  return `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = generateCleanMongoURI();
const MONGODB_DB = 'tapdel';

// Тестовые пользователи для лидерборда
const testUsers = [
  {
    userId: 'test-user-1',
    username: 'Никита',
    telegramId: '123456789',
    telegramUsername: 'nikita_cyber',
    telegramFirstName: 'Никита',
    telegramLastName: 'Киберов',
    tokens: 15420,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-2',
    username: 'Анна',
    telegramId: '987654321',
    telegramUsername: 'anna_del',
    telegramFirstName: 'Анна',
    telegramLastName: 'Токенова',
    tokens: 12300,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-3',
    username: 'Максим',
    telegramId: '456789123',
    telegramUsername: 'max_tapper',
    telegramFirstName: 'Максим',
    telegramLastName: 'Тапперович',
    tokens: 9850,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-4',
    username: 'Елена',
    telegramId: '789123456',
    telegramUsername: 'lena_cyber',
    telegramFirstName: 'Елена',
    telegramLastName: 'Киберская',
    tokens: 7200,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-5',
    username: 'Дмитрий',
    telegramId: '321654987',
    telegramUsername: 'dmitry_flex',
    telegramFirstName: 'Дмитрий',
    telegramLastName: 'Флексов',
    tokens: 5600,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-6',
    username: 'Игрок 6782',
    telegramId: '654987321',
    telegramFirstName: 'Мария',
    telegramLastName: 'Гейзерова',
    tokens: 4100,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-7',
    username: 'Алексей',
    telegramId: '147258369',
    telegramUsername: 'alex_del',
    telegramFirstName: 'Алексей',
    telegramLastName: 'Делетнов',
    tokens: 3200,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-8',
    username: 'Виктория',
    telegramId: '963852741',
    telegramUsername: 'vika_tap',
    telegramFirstName: 'Виктория',
    telegramLastName: 'Тапова',
    tokens: 2800,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-9',
    username: 'Игрок 9432',
    telegramId: '258147036',
    telegramFirstName: 'Сергей',
    telegramLastName: 'Токенин',
    tokens: 1950,
    updatedAt: new Date()
  },
  {
    userId: 'test-user-10',
    username: 'Ольга',
    telegramId: '741852963',
    telegramUsername: 'olga_cyber',
    telegramFirstName: 'Ольга',
    telegramLastName: 'Киберовна',
    tokens: 1200,
    updatedAt: new Date()
  }
];

async function seedLeaderboard() {
  let client;
  
  try {
    console.log('🔗 Подключение к MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    const leaderboardCollection = db.collection('leaderboard');
    const usersCollection = db.collection('users');
    
    console.log('📊 Добавление тестовых пользователей в лидерборд...');
    
    // Очищаем существующий лидерборд (опционально)
    // await leaderboardCollection.deleteMany({});
    
    // Добавляем пользователей в лидерборд
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      const rank = i + 1;
      
      // Обновляем или вставляем в лидерборд
      await leaderboardCollection.updateOne(
        { userId: user.userId },
        { 
          $set: { 
            ...user,
            rank: rank 
          } 
        },
        { upsert: true }
      );
      
      // Также добавляем в коллекцию users
      await usersCollection.updateOne(
        { userId: user.userId },
        {
          $set: {
            userId: user.userId,
            profile: {
              userId: user.userId,
              username: user.username,
              maxEnergy: 100,
              energyRecoveryRate: 1,
              maxGear: 'M',
              level: Math.floor(user.tokens / 1000) + 1,
              experience: user.tokens,
              createdAt: new Date(),
              lastLogin: new Date(),
              telegramId: user.telegramId,
              telegramUsername: user.telegramUsername,
              telegramFirstName: user.telegramFirstName,
              telegramLastName: user.telegramLastName
            },
            gameState: {
              tokens: user.tokens,
              highScore: user.tokens,
              engineLevel: 'Mk I',
              gearboxLevel: 'L1',
              batteryLevel: 'B1',
              hyperdriveLevel: 'H1',
              powerGridLevel: 'P1',
              lastSaved: new Date()
            },
            transactions: [],
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      console.log(`✅ Добавлен: ${user.username} с ${user.tokens} токенами (ранг #${rank})`);
    }
    
    // Проверяем результат
    const leaderboardCount = await leaderboardCollection.countDocuments();
    const usersCount = await usersCollection.countDocuments();
    
    console.log(`\n🎯 РЕЗУЛЬТАТ:`);
    console.log(`📊 Пользователей в лидерборде: ${leaderboardCount}`);
    console.log(`👥 Пользователей в базе: ${usersCount}`);
    
    // Показываем топ-5
    const top5 = await leaderboardCollection
      .find()
      .sort({ tokens: -1 })
      .limit(5)
      .toArray();
      
    console.log(`\n🏆 ТОП-5 ЛИДЕРОВ:`);
    top5.forEach((user, index) => {
      console.log(`${index + 1}. ${user.telegramFirstName || user.username} - ${user.tokens} токенов`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при заполнении лидерборда:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔒 Соединение закрыто');
    }
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  seedLeaderboard()
    .then(() => {
      console.log('\n✅ Заполнение лидерборда завершено успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { seedLeaderboard }; 