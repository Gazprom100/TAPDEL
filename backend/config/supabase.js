require('dotenv').config();

class SupabaseConfig {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  }

  // Проверка готовности конфигурации
  isConfigured() {
    return !!(this.supabaseUrl && this.supabaseKey);
  }

  // Получение конфигурации для клиента
  getClientConfig() {
    if (!this.isConfigured()) {
      throw new Error('Supabase конфигурация неполная. Проверьте SUPABASE_URL и SUPABASE_ANON_KEY');
    }

    return {
      url: this.supabaseUrl,
      anonKey: this.supabaseKey,
      serviceKey: this.supabaseServiceKey,
      jwtSecret: this.supabaseJwtSecret
    };
  }

  // Получение URL для API запросов
  getApiUrl() {
    if (!this.supabaseUrl) {
      throw new Error('SUPABASE_URL не установлен');
    }
    return this.supabaseUrl;
  }

  // Получение заголовков для API запросов
  getHeaders(useServiceKey = false) {
    const key = useServiceKey ? this.supabaseServiceKey : this.supabaseKey;
    
    if (!key) {
      throw new Error(`Supabase ${useServiceKey ? 'service' : 'anon'} key не установлен`);
    }

    return {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
  }

  // Проверка подключения
  async testConnection() {
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ошибка подключения к Supabase:', error);
      return false;
    }
  }
}

module.exports = new SupabaseConfig();
