require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkConnection() {
    const uri = process.env.VITE_MONGODB_URI;
    if (!uri) {
        console.error('❌ Error: VITE_MONGODB_URI not found in environment variables');
        console.log('Please create a .env file with your MongoDB connection string:');
        console.log('VITE_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    console.log('Attempting to connect to MongoDB...');

    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB');

        const db = client.db('tapdel');
        
        // Проверяем доступ к коллекциям
        const collections = await db.listCollections().toArray();
        console.log('\nAvailable collections:');
        collections.forEach(collection => {
            console.log(`• ${collection.name}`);
        });

        // Проверяем права на запись
        const testCollection = db.collection('connection_test');
        await testCollection.insertOne({ test: true, timestamp: new Date() });
        await testCollection.deleteOne({ test: true });
        console.log('\n✅ Write access verified');

        // Проверяем индексы
        const users = db.collection('users');
        const userIndexes = await users.indexes();
        console.log('\nUser collection indexes:');
        userIndexes.forEach(index => {
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

 