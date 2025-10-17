import usersService from '../src/services/users';
import walletService from '../src/services/wallet';
import withdrawService from '../src/services/withdraw';
import { TransactionType } from '../src/db';
import { initDatabase, closeDatabase } from '../src/db';

describe('Withdraw Service', () => {
  beforeAll(async () => {
    process.env.SQLITE_PATH = ':memory:';
    const db = initDatabase();
    await db.migrate.latest();
    await db.seed.run();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('calculateFee', () => {
    it('should calculate fee correctly', async () => {
      const { fee, netAmount } = await withdrawService.calculateFee(100);

      // Default: 0.10 fixed + 2.5%
      const expectedFee = 0.10 + (100 * 2.5) / 100;
      expect(fee).toBeCloseTo(expectedFee, 2);
      expect(netAmount).toBeCloseTo(100 - expectedFee, 2);
    });
  });

  describe('create', () => {
    it('should create withdraw request and reserve funds', async () => {
      const user = await usersService.create({
        telegramId: 123123,
        displayName: 'Withdraw Test',
      });

      // Credit user first
      await walletService.credit(user.id, 100.0, TransactionType.CREDIT);

      const result = await withdrawService.create({
        userId: user.id,
        amount: 50.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TXxxx123',
      });

      expect(result.success).toBe(true);
      expect(result.request).toBeDefined();

      // Verify funds were reserved (debited)
      const updatedUser = await usersService.findById(user.id);
      expect(parseFloat(updatedUser?.balance || '0')).toBe(50.0);
    });

    it('should reject if insufficient balance', async () => {
      const user = await usersService.create({
        telegramId: 456456,
        displayName: 'Poor User',
      });

      await walletService.credit(user.id, 5.0, TransactionType.CREDIT);

      const result = await withdrawService.create({
        userId: user.id,
        amount: 10.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TXyyy456',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('کافی نیست');
    });

    it('should reject if below minimum', async () => {
      const user = await usersService.create({
        telegramId: 789789,
        displayName: 'Min Test',
      });

      await walletService.credit(user.id, 100.0, TransactionType.CREDIT);

      const result = await withdrawService.create({
        userId: user.id,
        amount: 0.05, // Below minimum
        targetNetwork: 'TRC20',
        targetAddress: 'TXzzz789',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('حداقل');
    });
  });

  describe('approve and reject', () => {
    it('should approve withdraw request', async () => {
      const user = await usersService.create({
        telegramId: 321321,
        displayName: 'Approve Test',
      });

      await walletService.credit(user.id, 100.0, TransactionType.CREDIT);

      const createResult = await withdrawService.create({
        userId: user.id,
        amount: 20.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TXaaa111',
      });

      await withdrawService.approve(createResult.request!.id, 111, 'Approved by admin');

      const { requests } = await withdrawService.getAllRequests({}, 1, 10);
      const request = requests.find(r => r.id === createResult.request!.id);
      
      expect(request?.status).toBe('approved');
    });

    it('should refund on reject', async () => {
      const user = await usersService.create({
        telegramId: 654654,
        displayName: 'Reject Test',
      });

      await walletService.credit(user.id, 100.0, TransactionType.CREDIT);

      const createResult = await withdrawService.create({
        userId: user.id,
        amount: 30.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TXbbb222',
      });

      expect(createResult.success).toBe(true);

      // Balance should be 70 after reservation
      let updatedUser = await usersService.findById(user.id);
      expect(parseFloat(updatedUser?.balance || '0')).toBe(70.0);

      // Reject the withdrawal
      await withdrawService.reject(createResult.request!.id, 111, 'Invalid address');

      // Balance should be back to 100 after refund
      updatedUser = await usersService.findById(user.id);
      expect(parseFloat(updatedUser?.balance || '0')).toBe(100.0);
    });
  });

  describe('canWithdraw (daily limit)', () => {
    it('should enforce daily withdrawal limit', async () => {
      const user = await usersService.create({
        telegramId: 987987,
        displayName: 'Limit Test',
      });

      await walletService.credit(user.id, 1000.0, TransactionType.CREDIT);

      // Create 2 withdrawals (default daily limit)
      await withdrawService.create({
        userId: user.id,
        amount: 10.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TX1',
      });

      await withdrawService.create({
        userId: user.id,
        amount: 10.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TX2',
      });

      // Third should fail
      const result = await withdrawService.create({
        userId: user.id,
        amount: 10.0,
        targetNetwork: 'TRC20',
        targetAddress: 'TX3',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('محدودیت');
    });
  });
});
