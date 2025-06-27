require('dotenv').config();
const { MongoClient } = require('mongodb');

async function monitorDatabase() {
    const uri = process.env.VITE_MONGODB_URI;
    if (!uri) {
        console.error('❌ VITE_MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        // Получаем информацию о базе данных
        const admin = client.db().admin();
        
        // Статус сервера
        console.log('Server Status:');
        const serverStatus = await admin.serverStatus();
        console.log('='.repeat(50));
        console.log('• Version:', serverStatus.version);
        console.log('• Uptime:', Math.round(serverStatus.uptime / 3600), 'hours');
        console.log('• Active connections:', serverStatus.connections.current);
        console.log('• Available connections:', serverStatus.connections.available);
        console.log('='.repeat(50), '\n');

        // Статистика базы данных
        console.log('Database Statistics:');
        const dbStats = await client.db().stats();
        console.log('='.repeat(50));
        console.log('• Collections:', dbStats.collections);
        console.log('• Total documents:', dbStats.objects);
        console.log('• Total size:', Math.round(dbStats.dataSize / 1024 / 1024), 'MB');
        console.log('• Average object size:', Math.round(dbStats.avgObjSize), 'bytes');
        console.log('='.repeat(50), '\n');

        // Информация о коллекциях
        console.log('Collections Information:');
        console.log('='.repeat(50));
        const collections = await client.db().listCollections().toArray();
        for (const collection of collections) {
            const stats = await client.db().collection(collection.name).stats();
            console.log(`• ${collection.name}:`);
            console.log('  - Documents:', stats.count);
            console.log('  - Size:', Math.round(stats.size / 1024), 'KB');
            console.log('  - Avg document size:', Math.round(stats.avgObjSize), 'bytes');
            console.log('  - Indexes:', stats.nindexes);
            console.log('  - Index size:', Math.round(stats.totalIndexSize / 1024), 'KB');
            console.log('-'.repeat(50));
        }

        // Проверка индексов
        console.log('\nIndexes Information:');
        console.log('='.repeat(50));
        for (const collection of collections) {
            const indexes = await client.db().collection(collection.name).indexes();
            console.log(`• ${collection.name} indexes:`);
            indexes.forEach(index => {
                console.log('  -', index.name + ':', JSON.stringify(index.key));
            });
            console.log('-'.repeat(50));
        }

        // Проверка производительности
        console.log('\nPerformance Test:');
        console.log('='.repeat(50));
        const testCollection = client.db().collection('users');
        
        console.time('Query without index');
        await testCollection.find({}).limit(10).toArray();
        console.timeEnd('Query without index');

        console.time('Query with index');
        await testCollection.find({}).sort({ userId: 1 }).limit(10).toArray();
        console.timeEnd('Query with index');

    } catch (error) {
        console.error('\n❌ Monitoring failed:', error);
    } finally {
        await client.close();
        console.log('\nMonitoring completed.');
    }
}

monitorDatabase().catch(console.error); 