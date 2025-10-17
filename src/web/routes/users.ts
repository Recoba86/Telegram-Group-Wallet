import { Router } from 'express';
import usersService from '../../services/users';
import walletService from '../../services/wallet';
import auditService from '../../services/audit';
import { authenticateAdmin, AuthRequest } from '../auth';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/users - List users with pagination
 */
router.get('/', authenticateAdmin, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    let result;
    if (search) {
      const users = await usersService.search(search, limit);
      result = { users, total: users.length };
    } else {
      result = await usersService.list(page, limit);
    }

    res.json(result);
  } catch (error) {
    logger.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/users/stats - Get user statistics
 */
router.get('/stats', authenticateAdmin, async (req: AuthRequest, res) => {
  try {
    const stats = await usersService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/users/:id - Get user by ID
 */
router.get('/:id', authenticateAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await usersService.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user transactions
    const { transactions } = await walletService.getTransactions(userId, 1, 20);

    res.json({
      ...user,
      recentTransactions: transactions,
    });
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/users/:id/adjust-balance - Adjust user balance
 */
router.post('/:id/adjust-balance', authenticateAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { amount, reason } = req.body;

    if (typeof amount !== 'number' || !reason) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const transaction = await walletService.adminAdjust(
      userId,
      amount,
      reason,
      req.adminId!
    );

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'adjust_balance',
      targetType: 'user',
      targetId: userId,
      details: { amount, reason },
    });

    res.json({ success: true, transaction });
  } catch (error) {
    logger.error('Error adjusting balance:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

/**
 * GET /api/users/:id/transactions - Get user transactions
 */
router.get('/:id/transactions', authenticateAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await walletService.getTransactions(userId, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error getting user transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
