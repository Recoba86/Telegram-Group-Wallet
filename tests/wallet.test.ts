import usersService from '../src/services/users';
import walletService from '../src/services/wallet';
import { TransactionType } from '../src/db';
import { initDatabase, closeDatabase } from '../src/db';

describe('Wallet Service', () => {
  beforeAll(async () => {
    process.env.SQLITE_PATH = ':memory:';
    const db = initDatabase();
    await db.migrate.latest();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('credit', () => {
    it('should credit user balance correctly', async () => {
      // Create test user
      const user = await usersService.create({
        telegramId: 123456,
        displayName: 'Test User',
      });

      // Credit 10 USD
      const transaction = await walletService.credit(
        user.id,
        10.0,
        TransactionType.CREDIT,
        { reason: 'test' }
      );

      expect(transaction.amount).toBe('10.00');
      expect(transaction.balance_after).toBe('10.00');

      // Verify user balance updated
      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser?.balance).toBe('10.00');
    });

    it('should handle multiple concurrent credits safely', async () => {
      const user = await usersService.create({
        telegramId: 789012,
        displayName: 'Concurrent Test',
      });

      // Simulate concurrent credits
      const promises = Array.from({ length: 10 }, (_, i) =>
        walletService.credit(user.id, 1.0, TransactionType.CREDIT, { index: i })
      );

      await Promise.all(promises);

      // Verify final balance is correct
      const updatedUser = await usersService.findById(user.id);
      expect(parseFloat(updatedUser?.balance || '0')).toBe(10.0);
    });
  });

  describe('debit', () => {
    it('should debit user balance correctly', async () => {
      const user = await usersService.create({
        telegramId: 345678,
        displayName: 'Debit Test',
      });

      // Credit first
      await walletService.credit(user.id, 20.0, TransactionType.CREDIT);

      // Debit 5 USD
      const transaction = await walletService.debit(
        user.id,
        5.0,
        TransactionType.DEBIT,
        { reason: 'test' }
      );

      expect(transaction.amount).toBe('5.00');
      expect(transaction.balance_after).toBe('15.00');

      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser?.balance).toBe('15.00');
    });

    it('should reject debit if insufficient balance', async () => {
      const user = await usersService.create({
        telegramId: 456789,
        displayName: 'Insufficient Test',
      });

      await expect(
        walletService.debit(user.id, 10.0, TransactionType.DEBIT)
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('adminAdjust', () => {
    it('should allow positive adjustment', async () => {
      const user = await usersService.create({
        telegramId: 567890,
        displayName: 'Adjust Test',
      });

      await walletService.adminAdjust(user.id, 25.0, 'Admin bonus', 111);

      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser?.balance).toBe('25.00');
    });

    it('should allow negative adjustment', async () => {
      const user = await usersService.create({
        telegramId: 678901,
        displayName: 'Negative Adjust',
      });

      await walletService.credit(user.id, 50.0, TransactionType.CREDIT);
      await walletService.adminAdjust(user.id, -20.0, 'Admin penalty', 111);

      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser?.balance).toBe('30.00');
    });
  });

  describe('getTransactions', () => {
    it('should retrieve user transactions', async () => {
      const user = await usersService.create({
        telegramId: 901234,
        displayName: 'History Test',
      });

      // Create some transactions
      await walletService.credit(user.id, 10.0, TransactionType.CREDIT);
      await walletService.credit(user.id, 5.0, TransactionType.REDEEM);
      await walletService.debit(user.id, 3.0, TransactionType.DEBIT);

      const { transactions, total } = await walletService.getTransactions(user.id, 1, 10);

      expect(total).toBe(3);
      expect(transactions.length).toBe(3);
      expect(transactions[0].type).toBe(TransactionType.DEBIT); // Most recent first
    });
  });
});
