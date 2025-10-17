import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CONFIG } from '../config';
import logger from './logger';

const execAsync = promisify(exec);

class BackupService {
  private backupDir = CONFIG.BACKUP_PATH;

  /**
   * Create a database backup
   */
  async createBackup(): Promise<string> {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      if (CONFIG.USE_SQLITE) {
        // SQLite backup: just copy the file
        const sqlitePath = CONFIG.SQLITE_PATH;
        const backupPath = path.join(this.backupDir, `backup-${timestamp}.sqlite`);
        await fs.copyFile(sqlitePath, backupPath);
        
        logger.info(`SQLite backup created: ${backupPath}`);
        return backupPath;
      } else {
        // PostgreSQL backup using pg_dump
        const dbUrl = new URL(CONFIG.DATABASE_URL);
        const dbName = dbUrl.pathname.substring(1);
        const user = dbUrl.username;
        const password = dbUrl.password;
        const host = dbUrl.hostname;
        const port = dbUrl.port || '5432';

        const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -F p -f ${filepath}`;
        
        await execAsync(command);
        
        logger.info(`PostgreSQL backup created: ${filepath}`);
        return filepath;
      }
    } catch (error) {
      logger.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<Array<{ name: string; size: number; created: Date }>> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('backup-')) {
          const filepath = path.join(this.backupDir, file);
          const stats = await fs.stat(filepath);
          
          backups.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
          });
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }

  /**
   * Delete old backups (keep last N)
   */
  async cleanOldBackups(keepLast = 10): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= keepLast) {
        return;
      }

      const toDelete = backups.slice(keepLast);
      
      for (const backup of toDelete) {
        const filepath = path.join(this.backupDir, backup.name);
        await fs.unlink(filepath);
        logger.info(`Deleted old backup: ${backup.name}`);
      }
    } catch (error) {
      logger.error('Error cleaning old backups:', error);
      throw error;
    }
  }

  /**
   * Get backup file path
   */
  getBackupPath(filename: string): string {
    return path.join(this.backupDir, filename);
  }
}

export default new BackupService();
