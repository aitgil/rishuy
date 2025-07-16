const RateLimiter = require('../../src/utils/rateLimiter');

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('checkLimit', () => {
    test('should allow requests within limit', () => {
      const userId = 'user123';
      
      const result1 = rateLimiter.checkLimit(userId);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      
      const result2 = rateLimiter.checkLimit(userId);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
      
      const result3 = rateLimiter.checkLimit(userId);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    test('should block requests over limit', () => {
      const userId = 'user123';
      
      // Use up the limit
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      
      // This should be blocked
      const result = rateLimiter.checkLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should handle different users separately', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      // User 1 uses up limit
      rateLimiter.checkLimit(user1);
      rateLimiter.checkLimit(user1);
      rateLimiter.checkLimit(user1);
      
      const result1 = rateLimiter.checkLimit(user1);
      expect(result1.allowed).toBe(false);
      
      // User 2 should still be allowed
      const result2 = rateLimiter.checkLimit(user2);
      expect(result2.allowed).toBe(true);
    });

    test('should reset after time window', async () => {
      const userId = 'user123';
      
      // Use up the limit
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      
      const blockedResult = rateLimiter.checkLimit(userId);
      expect(blockedResult.allowed).toBe(false);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const allowedResult = rateLimiter.checkLimit(userId);
      expect(allowedResult.allowed).toBe(true);
    });
  });

  describe('resetUser', () => {
    test('should reset user limits', () => {
      const userId = 'user123';
      
      // Use up the limit
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      rateLimiter.checkLimit(userId);
      
      const blockedResult = rateLimiter.checkLimit(userId);
      expect(blockedResult.allowed).toBe(false);
      
      // Reset user
      rateLimiter.resetUser(userId);
      
      // Should be allowed again
      const allowedResult = rateLimiter.checkLimit(userId);
      expect(allowedResult.allowed).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      rateLimiter.checkLimit(user1);
      rateLimiter.checkLimit(user1);
      rateLimiter.checkLimit(user2);
      
      const stats = rateLimiter.getStats();
      
      expect(stats.windowMs).toBe(1000);
      expect(stats.maxRequests).toBe(3);
      expect(stats.totalUsers).toBe(2);
      expect(stats.activeUsers).toBe(2);
      expect(stats.totalActiveRequests).toBe(3);
    });
  });

  describe('createLimitMessage', () => {
    test('should create limit message with seconds', () => {
      const limitResult = {
        allowed: false,
        limit: 10,
        retryAfter: 30
      };
      
      const message = RateLimiter.createLimitMessage(limitResult);
      
      expect(message).toContain('יותר מדי בקשות');
      expect(message).toContain('30 שניות');
      expect(message).toContain('10 בקשות לדקה');
    });

    test('should create limit message with minutes and seconds', () => {
      const limitResult = {
        allowed: false,
        limit: 10,
        retryAfter: 90 // 1 minute 30 seconds
      };
      
      const message = RateLimiter.createLimitMessage(limitResult);
      
      expect(message).toContain('דקות ו-30 שניות');
    });

    test('should create limit message with minutes only', () => {
      const limitResult = {
        allowed: false,
        limit: 10,
        retryAfter: 120 // 2 minutes exactly
      };
      
      const message = RateLimiter.createLimitMessage(limitResult);
      
      expect(message).toContain('2 דקות');
      expect(message).not.toContain('ו-0 שניות');
    });
  });

  describe('cleanup', () => {
    test('should clean up inactive users', async () => {
      const userId = 'user123';
      
      rateLimiter.checkLimit(userId);
      expect(rateLimiter.getStats().totalUsers).toBe(1);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Trigger cleanup manually
      rateLimiter._cleanup();
      
      expect(rateLimiter.getStats().totalUsers).toBe(0);
    });
  });

  describe('destroy', () => {
    test('should clean up resources', () => {
      const userId = 'user123';
      rateLimiter.checkLimit(userId);
      
      expect(rateLimiter.getStats().totalUsers).toBe(1);
      
      rateLimiter.destroy();
      
      expect(rateLimiter.getStats().totalUsers).toBe(0);
      expect(rateLimiter.cleanupInterval).toBeNull();
    });
  });

  describe('configuration options', () => {
    test('should respect skipSuccessfulRequests option', () => {
      const limiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 2,
        skipSuccessfulRequests: true
      });
      
      const userId = 'user123';
      
      // These should not count towards limit
      limiter.recordRequest(userId, true);
      limiter.recordRequest(userId, true);
      
      const result = limiter.checkLimit(userId);
      expect(result.allowed).toBe(true);
      
      limiter.destroy();
    });

    test('should respect skipFailedRequests option', () => {
      const limiter = new RateLimiter({
        windowMs: 1000,
        maxRequests: 2,
        skipFailedRequests: true
      });
      
      const userId = 'user123';
      
      // These should not count towards limit
      limiter.recordRequest(userId, false);
      limiter.recordRequest(userId, false);
      
      const result = limiter.checkLimit(userId);
      expect(result.allowed).toBe(true);
      
      limiter.destroy();
    });
  });
});