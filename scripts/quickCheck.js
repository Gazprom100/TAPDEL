const { MongoClient } = require('mongodb');

async function quickCheck() {
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

    console.log('Attempting to connect to MongoDB...');

    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB');

        const db = client.db(database);
        
        // Проверяем доступ к коллекциям
        const collections = await db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(collection => {
            console.log(`• ${collection.name}`);
        });

        // Проверяем основные коллекции
        const users = db.collection('users');
        const leaderboard = db.collection('leaderboard');

        // Проверяем количество документов
        const userCount = await users.countDocuments();
        const leaderboardCount = await leaderboard.countDocuments();

        console.log('\nCollection statistics:');
        console.log(`• Users: ${userCount} documents`);
        console.log(`• Leaderboard: ${leaderboardCount} documents`);

        // Проверяем индексы
        console.log('\nIndexes:');
        
        console.log('\nUsers collection indexes:');
        const userIndexes = await users.indexes();
        userIndexes.forEach(index => {
            console.log(`• ${index.name}: ${JSON.stringify(index.key)}`);
        });

        console.log('\nLeaderboard collection indexes:');
        const leaderboardIndexes = await leaderboard.indexes();
        leaderboardIndexes.forEach(index => {
            console.log(`• ${index.name}: ${JSON.stringify(index.key)}`);
        });

        console.log('\n✅ Connection test completed successfully');
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.log('Could not reach the database server. Please check your internet connection.');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('Connection timed out. The database server might be down or unreachable.');
        } else if (error.name === 'MongoServerError' && error.code === 18) {
            console.log('Authentication failed. Please check your username and password.');
        }
    } finally {
        await client.close();
    }
}

quickCheck().catch(console.error); 