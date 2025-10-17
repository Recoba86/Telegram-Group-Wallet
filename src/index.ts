import { initDatabase } from './db';
import { createBot, startBot } from './bot';
import { createWebServer, startWebServer } from './web/server';
import backupService from './services/backup';
import settingsService from './services/settings';
import { CONFIG } from './config';
import logger from './services/logger';
import cron from 'node-cron';

async function main() {
  try {
    logger.info('Starting Telegram Wallet Bot...');

    // Initialize database
    logger.info('Initializing database...');
    const db = initDatabase();
    
    // Run migrations (in production, run separately)
    if (!CONFIG.IS_PRODUCTION) {
      logger.info('Running migrations...');
      await db.migrate.latest();
    }

    // Create bot
    logger.info('Creating bot...');
    const bot = await createBot();

    // Create web server
    logger.info('Creating web server...');
    const app = createWebServer(bot);

    // Start web server
    await startWebServer(app);

    // Start bot
    await startBot(bot);

    // Setup automated backups
    const backupCron = await settingsService.get<string>('BACKUP_CRON', CONFIG.BACKUP_CRON);
    cron.schedule(backupCron, async () => {
      try {
        logger.info('Running automated backup...');
        await backupService.createBackup();
        await backupService.cleanOldBackups(10);
        logger.info('Automated backup completed');
      } catch (error) {
        logger.error('Error in automated backup:', error);
      }
    });

    logger.info('✅ Telegram Wallet Bot is running!');
    logger.info(`📱 Bot: @${(await bot.telegram.getMe()).username}`);
    logger.info(`🌐 Web: http://localhost:${CONFIG.WEB_PORT}`);

  } catch (error) {
    logger.error('Fatal error starting bot:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

main();
