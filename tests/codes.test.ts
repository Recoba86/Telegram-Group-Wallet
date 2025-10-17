import codesService from '../src/services/codes';
import usersService from '../src/services/users';
import { initDatabase, closeDatabase } from '../src/db';

describe('Codes Service', () => {
  beforeAll(async () => {
    process.env.SQLITE_PATH = ':memory:';
    const db = initDatabase();
    await db.migrate.latest();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('create', () => {
    it('should create a unique redeem code', async () => {
      const code = await codesService.create({
        prefix: 'TEST',
        amount: 10.0,
        usesAllowed: 1,
        createdBy: 111,
      });

      expect(code.code).toMatch(/^TEST-/);
      expect(code.amount).toBe('10.00');
      expect(code.uses_allowed).toBe(1);
      expect(code.uses_count).toBe(0);
      expect(code.is_active).toBe(true);
    });

    it('should create codes with expiration', async () => {
      const expiresAt = new Date(Date.now() + 86400000); // +1 day
      const code = await codesService.create({
        prefix: 'EXP',
        amount: 5.0,
        usesAllowed: 10,
        expiresAt,
        createdBy: 111,
      });

      expect(code.expires_at).toBeTruthy();
    });
  });

  describe('validate', () => {
    it('should validate active code', async () => {
      const code = await codesService.create({
        prefix: 'VALID',
        amount: 15.0,
        usesAllowed: 5,
        createdBy: 111,
      });

      const validation = await codesService.validate(code.code);
      expect(validation.valid).toBe(true);
      expect(validation.redeemCode).toBeDefined();
    });

    it('should reject invalid code', async () => {
      const validation = await codesService.validate('INVALID-CODE');
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBeTruthy();
    });

    it('should reject expired code', async () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      const code = await codesService.create({
        prefix: 'EXPIRED',
        amount: 10.0,
        usesAllowed: 1,
        expiresAt,
        createdBy: 111,
      });

      const validation = await codesService.validate(code.code);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('منقضی');
    });

    it('should reject exhausted code', async () => {
      const code = await codesService.create({
        prefix: 'ONCE',
        amount: 10.0,
        usesAllowed: 1,
        createdBy: 111,
      });

      // Use the code once
      const user = await usersService.create({
        telegramId: 111222,
        displayName: 'Test User',
      });
      await codesService.claim(code.code, user.id);

      // Try to use again
      const validation = await codesService.validate(code.code);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('تموم');
    });
  });

  describe('claim', () => {
    it('should claim code successfully', async () => {
      const code = await codesService.create({
        prefix: 'CLAIM',
        amount: 25.0,
        usesAllowed: 1,
        createdBy: 111,
      });

      const user = await usersService.create({
        telegramId: 333444,
        displayName: 'Claimer',
      });

      const result = await codesService.claim(code.code, user.id);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(25.0);

      // Verify user balance updated
      const updatedUser = await usersService.findById(user.id);
      expect(updatedUser?.balance).toBe('25.00');
    });

    it('should increment uses count', async () => {
      const code = await codesService.create({
        prefix: 'MULTI',
        amount: 5.0,
        usesAllowed: 3,
        createdBy: 111,
      });

      const user1 = await usersService.create({
        telegramId: 555666,
        displayName: 'User 1',
      });
      const user2 = await usersService.create({
        telegramId: 777888,
        displayName: 'User 2',
      });

      await codesService.claim(code.code, user1.id);
      await codesService.claim(code.code, user2.id);

      const updatedCode = await codesService.findByCode(code.code);
      expect(updatedCode?.uses_count).toBe(2);
    });

    it('should handle concurrent claims safely', async () => {
      const code = await codesService.create({
        prefix: 'RACE',
        amount: 10.0,
        usesAllowed: 1,
        createdBy: 111,
      });

      const users = await Promise.all([
        usersService.create({ telegramId: 100001, displayName: 'User 1' }),
        usersService.create({ telegramId: 100002, displayName: 'User 2' }),
        usersService.create({ telegramId: 100003, displayName: 'User 3' }),
      ]);

      // All try to claim simultaneously
      const results = await Promise.all(
        users.map(user => codesService.claim(code.code, user.id))
      );

      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);

      // Verify uses count is exactly 1
      const updatedCode = await codesService.findByCode(code.code);
      expect(updatedCode?.uses_count).toBe(1);
    });
  });

  describe('createBulk', () => {
    it('should create multiple codes', async () => {
      const codes = await codesService.createBulk({
        prefix: 'BULK',
        amount: 10.0,
        usesAllowed: 1,
        createdBy: 111,
        count: 5,
      });

      expect(codes.length).toBe(5);
      codes.forEach(code => {
        expect(code.prefix).toBe('BULK');
        expect(code.amount).toBe('10.00');
      });
    });
  });
});
