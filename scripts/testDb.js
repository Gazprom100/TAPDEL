require('dotenv').config({ path: './backend/.env' });
const { MongoClient } = require('mongodb');

async function testDatabaseConnection() {
    const uri = process.env.VITE_MONGODB_URI;
    if (!uri) {
        console.error('❌ VITE_MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    console.log('Starting database connection test...');
    console.log('='.repeat(50));

    try {
        // Тест подключения
        console.log('1. Testing connection...');
        await client.connect();
        const db = client.db('tapdel');
        console.log('✅ Connection successful\n');

        // Тест операций с пользователем
        console.log('2. Testing user operations...');
        const users = db.collection('users');
        
        const testUser = {
            userId: 'test-' + Date.now(),
            gameState: {
                tokens: 100,
                level: 1,
                experience: 0,
                lastSaved: new Date()
            }
        };

        // Создание пользователя
        await users.updateOne(
            { userId: testUser.userId },
            { $set: testUser },
            { upsert: true }
        );
        console.log('✅ User creation successful');

        // Получение пользователя
        const fetchedUser = await users.findOne({ userId: testUser.userId });
        console.log('✅ User retrieval successful');
        console.log('User data:', fetchedUser);

        // Тест таблицы лидеров
        console.log('\n3. Testing leaderboard operations...');
        const leaderboard = db.collection('leaderboard');
        
        await leaderboard.updateOne(
            { userId: testUser.userId },
            {
                $set: {
                    userId: testUser.userId,
                    username: 'Test User',
                    score: 1000,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log('✅ Leaderboard update successful');

        // Обновление рангов
        const allUsers = await leaderboard.find().sort({ score: -1 }).toArray();
        await Promise.all(allUsers.map((user, index) =>
            leaderboard.updateOne(
                { _id: user._id },
                { $set: { rank: index + 1 } }
            )
        ));

        const top5 = await leaderboard.find().sort({ score: -1 }).limit(5).toArray();
        console.log('✅ Leaderboard retrieval successful');
        console.log('Top 5 players:', top5);

        const userRank = await leaderboard.findOne({ userId: testUser.userId });
        console.log('✅ Rank retrieval successful');
        console.log('Test user rank:', userRank?.rank);

        // Проверка производительности
        console.log('\n4. Testing query performance...');
        console.time('Query without index');
        await users.find({}).limit(10).toArray();
        console.timeEnd('Query without index');

        console.time('Query with index');
        await users.find({}).sort({ userId: 1 }).limit(10).toArray();
        console.timeEnd('Query with index');

        // Проверка индексов
        console.log('\n5. Testing indexes...');
        const userIndexes = await users.indexes();
        console.log('User collection indexes:', userIndexes);

        const leaderboardIndexes = await leaderboard.indexes();
        console.log('Leaderboard collection indexes:', leaderboardIndexes);

        // Очистка тестовых данных
        console.log('\n6. Cleaning up test data...');
        await users.deleteOne({ userId: testUser.userId });
        await leaderboard.deleteOne({ userId: testUser.userId });
        console.log('✅ Cleanup successful');

        console.log('\n='.repeat(50));
        console.log('All tests completed successfully! 🎉');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

testDatabaseConnection().catch(console.error); 