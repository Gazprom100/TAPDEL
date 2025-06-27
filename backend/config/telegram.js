const token = process.env.TELEGRAM_BOT_TOKEN;
const isProduction = process.env.NODE_ENV === 'production';
const url = process.env.APP_URL || 'https://tapdel.onrender.com';
const webhookPort = process.env.WEBHOOK_PORT || 3001;

module.exports = {
  token,
  isProduction,
  url,
  webhookPort,
  options: isProduction
    ? {
        webHook: {
          port: webhookPort
        }
      }
    : {
        polling: true
      }
}; 