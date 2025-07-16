const { createClient } = require('redis');
require('dotenv').config({ path: '.env' });

async function resetDecimalNonce() {
    const redis = createClient({
        url: process.env.REDIS_URL
    });
    
    try {
        console.log('🔗 Подключение к Redis...');
        await redis.connect();
        await redis.ping();
        console.log('✅ Redis подключен');
        
        // Очищаем кэш nonce
        const nonceKey = 'DECIMAL_NONCE_0x59888c4759503adb6d9280d71999a1db3cf5fb43';
        const lastBlockKey = 'DECIMAL_LAST_BLOCK';
        
        console.log('🧹 Очищаем кэш nonce...');
        await redis.del(nonceKey);
        console.log('✅ Кэш nonce очищен');
        
        // Сбрасываем последний обработанный блок
        console.log('🔄 Сбрасываем последний обработанный блок...');
        await redis.del(lastBlockKey);
        console.log('✅ Последний блок сброшен');
        
        // Проверяем текущий nonce в блокчейне
        const { Web3 } = require('web3');
        const web3 = new Web3('https://node.decimalchain.com/web3/');
        
        const address = '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
        const nonce = await web3.eth.getTransactionCount(address);
        
        console.log(`📊 Текущий nonce в блокчейне: ${nonce}`);
        console.log(`📊 Текущий nonce (latest): ${await web3.eth.getTransactionCount(address, 'latest')}`);
        console.log(`📊 Pending nonce: ${await web3.eth.getTransactionCount(address, 'pending')}`);
        
        // Устанавливаем правильный nonce в кэш
        await redis.setEx(nonceKey, 30, nonce.toString());
        console.log(`✅ Nonce ${nonce} установлен в кэш`);
        
        console.log('🎯 DecimalChain nonce сброшен и синхронизирован');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        await redis.disconnect();
    }
}

resetDecimalNonce(); 