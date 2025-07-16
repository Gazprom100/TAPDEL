const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function checkEvgeniWithdrawals() {
    const uri = process.env.VITE_MONGODB_URI?.replace(/^"|"$/g, "").replace(/%s/g, '%25s');
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('tapdel');
        const withdrawalsCollection = db.collection('withdrawals');
        const usersCollection = db.collection('users');
        
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
        console.log(`userId: ${user.userId}`);
        console.log(`telegramId: ${user.profile?.telegramId}`);
        
        // Проверим все выводы в базе данных
        const allWithdrawals = await withdrawalsCollection.find({}).sort({ requestedAt: -1 }).limit(10).toArray();
        console.log(`\nВсего выводов в базе данных: ${allWithdrawals.length}`);
        
        allWithdrawals.forEach((withdrawal, index) => {
            console.log(`${index + 1}. ID: ${withdrawal._id}, Сумма: ${withdrawal.amount} DEL, Статус: ${withdrawal.status}, Пользователь: ${withdrawal.userId}, Адрес: ${withdrawal.toAddress}`);
        });
        
        // Найдем все выводы пользователя
        const withdrawals = await withdrawalsCollection.find({ 
            userId: user.userId
        }).sort({ requestedAt: -1 }).toArray();
        
        console.log(`\nНайдено выводов пользователя: ${withdrawals.length}`);
        
        withdrawals.forEach((withdrawal, index) => {
            console.log(`\n--- Вывод ${index + 1} ---`);
            console.log(`ID: ${withdrawal._id}`);
            console.log(`Сумма: ${withdrawal.amount} DEL`);
            console.log(`Адрес: ${withdrawal.toAddress}`);
            console.log(`Статус: ${withdrawal.status}`);
            console.log(`Запрошен: ${withdrawal.requestedAt}`);
            console.log(`Обработан: ${withdrawal.processedAt || 'Не обработан'}`);
            console.log(`TX Hash: ${withdrawal.txHash || 'Нет'}`);
        });
        
        // Проверим активные выводы
        const activeWithdrawals = withdrawals.filter(w => w.status === 'queued' || w.status === 'processing');
        console.log(`\nАктивных выводов: ${activeWithdrawals.length}`);
        
        if (activeWithdrawals.length > 0) {
            console.log('\nАктивные выводы:');
            activeWithdrawals.forEach(withdrawal => {
                console.log(`- Вывод ${withdrawal.amount} DEL на ${withdrawal.toAddress} (статус: ${withdrawal.status})`);
            });
        }
        
        // Проверим неудачные выводы
        const failedWithdrawals = withdrawals.filter(w => w.status === 'error' || w.status === 'failed');
        console.log(`\nНеудачных выводов: ${failedWithdrawals.length}`);
        
        if (failedWithdrawals.length > 0) {
            console.log('\nНеудачные выводы:');
            failedWithdrawals.forEach(withdrawal => {
                console.log(`- Вывод ${withdrawal.amount} DEL на ${withdrawal.toAddress} (статус: ${withdrawal.status})`);
            });
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await client.close();
    }
}

checkEvgeniWithdrawals(); 