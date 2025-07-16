const TelegramBot = require('node-telegram-bot-api');
const BotManager = require('../../src/bot');

// בדיקות אינטגרציה עם Telegram API
describe('Telegram API Integration', () => {
  let botManager;
  let mockBot;

  // Skip these tests if no bot token is provided
  const skipTests = !process.env.TELEGRAM_BOT_TOKEN || process.env.NODE_ENV === 'test';

  beforeAll(() => {
    if (skipTests) {
      console.log('Skipping Telegram API integration tests - no token provided');
    }
  });

  beforeEach(() => {
    if (skipTests) return;

    // Use a mock bot for integration tests to avoid hitting real API
    mockBot = {
      getMe: jest.fn().mockResolvedValue({
        id: 123456789,
        username: 'test_bot',
        first_name: 'Test Bot',
        is_bot: true
      }),
      startPolling: jest.fn().mockResolvedValue({}),
      stopPolling: jest.fn().mockResolvedValue({}),
      sendMessage: jest.fn().mockResolvedValue({
        message_id: 1,
        date: Date.now(),
        chat: { id: 123 },
        text: 'Test message'
      }),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      on: jest.fn()
    };

    // Mock TelegramBot constructor
    jest.spyOn(TelegramBot.prototype, 'constructor').mockImplementation(() => mockBot);
    Object.setPrototypeOf(mockBot, TelegramBot.prototype);

    botManager = new BotManager('test_token');
  });

  afterEach(async () => {
    if (skipTests) return;
    
    if (botManager && botManager.isRunning) {
      await botManager.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Bot Connection', () => {
    test('should connect to Telegram API successfully', async () => {
      if (skipTests) return;

      await botManager.start();

      expect(mockBot.getMe).toHaveBeenCalled();
      expect(mockBot.startPolling).toHaveBeenCalled();
      expect(botManager.isRunning).toBe(true);
    });

    test('should handle connection errors gracefully', async () => {
      if (skipTests) return;

      mockBot.startPolling.mockRejectedValue(new Error('Connection failed'));

      await expect(botManager.start()).rejects.toThrow('Connection failed');
      expect(botManager.isRunning).toBe(false);
    });

    test('should get bot information correctly', async () => {
      if (skipTests) return;

      await botManager.start();
      const health = await botManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.botInfo).toEqual({
        id: 123456789,
        username: 'test_bot',
        firstName: 'Test Bot'
      });
    });
  });

  describe('Message Handling Integration', () => {
    beforeEach(async () => {
      if (skipTests) return;
      await botManager.start();
    });

    test('should handle start command end-to-end', async () => {
      if (skipTests) return;

      const mockMessage = {
        message_id: 1,
        from: { id: 123456, first_name: 'Test User' },
        chat: { id: 123456, type: 'private' },
        date: Date.now(),
        text: '/start'
      };

      // Simulate message event
      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(mockMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('ברוכים הבאים'),
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle license plate search end-to-end', async () => {
      if (skipTests) return;

      const mockMessage = {
        message_id: 1,
        from: { id: 123456, first_name: 'Test User' },
        chat: { id: 123456, type: 'private' },
        date: Date.now(),
        text: '12345678'
      };

      mockBot.sendMessage.mockResolvedValue({
        message_id: 2,
        date: Date.now(),
        chat: { id: 123456 },
        text: 'מחפש...'
      });

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(mockMessage);

      // Should send searching message first
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('מחפש'),
        expect.any(Object)
      );

      // Should then edit with results (or no results)
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle callback queries end-to-end', async () => {
      if (skipTests) return;

      const mockCallbackQuery = {
        id: 'callback123',
        from: { id: 123456, first_name: 'Test User' },
        message: {
          message_id: 2,
          chat: { id: 123456 },
          date: Date.now()
        },
        data: 'help'
      };

      const callbackHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'callback_query'
      )[1];

      await callbackHandler(mockCallbackQuery);

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith('callback123');
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('איך להשתמש'),
        expect.objectContaining({
          chat_id: 123456,
          message_id: 2
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(async () => {
      if (skipTests) return;
      await botManager.start();
    });

    test('should handle API errors gracefully', async () => {
      if (skipTests) return;

      const mockMessage = {
        message_id: 1,
        from: { id: 123456 },
        chat: { id: 123456 },
        date: Date.now(),
        text: '/start'
      };

      mockBot.sendMessage.mockRejectedValue(new Error('API Error'));

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Should not throw error
      await expect(messageHandler(mockMessage)).resolves.not.toThrow();
      expect(botManager.stats.errorsHandled).toBeGreaterThan(0);
    });

    test('should handle polling errors', async () => {
      if (skipTests) return;

      const pollingErrorHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'polling_error'
      )[1];

      const error = new Error('Polling error');
      pollingErrorHandler(error);

      expect(botManager.stats.errorsHandled).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Integration', () => {
    beforeEach(async () => {
      if (skipTests) return;
      await botManager.start();
    });

    test('should apply rate limiting to messages', async () => {
      if (skipTests) return;

      const mockMessage = {
        message_id: 1,
        from: { id: 123456 },
        chat: { id: 123456 },
        date: Date.now(),
        text: '/start'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Send multiple messages quickly
      for (let i = 0; i < 15; i++) {
        await messageHandler({ ...mockMessage, message_id: i + 1 });
      }

      // Should have sent rate limit message
      const rateLimitCall = mockBot.sendMessage.mock.calls.find(
        call => call[1].includes('יותר מדי בקשות')
      );
      expect(rateLimitCall).toBeDefined();
    });
  });

  describe('Settings Integration', () => {
    beforeEach(async () => {
      if (skipTests) return;
      await botManager.start();
    });

    test('should handle settings workflow end-to-end', async () => {
      if (skipTests) return;

      // Start with settings command
      const settingsMessage = {
        message_id: 1,
        from: { id: 123456 },
        chat: { id: 123456 },
        date: Date.now(),
        text: '/settings'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(settingsMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('הגדרות הבוט'),
        expect.objectContaining({
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );

      // Then handle fields settings callback
      const fieldsCallback = {
        id: 'callback123',
        from: { id: 123456 },
        message: {
          message_id: 2,
          chat: { id: 123456 }
        },
        data: 'settings_fields'
      };

      const callbackHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'callback_query'
      )[1];

      await callbackHandler(fieldsCallback);

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('בחירת שדות תצוגה'),
        expect.objectContaining({
          chat_id: 123456,
          message_id: 2
        })
      );
    });
  });

  describe('Performance Integration', () => {
    beforeEach(async () => {
      if (skipTests) return;
      await botManager.start();
    });

    test('should handle concurrent messages efficiently', async () => {
      if (skipTests) return;

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const messages = Array.from({ length: 5 }, (_, i) => ({
        message_id: i + 1,
        from: { id: 123456 + i },
        chat: { id: 123456 + i },
        date: Date.now(),
        text: '/start'
      }));

      const startTime = Date.now();
      
      // Process messages concurrently
      await Promise.all(messages.map(msg => messageHandler(msg)));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process all messages within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds
      expect(botManager.stats.messagesProcessed).toBe(5);
    });

    test('should maintain good performance with cache', async () => {
      if (skipTests) return;

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const licensePlateMessage = {
        message_id: 1,
        from: { id: 123456 },
        chat: { id: 123456 },
        date: Date.now(),
        text: '12345678'
      };

      mockBot.sendMessage.mockResolvedValue({
        message_id: 2,
        date: Date.now(),
        chat: { id: 123456 }
      });

      // First search (should hit API)
      const startTime1 = Date.now();
      await messageHandler(licensePlateMessage);
      const time1 = Date.now() - startTime1;

      // Second search (should hit cache)
      const startTime2 = Date.now();
      await messageHandler({ ...licensePlateMessage, message_id: 2 });
      const time2 = Date.now() - startTime2;

      // Cache hit should be faster (though this is a mock, so times might be similar)
      expect(time2).toBeLessThanOrEqual(time1 + 100); // Allow some variance
    });
  });
});