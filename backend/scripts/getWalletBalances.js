require('dotenv').config();
const decimalService = require('../services/decimalService');

async function getWalletBalances() {
  try {
    // Инициализируем DecimalService
    if (!decimalService.isInitialized) {
      await decimalService.initialize();
    }

    const workingAddress = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
    
    console.log('🔍 Получаем балансы рабочего кошелька из блокчейна...');
    console.log('📍 Адрес кошелька:', workingAddress);
    console.log('');

    // Токены с их адресами
    const tokens = [
      { symbol: 'BOOST', address: '0x15cefa2ffb0759b519c15e23025a718978be9322', decimals: 18, name: 'BOOST Token' },
      { symbol: 'DEL', address: '0x0000000000000000000000000000000000000000', decimals: 18, name: 'Decimal Token' },
      { symbol: 'MAKAROVSKY', address: '0x4847183b5dc733e145ffeff663a49fa4ef9173ca', decimals: 18, name: 'MAKAROVSKY Token' },
      { symbol: 'BTT', address: '0x4847183b5dc733e145ffeff663a49fa4ef9173ca', decimals: 18, name: 'BTT Token' },
      { symbol: 'SBT', address: '0xec2991de234a010fc5b58842d594fe9ae08d7304', decimals: 18, name: 'SBT Token' }
    ];

    const walletBalances = [];

    for (const token of tokens) {
      try {
        console.log(`🔍 Проверяем ${token.symbol}...`);
        
        const tokenContract = new decimalService.web3.eth.Contract([
          {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
          }
        ], token.address);
        
        const balanceWei = await tokenContract.methods.balanceOf(workingAddress).call();
        const balance = parseFloat(decimalService.web3.utils.fromWei(balanceWei, 'ether'));
        
        walletBalances.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: balance,
          decimals: token.decimals,
          lastUpdated: new Date().toISOString(),
          status: 'live'
        });
        
        console.log(`✅ ${token.symbol}: ${balance} (из блокчейна)`);
        
      } catch (error) {
        console.error(`❌ Ошибка получения баланса для ${token.symbol}:`, error.message);
        
        walletBalances.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: 0,
          decimals: token.decimals,
          lastUpdated: new Date().toISOString(),
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('');
    console.log('📊 ИТОГОВЫЕ ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:');
    console.log('=====================================');
    
    walletBalances.forEach(balance => {
      if (balance.status === 'live') {
        console.log(`✅ ${balance.symbol}: ${balance.balance} ${balance.symbol}`);
      } else {
        console.log(`❌ ${balance.symbol}: ОШИБКА - ${balance.error}`);
      }
    });

    console.log('');
    console.log('🔗 JSON для API:');
    console.log(JSON.stringify({
      success: true,
      balances: walletBalances,
      lastUpdated: new Date().toISOString(),
      source: 'blockchain'
    }, null, 2));

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

getWalletBalances();
