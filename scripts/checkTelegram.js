const TelegramBot = require('node-telegram-bot-api');

async function checkTelegram() {
    // Получаем токен из переменных окружения
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения');
        console.log('Пожалуйста, установите переменную окружения TELEGRAM_BOT_TOKEN');
        return;
    }

    console.log('Attempting to connect to Telegram...');
    
    const bot = new TelegramBot(token, { polling: false });
    
    try {
        // Проверяем подключение, запрашивая информацию о боте
        const me = await bot.getMe();
        console.log('\n✅ Успешно подключились к Telegram Bot API');
        console.log('\nИнформация о боте:');
        console.log(`• Имя: ${me.first_name}`);
        console.log(`• Username: @${me.username}`);
        console.log(`• Bot ID: ${me.id}`);
        
        // Проверяем webhook статус
        const webhookInfo = await bot.getWebHookInfo();
        console.log('\nWebhook статус:');
        console.log(`• URL: ${webhookInfo.url || 'Не установлен'}`);
        console.log(`• Pending updates: ${webhookInfo.pending_update_count}`);
        
        if (webhookInfo.last_error_date) {
            const errorDate = new Date(webhookInfo.last_error_date * 1000);
            console.log(`• Последняя ошибка: ${webhookInfo.last_error_message} (${errorDate.toLocaleString()})`);
        }

        // Проверяем команды бота
        const commands = await bot.getMyCommands();
        console.log('\nНастроенные команды:');
        if (commands.length === 0) {
            console.log('• Команды не настроены');
        } else {
            commands.forEach(cmd => {
                console.log(`• /${cmd.command} - ${cmd.description}`);
            });
        }

        console.log('\n✅ Проверка Telegram бота завершена успешно');
        
    } catch (error) {
        console.error('\n❌ Ошибка при проверке Telegram бота:', error.message);
        
        if (error.code === 'ETELEGRAM') {
            console.log('Проверьте правильность токена бота');
        } else if (error.code === 'ENOTFOUND') {
            console.log('Проблема с подключением к Telegram API. Проверьте интернет-соединение.');
        }
    }
}

// Запускаем проверку
checkTelegram().catch(console.error); 