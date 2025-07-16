const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkEvgeniDeposits() {
    console.log('VITE_MONGODB_URI:', process.env.VITE_MONGODB_URI);
    const uri = process.env.VITE_MONGODB_URI?.replace(/^"|"$/g, "").replace(/%s/g, '%25s');
    console.log('Processed URI:', uri);
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('tapdel');
        const depositsCollection = db.collection('deposits');
        const usersCollection = db.collection('users');
        
        // Выведем всех пользователей для поиска
        const allUsers = await usersCollection.find({}).toArray();
        console.log(`\nВсего пользователей в базе: ${allUsers.length}`);
        
        if (allUsers.length > 0) {
            console.log('\nСтруктура данных первого пользователя:');
            console.log(JSON.stringify(allUsers[0], null, 2));
        }
        
        allUsers.forEach((user, index) => {
            const username = user.profile?.username || user.profile?.telegramUsername || user.username || 'Unknown';
            console.log(`${index + 1}. ${username} (ID: ${user._id})`);
        });
        
        // Найдем пользователя Evgeni_Krasnov
        const user = await usersCollection.findOne({ 
            $or: [
                { 'profile.username': 'Evgeni_Krasnov' },
                { 'profile.telegramUsername': 'Evgeni_Krasnov' },
                { username: 'Evgeni_Krasnov' }
            ]
        });
        if (!user) {
            console.log('Пользователь Evgeni_Krasnov не найден');
            return;
        }
        
        console.log(`Пользователь найден: ${user.profile?.username || user.profile?.telegramUsername} (ID: ${user._id})`);
        console.log(`Текущий баланс: ${user.gameBalance || user.balance} DEL`);
        
        // Проверим все коллекции в базе данных
        const collections = await db.listCollections().toArray();
        console.log('\nКоллекции в базе данных:');
        collections.forEach(col => console.log(`- ${col.name}`));
        
        // Найдем все депозиты пользователя
        const deposits = await depositsCollection.find({ 
            userId: user._id.toString()
        }).sort({ createdAt: -1 }).toArray();
        
        console.log(`\nНайдено депозитов: ${deposits.length}`);
        
        // Проверим все депозиты в коллекции
        const allDeposits = await depositsCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
        console.log(`\nПоследние 5 депозитов в базе данных:`);
        allDeposits.forEach((deposit, index) => {
            console.log(`${index + 1}. ID: ${deposit._id}, Сумма: ${deposit.amountRequested} DEL, Уникальная сумма: ${deposit.uniqueAmount} DEL, Статус: ${deposit.matched ? 'matched' : 'waiting'}, Пользователь: ${deposit.userId}`);
        });
        
        deposits.forEach((deposit, index) => {
            console.log(`\n--- Депозит ${index + 1} ---`);
            console.log(`ID: ${deposit._id}`);
            console.log(`Сумма: ${deposit.amountRequested} DEL`);
            console.log(`Уникальная сумма: ${deposit.uniqueAmount} DEL`);
            console.log(`Статус: ${deposit.matched ? 'matched' : 'waiting'}`);
            console.log(`Создан: ${deposit.createdAt}`);
            console.log(`Обновлен: ${deposit.updatedAt}`);
            
            if (!deposit.matched) {
                const now = new Date();
                const createdAt = new Date(deposit.createdAt);
                const timeDiff = now - createdAt;
                const minutesLeft = Math.max(0, 15 - Math.floor(timeDiff / (1000 * 60)));
                console.log(`Время до истечения: ${minutesLeft} минут`);
            }
        });
        
        // Проверим активные депозиты (waiting)
        const activeDeposits = deposits.filter(d => !d.matched);
        console.log(`\nАктивных депозитов: ${activeDeposits.length}`);
        
        if (activeDeposits.length > 0) {
            console.log('\nПроверяем блокчейн для активных депозитов...');
            
            // Здесь можно добавить проверку блокчейна
            // Пока просто покажем информацию
            activeDeposits.forEach(deposit => {
                console.log(`Депозит ${deposit.amountRequested} DEL с уникальной суммой ${deposit.uniqueAmount} DEL ожидает подтверждения`);
            });
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await client.close();
    }
}

checkEvgeniDeposits(); 