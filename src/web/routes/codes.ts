import { Router } from 'express';
import codesService from '../../services/codes';
import auditService from '../../services/audit';
import { authenticateAdmin, AuthRequest } from '../auth';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/codes - List redeem codes
 */
router.get('/', authenticateAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const prefix = req.query.prefix as string;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const result = await codesService.list({ prefix, isActive }, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error listing codes:', error);
    res.status(500).json({ error: 'Failed to list codes' });
  }
});

/**
 * GET /api/codes/stats - Get code statistics
 */
router.get('/stats', authenticateAdmin, async (req: any, res: any) => {
  try {
    const stats = await codesService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting code stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * POST /api/codes - Create new redeem code(s)
 */
router.post('/', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const { prefix, amount, usesAllowed, expiresAt, note, count } = req.body;

    if (!prefix || typeof amount !== 'number' || typeof usesAllowed !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const codeCount = count && count > 1 ? count : 1;
    
    let codes;
    if (codeCount > 1) {
      codes = await codesService.createBulk({
        prefix,
        amount,
        usesAllowed,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        note,
        createdBy: req.adminId!,
        count: codeCount,
      });
    } else {
      const code = await codesService.create({
        prefix,
        amount,
        usesAllowed,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        note,
        createdBy: req.adminId!,
      });
      codes = [code];
    }

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'create_code',
      targetType: 'code',
      details: { prefix, amount, count: codeCount },
    });

    res.json({ success: true, codes });
  } catch (error) {
    logger.error('Error creating code:', error);
    res.status(500).json({ error: 'Failed to create code' });
  }
});

/**
 * PATCH /api/codes/:id/active - Activate/deactivate a code
 */
router.patch('/:id/active', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const codeId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    await codesService.setActive(codeId, isActive);

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: isActive ? 'activate_code' : 'deactivate_code',
      targetType: 'code',
      targetId: codeId,
      details: { isActive },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating code:', error);
    res.status(500).json({ error: 'Failed to update code' });
  }
});

export default router;
