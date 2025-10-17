import { getDatabase } from '../db';
import { AuditLog } from '../db';
import logger from './logger';

class AuditService {
  /**
   * Log an admin action
   */
  async log(data: {
    adminId: number;
    action: string;
    targetType?: string;
    targetId?: number;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      const db = getDatabase();
      
      await db<AuditLog>('audit_logs')
        .insert({
          admin_id: data.adminId,
          action: data.action,
          target_type: data.targetType || null,
          target_id: data.targetId || null,
          details: data.details || {},
          created_at: new Date(),
        });

      logger.info(`Audit log: ${data.action} by admin ${data.adminId}`);
    } catch (error) {
      logger.error('Error creating audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(
    filters: {
      adminId?: number;
      action?: string;
      targetType?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    page = 1,
    limit = 50
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const db = getDatabase();
      const offset = (page - 1) * limit;

      let query = db<AuditLog>('audit_logs');
      let countQuery = db<AuditLog>('audit_logs');

      if (filters.adminId) {
        query = query.where({ admin_id: filters.adminId });
        countQuery = countQuery.where({ admin_id: filters.adminId });
      }

      if (filters.action) {
        query = query.where({ action: filters.action });
        countQuery = countQuery.where({ action: filters.action });
      }

      if (filters.targetType) {
        query = query.where({ target_type: filters.targetType });
        countQuery = countQuery.where({ target_type: filters.targetType });
      }

      if (filters.dateFrom) {
        query = query.where('created_at', '>=', filters.dateFrom);
        countQuery = countQuery.where('created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('created_at', '<=', filters.dateTo);
        countQuery = countQuery.where('created_at', '<=', filters.dateTo);
      }

      const [countResult, logs] = await Promise.all([
        countQuery.count('* as count').first(),
        query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      ]);

      const total = parseInt(countResult?.count as string || '0');
      
      return { logs, total };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }
}

export default new AuditService();
