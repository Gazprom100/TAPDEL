const { MongoClient } = require('mongodb');

const username = 'TAPDEL';
const password = 'fpz%sE62KPzmHfM';
const cluster = 'cluster0.ejo8obw.mongodb.net';
const database = 'tapdel';
const encodedPassword = encodeURIComponent(password);
const uri = `mongodb+srv://${username}:${encodedPassword}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;

const TEST_PATTERNS = [
  /^test-/i,
  /^web-user-/i,
  /^demo-/i,
  /^telegram-0+$/,
  /^fake-/i,
  /^dummy-/i,
  /^integration-/i,
  /^dev-/i
];

async function cleanupTestUsers() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(database);

  // Найти всех тестовых пользователей
  const users = await db.collection('users').find({}).toArray();
  const testUsers = users.filter(u => TEST_PATTERNS.some(pat => pat.test(u.userId)));
  const testUserIds = testUsers.map(u => u.userId);

  if (testUserIds.length === 0) {
    console.log('Нет тестовых/вымышленных пользователей для удаления.');
    await client.close();
    return;
  }

  console.log('Будут удалены следующие userId:', testUserIds);

  // Удаляем пользователей
  const userRes = await db.collection('users').deleteMany({ userId: { $in: testUserIds } });
  // Удаляем депозиты
  const depRes = await db.collection('deposits').deleteMany({ userId: { $in: testUserIds } });
  // Удаляем выводы
  const wdrRes = await db.collection('withdrawals').deleteMany({ userId: { $in: testUserIds } });
  // Удаляем из лидерборда
  const lbRes = await db.collection('leaderboard').deleteMany({ userId: { $in: testUserIds } });

  console.log(`Удалено пользователей: ${userRes.deletedCount}`);
  console.log(`Удалено депозитов: ${depRes.deletedCount}`);
  console.log(`Удалено выводов: ${wdrRes.deletedCount}`);
  console.log(`Удалено из лидерборда: ${lbRes.deletedCount}`);

  await client.close();
}

cleanupTestUsers().catch(console.error); 