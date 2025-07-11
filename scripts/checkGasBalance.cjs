const { Web3 } = require('web3');

// DecimalChain настройки
const RPC_URL = process.env.DECIMAL_RPC_URL || 'https://node.decimalchain.com/web3/';
const WORKING_ADDRESS = process.env.DECIMAL_WORKING_ADDRESS || '0x59888c4759503AdB6d9280d71999A1Db3Cf5fb43';

async function checkGasBalance() {
  try {
    console.log('🔍 ПРОВЕРКА GAS БАЛАНСА РАБОЧЕГО КОШЕЛЬКА');
    console.log('==========================================\n');
    
    // Подключаемся к DecimalChain
    const web3 = new Web3(RPC_URL);
    console.log(`🌐 RPC URL: ${RPC_URL}`);
    console.log(`💼 Адрес кошелька: ${WORKING_ADDRESS}\n`);
    
    // Проверяем подключение
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`✅ Подключение к сети: блок #${blockNumber}`);
    
    // Получаем gas баланс (нативная монета DEL)
    const gasBalanceWei = await web3.eth.getBalance(WORKING_ADDRESS);
    const gasBalanceDEL = web3.utils.fromWei(gasBalanceWei, 'ether');
    
    console.log(`\n💨 GAS БАЛАНС (нативный DEL):`);
    console.log(`   Wei: ${gasBalanceWei}`);
    console.log(`   DEL: ${gasBalanceDEL}`);
    
    // Проверяем достаточно ли gas для транзакций
    const minGasNeeded = 0.01; // минимум для нескольких транзакций
    const recommendedGas = 0.1; // рекомендуемый уровень
    
    console.log(`\n📊 АНАЛИЗ GAS БАЛАНСА:`);
    
    if (parseFloat(gasBalanceDEL) >= recommendedGas) {
      console.log(`   ✅ Отличный уровень gas (${gasBalanceDEL} DEL >= ${recommendedGas} DEL)`);
      console.log(`   🚀 Можно выполнять транзакции без проблем`);
    } else if (parseFloat(gasBalanceDEL) >= minGasNeeded) {
      console.log(`   ⚠️  Низкий уровень gas (${gasBalanceDEL} DEL)`);
      console.log(`   💡 Рекомендуется пополнить до ${recommendedGas} DEL`);
    } else {
      console.log(`   ❌ Критически низкий gas (${gasBalanceDEL} DEL < ${minGasNeeded} DEL)`);
      console.log(`   🆘 СРОЧНО нужно пополнить gas баланс!`);
    }
    
    // Рассчитываем примерную стоимость транзакции
    const gasLimit = 21000; // стандартный лимит для перевода
    const gasPriceGwei = 50000; // из конфига
    const gasPrice = web3.utils.toWei(gasPriceGwei.toString(), 'gwei');
    const txCostWei = BigInt(gasLimit) * BigInt(gasPrice);
    const txCostDEL = web3.utils.fromWei(txCostWei.toString(), 'ether');
    
    console.log(`\n⛽ СТОИМОСТЬ ТРАНЗАКЦИИ:`);
    console.log(`   Gas Limit: ${gasLimit}`);
    console.log(`   Gas Price: ${gasPriceGwei} Gwei`);
    console.log(`   Стоимость одной транзакции: ${txCostDEL} DEL`);
    
    // Рассчитываем сколько транзакций можно выполнить
    const possibleTx = Math.floor(parseFloat(gasBalanceDEL) / parseFloat(txCostDEL));
    console.log(`   Возможно транзакций с текущим балансом: ${possibleTx}`);
    
    // Проверяем nonce (количество выполненных транзакций)
    const nonce = await web3.eth.getTransactionCount(WORKING_ADDRESS);
    console.log(`\n📈 СТАТИСТИКА КОШЕЛЬКА:`);
    console.log(`   Nonce (выполнено транзакций): ${nonce}`);
    console.log(`   Последний блок: ${blockNumber}`);
    
    console.log(`\n🔧 РЕКОМЕНДАЦИИ:`);
    if (parseFloat(gasBalanceDEL) < minGasNeeded) {
      console.log(`   1. КРИТИЧНО: Пополните gas баланс на ${recommendedGas} DEL`);
      console.log(`   2. Отправьте нативные DEL на адрес: ${WORKING_ADDRESS}`);
      console.log(`   3. После пополнения повторите тест вывода`);
    } else if (parseFloat(gasBalanceDEL) < recommendedGas) {
      console.log(`   1. Рекомендуется пополнить gas до ${recommendedGas} DEL`);
      console.log(`   2. Текущего баланса хватит на ${possibleTx} транзакций`);
    } else {
      console.log(`   ✅ Gas баланс в норме, транзакции должны проходить`);
      console.log(`   🔍 Проверьте другие возможные причины ошибок`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки gas баланса:', error);
    console.error('\n🔍 Возможные причины:');
    console.error('   - Проблемы с RPC соединением');
    console.error('   - Неверный адрес кошелька');
    console.error('   - Сетевые проблемы');
  }
}

// Запуск проверки
checkGasBalance().catch(console.error); 