const decimalService = require('../services/decimalService');

async function testWalletBalanceWithDel() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ WALLET-BALANCE С ПРАВИЛЬНЫМ ABI ДЛЯ DEL');
    console.log('========================================================\n');
    
    // Инициализируем DecimalService
    if (!decimalService.isInitialized) {
      await decimalService.initialize();
    }
    
    const workingAddress = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
    console.log(`💼 Адрес кошелька: ${workingAddress}\n`);
    
    // Тестовые токены
    const tokens = [
      {
        symbol: 'DEL',
        name: 'Decimal Token',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18
      },
      {
        symbol: 'BOOST',
        name: 'BOOST Token',
        address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
        decimals: 18
      },
      {
        symbol: 'MAKAROVSKY',
        name: 'MAKAROVSKY Token',
        address: '0x4847183b5dc733e145ffeff663a49fa4ef9173ca',
        decimals: 18
      },
      {
        symbol: 'SBT',
        name: 'SBT Token',
        address: '0xec2991de234a010fc5b58842d594fe9ae08d7304',
        decimals: 18
      }
    ];
    
    const walletBalances = [];
    
    for (const token of tokens) {
      try {
        console.log(`🔍 Получаем баланс для ${token.symbol}...`);
        
        let balance;
        
        // Для нативного токена DEL используем web3.eth.getBalance
        if (token.symbol === 'DEL') {
          console.log(`   📋 DEL - нативный токен, используем web3.eth.getBalance`);
          const balanceWei = await decimalService.web3.eth.getBalance(workingAddress);
          balance = parseFloat(decimalService.web3.utils.fromWei(balanceWei, 'ether'));
          console.log(`   ✅ DEL баланс: ${balance} DEL`);
        } else {
          console.log(`   📋 ${token.symbol} - ERC-20 токен, используем balanceOf`);
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
          balance = parseFloat(decimalService.web3.utils.fromWei(balanceWei, 'ether'));
          console.log(`   ✅ ${token.symbol} баланс: ${balance} ${token.symbol}`);
        }
        
        const balanceData = {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: balance,
          decimals: token.decimals,
          lastUpdated: new Date().toISOString(),
          status: 'active'
        };
        
        walletBalances.push(balanceData);
        
      } catch (error) {
        console.error(`   ❌ Ошибка получения баланса для ${token.symbol}:`, error.message);
        
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
      
      console.log('');
    }
    
    console.log('📋 ИТОГОВЫЕ ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:');
    console.log('=====================================');
    console.log(JSON.stringify({
      success: true,
      balances: walletBalances,
      lastUpdated: new Date().toISOString(),
      source: 'blockchain'
    }, null, 2));
    
    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!');
    console.log('🔧 Теперь можно применить это решение в admin.js');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testWalletBalanceWithDel();
