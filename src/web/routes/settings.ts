import { Router } from 'express';
import settingsService from '../../services/settings';
import auditService from '../../services/audit';
import { authenticateAdmin, AuthRequest } from '../auth';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/settings - Get all settings
 */
router.get('/', authenticateAdmin, async (req: any, res: any) => {
  try {
    const settings = await settingsService.getAll();
    res.json(settings);
  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/settings/:key - Update a setting
 */
router.put('/:key', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const key = req.params.key;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await settingsService.set(key, value);

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'update_setting',
      targetType: 'setting',
      details: { key, value },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
