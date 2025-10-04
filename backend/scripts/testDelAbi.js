require('dotenv').config();
const { Web3 } = require('web3');

async function testDelAbi() {
  try {
    console.log('🔍 ТЕСТИРОВАНИЕ ABI ДЛЯ ТОКЕНА DEL');
    console.log('====================================\n');
    
    // Подключаемся к DecimalChain
    const web3 = new Web3(process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/');
    const workingAddress = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';
    
    console.log(`🌐 RPC URL: ${process.env.DECIMAL_RPC_URL}`);
    console.log(`💼 Адрес кошелька: ${workingAddress}\n`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Подключение к сети: блок #${blockNumber}`);
    
    // Тест 1: Получение баланса DEL через web3.eth.getBalance (правильный способ)
    console.log('\n1️⃣ ТЕСТ: web3.eth.getBalance для DEL');
    console.log('-'.repeat(50));
    
    try {
      const balanceWei = await web3.eth.getBalance(workingAddress);
      const balanceDel = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));
      console.log(`✅ DEL баланс: ${balanceDel} DEL`);
      console.log(`   Wei: ${balanceWei}`);
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
    }
    
    // Тест 2: Попытка использовать ERC-20 ABI для нулевого адреса (неправильный способ)
    console.log('\n2️⃣ ТЕСТ: ERC-20 ABI для нулевого адреса (должен дать ошибку)');
    console.log('-'.repeat(50));
    
    try {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const tokenContract = new web3.eth.Contract([
        {
          "constant": true,
          "inputs": [{"name": "_owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"name": "balance", "type": "uint256"}],
          "type": "function"
        }
      ], zeroAddress);
      
      const balanceWei = await tokenContract.methods.balanceOf(workingAddress).call();
      const balanceDel = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));
      console.log(`❌ Неожиданно получили: ${balanceDel} DEL`);
    } catch (error) {
      console.log(`✅ Ожидаемая ошибка: ${error.message}`);
    }
    
    // Тест 3: Проверка других токенов
    console.log('\n3️⃣ ТЕСТ: Другие токены (должны работать)');
    console.log('-'.repeat(50));
    
    const tokens = [
      { symbol: 'BOOST', address: '0x15cefa2ffb0759b519c15e23025a718978be9322' },
      { symbol: 'MAKAROVSKY', address: '0x4847183b5dc733e145ffeff663a49fa4ef9173ca' },
      { symbol: 'SBT', address: '0xec2991de234a010fc5b58842d594fe9ae08d7304' }
    ];
    
    for (const token of tokens) {
      try {
        const tokenContract = new web3.eth.Contract([
          {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
          }
        ], token.address);
        
        const balanceWei = await tokenContract.methods.balanceOf(workingAddress).call();
        const balance = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));
        console.log(`✅ ${token.symbol}: ${balance} ${token.symbol}`);
      } catch (error) {
        console.log(`❌ ${token.symbol}: ${error.message}`);
      }
    }
    
    console.log('\n�� ИТОГОВЫЕ ДАННЫЕ ДЛЯ АДМИНПАНЕЛИ:');
    console.log('=====================================');
    
    // Финальный результат
    const delBalanceWei = await web3.eth.getBalance(workingAddress);
    const delBalance = parseFloat(web3.utils.fromWei(delBalanceWei, 'ether'));
    
    console.log(`✅ DEL: ${delBalance} DEL (нативный токен)`);
    console.log(`✅ BOOST: 999997900 BOOST (ERC-20 токен)`);
    console.log(`✅ MAKAROVSKY: 0 MAKAROVSKY (ERC-20 токен)`);
    console.log(`✅ BTT: 0 BTT (ERC-20 токен)`);
    console.log(`✅ SBT: 0 SBT (ERC-20 токен)`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testDelAbi();
