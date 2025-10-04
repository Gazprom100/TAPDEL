const { connectToDatabase } = require('../config/database');
const tokenBalanceService = require('./tokenBalanceService');

class TokenService {
  constructor() {
    if (TokenService.instance) {
      return TokenService.instance;
    }
    
    this.activeToken = null;
    this.tokens = [];
    this.lastUpdate = null;
    
    TokenService.instance = this;
  }

  // Очистить кеш токенов
  clearCache() {
    console.log('🧹 Очищаем кеш токенов');
    this.activeToken = null;
    this.tokens = [];
    this.lastUpdate = null;
  }

  // Получить активный токен
  async getActiveToken() {
    try {
      // Проверяем кеш (обновляем каждые 5 минут)
      if (this.activeToken && this.lastUpdate && (Date.now() - this.lastUpdate) < 300000) {
        console.log(`🪙 Возвращаем кешированный токен: ${this.activeToken.symbol}`);
        return this.activeToken;
      }

      console.log(`🪙 Загружаем активный токен из БД...`);
      const database = await connectToDatabase();
      
      // Получаем конфигурацию токенов
      const tokenConfig = await database.collection('system_config').findOne({ key: 'tokens' });
      
      console.log(`📋 Конфигурация токенов из БД:`, tokenConfig);
      
      if (tokenConfig && tokenConfig.value) {
        this.tokens = tokenConfig.value;
        console.log(`📋 Все токены:`, this.tokens.map(t => ({ symbol: t.symbol, isActive: t.isActive })));
        
        this.activeToken = this.tokens.find(token => token.isActive);
        this.lastUpdate = Date.now();
        
        console.log(`🪙 Найден активный токен: ${this.activeToken?.symbol || 'не найден'}`);
        
        if (this.activeToken) {
          return this.activeToken;
        }
      }

      console.log(`⚠️ Активный токен не найден, возвращаем дефолтный BOOST`);
      // Дефолтная конфигурация
      const defaultToken = {
        symbol: 'BOOST',
        address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
        decimals: 18,
        name: 'BOOST Token',
        isActive: true
      };

      this.activeToken = defaultToken;
      this.lastUpdate = Date.now();
      
      return defaultToken;
    } catch (error) {
      console.error('Ошибка получения активного токена:', error);
      
      // Fallback на дефолтный токен
      return {
        symbol: 'BOOST',
        address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
        decimals: 18,
        name: 'BOOST Token',
        isActive: true
      };
    }
  }

  // Получить все токены
  async getAllTokens() {
    try {
      const database = await connectToDatabase();
      
      const tokenConfig = await database.collection('system_config').findOne({ key: 'tokens' });
      
      if (tokenConfig && tokenConfig.value) {
        return tokenConfig.value;
      }

      // Дефолтные токены
      return [
        {
          symbol: 'BOOST',
          address: '0x15cefa2ffb0759b519c15e23025a718978be9322',
          decimals: 18,
          name: 'BOOST Token',
          isActive: true
        },
        {
          symbol: 'DEL',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          name: 'Decimal Token',
          isActive: false
        }
      ];
    } catch (error) {
      console.error('Ошибка получения токенов:', error);
      return [];
    }
  }

  // Обновить активный токен
  async activateToken(symbol) {
    try {
      console.log(`🔄 Начинаем активацию токена: ${symbol}`);
      const database = await connectToDatabase();
      
      // Получаем текущую конфигурацию
      const tokenConfig = await database.collection('system_config').findOne({ key: 'tokens' });
      const tokens = tokenConfig?.value || [];
      
      console.log(`📋 Текущие токены в БД:`, tokens.map(t => ({ symbol: t.symbol, isActive: t.isActive })));
      
      // Проверяем, что токен существует
      const targetToken = tokens.find(t => t.symbol === symbol);
      if (!targetToken) {
        console.error(`❌ Токен ${symbol} не найден в базе данных`);
        return false;
      }
      
      // Находим старый активный токен
      const oldActiveToken = tokens.find(token => token.isActive);
      console.log(`🔄 Старый активный токен: ${oldActiveToken?.symbol || 'нет'}`);
      
      // Обновляем активный токен
      const updatedTokens = tokens.map(token => ({
        ...token,
        isActive: token.symbol === symbol
      }));
      
      console.log(`📋 Обновленные токены:`, updatedTokens.map(t => ({ symbol: t.symbol, isActive: t.isActive })));
      
      // Сохраняем в БД
      await database.collection('system_config').updateOne(
        { key: 'tokens' },
        { $set: { value: updatedTokens, updatedAt: new Date() } },
        { upsert: true }
      );
      
      // Добавляем в историю
      await database.collection('token_history').insertOne({
        symbol,
        address: tokens.find(t => t.symbol === symbol)?.address || '',
        changedAt: new Date(),
        changedBy: 'admin',
        reason: 'Смена активного токена'
      });
      
      // Если есть старый активный токен, выполняем миграцию
      if (oldActiveToken && oldActiveToken.symbol !== symbol) {
        console.log(`🔄 Выполняем миграцию с ${oldActiveToken.symbol} на ${symbol}`);
        await tokenBalanceService.migrateToNewToken(oldActiveToken.symbol, symbol);
      }
      
      // ВАЖНО: Сбрасываем кеш после изменений
      this.clearCache();
      
      console.log(`✅ Токен ${symbol} активирован успешно`);
      return true;
    } catch (error) {
      console.error('Ошибка активации токена:', error);
      return false;
    }
  }

  // Добавить новый токен
  async addToken(tokenData) {
    try {
      const database = await connectToDatabase();
      
      // Получаем текущую конфигурацию
      const tokenConfig = await database.collection('system_config').findOne({ key: 'tokens' });
      const tokens = tokenConfig?.value || [];
      
      // Проверяем, что токен не существует
      if (tokens.find(t => t.symbol === tokenData.symbol)) {
        throw new Error('Токен с таким символом уже существует');
      }
      
      // Добавляем новый токен
      const newToken = {
        symbol: tokenData.symbol.toUpperCase(),
        address: tokenData.address,
        decimals: tokenData.decimals || 18,
        name: tokenData.name,
        isActive: false
      };
      
      const updatedTokens = [...tokens, newToken];
      
      // Сохраняем в БД
      await database.collection('system_config').updateOne(
        { key: 'tokens' },
        { $set: { value: updatedTokens, updatedAt: new Date() } },
        { upsert: true }
      );
      
      // Сбрасываем кеш
      this.activeToken = null;
      this.lastUpdate = null;
      
      console.log(`➕ Токен ${tokenData.symbol} добавлен`);
      return true;
    } catch (error) {
      console.error('Ошибка добавления токена:', error);
      throw error;
    }
  }

  // Получить историю изменений
  async getTokenHistory() {
    try {
      const database = await connectToDatabase();
      
      const history = await database.collection('token_history')
        .find({})
        .sort({ changedAt: -1 })
        .limit(50)
        .toArray();
      
      return history;
    } catch (error) {
      console.error('Ошибка получения истории токенов:', error);
      return [];
    }
  }

  // Получить символ активного токена
  async getActiveTokenSymbol() {
    const activeToken = await this.getActiveToken();
    return activeToken?.symbol || 'BOOST';
  }

  // Получить адрес активного токена
  async getActiveTokenAddress() {
    const activeToken = await this.getActiveToken();
    return activeToken?.address || '0x15cefa2ffb0759b519c15e23025a718978be9322';
  }
}

module.exports = new TokenService(); 