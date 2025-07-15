const { Web3 } = require('web3');

// DecimalChain настройки
const RPC_URL = process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/';
const WORKING_ADDRESS = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';

async function analyzeTransaction() {
  try {
    console.log('🔍 АНАЛИЗ ТРАНЗАКЦИИ 0,001 DEL');
    console.log('==============================\n');
    
    // Подключаемся к DecimalChain
    const web3 = new Web3(RPC_URL);
    console.log(`🌐 RPC URL: ${RPC_URL}`);
    console.log(`💼 Адрес кошелька: ${WORKING_ADDRESS}\n`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Подключение к сети: блок #${blockNumber}`);
    
    // Ищем транзакции с суммой 0,001 DEL
    const targetAmountWei = web3.utils.toWei('0.001', 'ether');
    console.log(`🎯 Ищем транзакции на сумму: 0.001 DEL (${targetAmountWei} wei)`);
    
    // Проверяем последние 100 блоков
    console.log('\n🔍 ПОИСК ТРАНЗАКЦИЙ В ПОСЛЕДНИХ 100 БЛОКАХ:');
    console.log('='.repeat(60));
    
    let foundTransactions = [];
    
    for (let i = 0; i < 100; i++) {
      const blockNum = Number(blockNumber) - i;
      const block = await web3.eth.getBlock(blockNum, true);
      
      if (block.transactions) {
        const incomingTxs = block.transactions.filter(tx => 
          tx.to && tx.to.toLowerCase() === WORKING_ADDRESS.toLowerCase()
        );
        
        for (const tx of incomingTxs) {
          const valueDel = web3.utils.fromWei(tx.value, 'ether');
          
          // Ищем точное совпадение или близкие значения
          if (Math.abs(parseFloat(valueDel) - 0.001) < 0.0001) {
            foundTransactions.push({
              hash: tx.hash,
              from: tx.from,
              value: valueDel,
              blockNumber: blockNum,
              timestamp: new Date(block.timestamp * 1000)
            });
          }
        }
      }
      
      // Показываем прогресс каждые 20 блоков
      if (i % 20 === 0) {
        console.log(`   Проверено блоков: ${i + 1}/100`);
      }
    }
    
    if (foundTransactions.length > 0) {
      console.log(`\n✅ НАЙДЕНО ТРАНЗАКЦИЙ: ${foundTransactions.length}`);
      console.log('='.repeat(60));
      
      for (const tx of foundTransactions) {
        console.log(`📄 TX Hash: ${tx.hash}`);
        console.log(`   От: ${tx.from}`);
        console.log(`   Сумма: ${tx.value} DEL`);
        console.log(`   Блок: ${tx.blockNumber}`);
        console.log(`   Время: ${tx.timestamp.toLocaleString()}`);
        console.log('-'.repeat(40));
      }
    } else {
      console.log('\n❌ ТРАНЗАКЦИИ НЕ НАЙДЕНЫ');
      console.log('Проверьте правильность суммы или расширьте поиск');
    }
    
    // Проверяем все входящие транзакции в последних 10 блоках
    console.log('\n📋 ВСЕ ВХОДЯЩИЕ ТРАНЗАКЦИИ (последние 10 блоков):');
    console.log('='.repeat(60));
    
    for (let i = 0; i < 10; i++) {
      const blockNum = Number(blockNumber) - i;
      const block = await web3.eth.getBlock(blockNum, true);
      
      if (block.transactions) {
        const incomingTxs = block.transactions.filter(tx => 
          tx.to && tx.to.toLowerCase() === WORKING_ADDRESS.toLowerCase()
        );
        
        if (incomingTxs.length > 0) {
          console.log(`\n🧱 Блок ${blockNum} (${new Date(block.timestamp * 1000).toLocaleString()}):`);
          
          for (const tx of incomingTxs) {
            const valueDel = web3.utils.fromWei(tx.value, 'ether');
            console.log(`   ${valueDel} DEL от ${tx.from.substring(0, 10)}... (${tx.hash.substring(0, 10)}...)`);
          }
        }
      }
    }
    
    // Проверяем баланс рабочего кошелька
    console.log('\n💰 БАЛАНС РАБОЧЕГО КОШЕЛЬКА:');
    const balanceWei = await web3.eth.getBalance(WORKING_ADDRESS);
    const balanceDel = web3.utils.fromWei(balanceWei, 'ether');
    console.log(`   Wei: ${balanceWei}`);
    console.log(`   DEL: ${balanceDel}`);
    
  } catch (error) {
    console.error('\n❌ ОШИБКА АНАЛИЗА:');
    console.error(error.message);
  }
}

analyzeTransaction().catch(console.error); 