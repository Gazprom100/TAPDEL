const { MongoClient } = require('mongodb');

async function seedLeaderboard() {
    // Используем существующие учетные данные
    const username = 'TAPDEL';
    const password = encodeURIComponent('fpz%sE62KPzmHfM');
    const cluster = 'cluster0.ejo8obw.mongodb.net';
    const database = 'tapdel';

    const uri = `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
    
    const client = new MongoClient(uri, {
        serverApi: {
            version: '1',
            strict: true,
            deprecationErrors: true,
        }
    });

    console.log('Подключение к MongoDB...');

    try {
        await client.connect();
        console.log('✅ Успешно подключено к MongoDB');

        const db = client.db(database);
        const leaderboard = db.collection('leaderboard');

        // Очищаем существующие данные
        await leaderboard.deleteMany({});
        console.log('🗑️ Очищена таблица лидеров');

        // Создаем тестовые данные
        const testData = [
            { userId: 'user1', username: 'CyberPilot', score: 15000 },
            { userId: 'user2', username: 'NeonRider', score: 12500 },
            { userId: 'user3', username: 'QuantumRacer', score: 11000 },
            { userId: 'user4', username: 'VoidRunner', score: 9800 },
            { userId: 'user5', username: 'DataHunter', score: 8900 },
            { userId: 'user6', username: 'CircuitBreaker', score: 7600 },
            { userId: 'user7', username: 'ByteSlinger', score: 6800 },
            { userId: 'user8', username: 'GlitchMaster', score: 5900 },
            { userId: 'user9', username: 'CodeSlicer', score: 4500 },
            { userId: 'user10', username: 'PixelHacker', score: 3200 }
        ];

        // Добавляем тестовые данные с временными метками
        const testEntries = testData.map(entry => ({
            ...entry,
            updatedAt: new Date(),
            rank: 0 // будет обновлено позже
        }));

        await leaderboard.insertMany(testEntries);
        console.log('📊 Добавлены тестовые данные в таблицу лидеров');

        // Обновляем ранги
        const allUsers = await leaderboard.find().sort({ score: -1 }).toArray();
        await Promise.all(allUsers.map((user, index) =>
            leaderboard.updateOne(
                { _id: user._id },
                { $set: { rank: index + 1 } }
            )
        ));

        console.log('🏆 Обновлены ранги пользователей');

        // Выводим результат
        const topUsers = await leaderboard.find().sort({ score: -1 }).limit(10).toArray();
        console.log('\n🎯 Топ-10 пользователей:');
        topUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} - ${user.score} очков`);
        });

        console.log('\n✅ Инициализация таблицы лидеров завершена!');
    } catch (error) {
        console.error('❌ Ошибка при инициализации:', error);
    } finally {
        await client.close();
        console.log('🔌 Соединение закрыто');
    }
}

// Запускаем скрипт
seedLeaderboard().catch(console.error); 