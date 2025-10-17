import { getDatabase } from '../db';
import { Setting } from '../db';
import logger from './logger';

class SettingsService {
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      const db = getDatabase();
      const setting = await db<Setting>('settings')
        .where({ key })
        .first();

      if (!setting) {
        return defaultValue as T;
      }

      return setting.value as T;
    } catch (error) {
      logger.error(`Error getting setting ${key}:`, error);
      return defaultValue as T;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const db = getDatabase();
      await db<Setting>('settings')
        .insert({ key, value: JSON.stringify(value) })
        .onConflict('key')
        .merge({ value: JSON.stringify(value), updated_at: db.fn.now() });
      
      logger.info(`Setting updated: ${key}`);
    } catch (error) {
      logger.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  async getAll(): Promise<Record<string, any>> {
    try {
      const db = getDatabase();
      const settings = await db<Setting>('settings').select('*');
      
      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value;
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting all settings:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = getDatabase();
      await db<Setting>('settings').where({ key }).delete();
      logger.info(`Setting deleted: ${key}`);
    } catch (error) {
      logger.error(`Error deleting setting ${key}:`, error);
      throw error;
    }
  }
}

export default new SettingsService();
