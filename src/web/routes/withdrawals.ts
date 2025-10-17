import { Router } from 'express';
import withdrawService from '../../services/withdraw';
import notificationService from '../../services/notifications';
import usersService from '../../services/users';
import auditService from '../../services/audit';
import { authenticateAdmin, AuthRequest } from '../auth';
import logger from '../../services/logger';

const router = Router();

/**
 * GET /api/withdrawals - List withdrawal requests
 */
router.get('/', authenticateAdmin, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as any;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const result = await withdrawService.getAllRequests({ status, userId }, page, limit);
    res.json(result);
  } catch (error) {
    logger.error('Error listing withdrawals:', error);
    res.status(500).json({ error: 'Failed to list withdrawals' });
  }
});

/**
 * GET /api/withdrawals/stats - Get withdrawal statistics
 */
router.get('/stats', authenticateAdmin, async (req: any, res: any) => {
  try {
    const stats = await withdrawService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting withdrawal stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * POST /api/withdrawals/:id/approve - Approve a withdrawal
 */
router.post('/:id/approve', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const requestId = parseInt(req.params.id);
    const { note } = req.body;

    await withdrawService.approve(requestId, req.adminId!, note);

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'approve_withdrawal',
      targetType: 'withdrawal',
      targetId: requestId,
      details: { note },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error approving withdrawal:', error);
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

/**
 * POST /api/withdrawals/:id/reject - Reject a withdrawal
 */
router.post('/:id/reject', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const requestId = parseInt(req.params.id);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const request: any = await withdrawService.getUserRequests(0, 1, 1);
    await withdrawService.reject(requestId, req.adminId!, reason);

    // Notify user
    if (request) {
      const user = await usersService.findById(request.user_id);
      if (user) {
        await notificationService.notifyWithdrawStatusChange(
          user.telegram_id,
          'rejected',
          {
            requestId,
            amount: parseFloat(request.amount),
            note: reason,
          }
        );
      }
    }

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'reject_withdrawal',
      targetType: 'withdrawal',
      targetId: requestId,
      details: { reason },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error rejecting withdrawal:', error);
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

/**
 * POST /api/withdrawals/:id/paid - Mark withdrawal as paid
 */
router.post('/:id/paid', authenticateAdmin, async (req: AuthRequest, res: any) => {
  try {
    const requestId = parseInt(req.params.id);
    const { txid } = req.body;

    const request: any = await withdrawService.getUserRequests(0, 1, 1);
    await withdrawService.markPaid(requestId, req.adminId!, txid);

    // Notify user
    if (request) {
      const user = await usersService.findById(request.user_id);
      if (user) {
        await notificationService.notifyWithdrawStatusChange(
          user.telegram_id,
          'paid',
          {
            requestId,
            amount: parseFloat(request.amount),
          }
        );
      }
    }

    // Log audit
    await auditService.log({
      adminId: req.adminId!,
      action: 'mark_withdrawal_paid',
      targetType: 'withdrawal',
      targetId: requestId,
      details: { txid },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking withdrawal as paid:', error);
    res.status(500).json({ error: 'Failed to mark withdrawal as paid' });
  }
});

export default router;
