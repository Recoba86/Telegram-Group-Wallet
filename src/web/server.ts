import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { loginHandler } from './auth';
import usersRouter from './routes/users';
import codesRouter from './routes/codes';
import withdrawalsRouter from './routes/withdrawals';
import settingsRouter from './routes/settings';
import walletService from '../services/wallet';
import backupService from '../services/backup';
import logger from '../services/logger';

export function createWebServer(bot: Telegraf): express.Application {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth
  app.post('/api/auth/login', loginHandler);

  // API Routes
  app.use('/api/users', usersRouter);
  app.use('/api/codes', codesRouter);
  app.use('/api/withdrawals', withdrawalsRouter);
  app.use('/api/settings', settingsRouter);

  // Transactions endpoint
  app.get('/api/transactions', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const type = req.query.type as any;

      const result = await walletService.getAllTransactions(
        { userId, type },
        page,
        limit
      );
      res.json(result);
    } catch (error) {
      logger.error('Error getting transactions:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  });

  // Backup endpoint
  app.post('/api/backup', async (req, res) => {
    try {
      const filepath = await backupService.createBackup();
      res.json({ success: true, filepath });
    } catch (error) {
      logger.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  app.get('/api/backups', async (req, res) => {
    try {
      const backups = await backupService.listBackups();
      res.json(backups);
    } catch (error) {
      logger.error('Error listing backups:', error);
      res.status(500).json({ error: 'Failed to list backups' });
    }
  });

  // Webhook endpoint if using webhooks
  if (CONFIG.WEBHOOK_DOMAIN) {
    app.use(bot.webhookCallback(CONFIG.WEBHOOK_PATH));
  }

  // Serve static files from webapp (if built)
  // Only serve webapp if it exists
  const webappPath = path.join(process.cwd(), 'dist/web/webapp/dist');
  
  if (fs.existsSync(webappPath)) {
    app.use(express.static(webappPath));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(webappPath, 'index.html'));
    });
  } else {
    logger.warn('Webapp not built. Admin panel unavailable. Build it with: cd src/web/webapp && npm run build');
    
    // Fallback route
    app.get('*', (req, res) => {
      res.status(404).json({ 
        error: 'Admin panel not available',
        message: 'Webapp has not been built yet'
      });
    });
  }

  return app;
}

export async function startWebServer(app: express.Application): Promise<void> {
  return new Promise((resolve) => {
    app.listen(CONFIG.WEB_PORT, () => {
      logger.info(`Web server started on port ${CONFIG.WEB_PORT}`);
      resolve();
    });
  });
}
