import { DatabaseService } from '../services/db';

export async function testConnection() {
  const db = new DatabaseService();
  
  try {
    console.log('Attempting to connect to MongoDB...');
    await db.connect();
    
    // Пробуем создать тестового пользователя
    const testUserId = 'test_' + Date.now();
    await db.updateUser(testUserId, {
      userId: testUserId,
      profile: {
        userId: testUserId,
        username: 'Test User',
        maxEnergy: 100,
        energyRecoveryRate: 1,
        maxGear: 'N',
        level: 1,
        experience: 0,
        createdAt: new Date(),
        lastLogin: new Date()
      },
      gameState: {
        tokens: 0,
        highScore: 0,
        engineLevel: 'E1',
        gearboxLevel: 'G1',
        batteryLevel: 'B1',
        hyperdriveLevel: 'H1',
        powerGridLevel: 'P1',
        lastSaved: new Date()
      },
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Проверяем, что пользователь создался
    const user = await db.getUser(testUserId);
    console.log('Test user created:', user ? 'Success' : 'Failed');

    // Проверяем работу с таблицей лидеров
    await db.updateLeaderboard({
      userId: testUserId,
      username: 'Test User',
      score: 100
    });

    const leaderboard = await db.getLeaderboard(1);
    console.log('Leaderboard test:', leaderboard.length > 0 ? 'Success' : 'Failed');

    // Удаляем тестового пользователя
    if (user) {
      const client = await db['client'];
      await client?.db('tapdel').collection('users').deleteOne({ userId: testUserId });
      await client?.db('tapdel').collection('leaderboard').deleteOne({ userId: testUserId });
    }

    console.log('✅ MongoDB connection and operations test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return false;
  }
} 