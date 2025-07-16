const BotManager = require('../../src/bot');
const VehicleDataService = require('../../src/services/vehicleDataService');
const UserSettingsService = require('../../src/services/userSettingsService');

// בדיקות אינטגרציה מקצה לקצה
describe('End-to-End Integration Tests', () => {
  let botManager;
  let mockBot;

  // Skip these tests in CI or if explicitly disabled
  const skipTests = process.env.SKIP_E2E_TESTS === 'true' || process.env.CI === 'true';

  beforeAll(() => {
    if (skipTests) {
      console.log('Skipping end-to-end integration tests');
    }
  });

  beforeEach(() => {
    if (skipTests) return;

    // Create comprehensive mock bot
    mockBot = {
      getMe: jest.fn().mockResolvedValue({
        id: 123456789,
        username: 'vehicle_search_bot',
        first_name: 'Vehicle Search Bot',
        is_bot: true
      }),
      startPolling: jest.fn().mockResolvedValue({}),
      stopPolling: jest.fn().mockResolvedValue({}),
      sendMessage: jest.fn().mockImplementation((chatId, text, options) => 
        Promise.resolve({
          message_id: Math.floor(Math.random() * 1000),
          date: Math.floor(Date.now() / 1000),
          chat: { id: chatId },
          text: text,
          reply_markup: options?.reply_markup
        })
      ),
      editMessageText: jest.fn().mockImplementation((text, options) =>
        Promise.resolve({
          message_id: options.message_id,
          date: Math.floor(Date.now() / 1000),
          chat: { id: options.chat_id },
          text: text,
          reply_markup: options?.reply_markup
        })
      ),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      on: jest.fn()
    };

    // Mock TelegramBot
    const TelegramBot = require('node-telegram-bot-api');
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

  describe('Complete User Journey', () => {
    test('should handle complete new user onboarding flow', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const userId = '123456';
      const chatId = '123456';
      
      // Step 1: User sends /start
      const startMessage = {
        message_id: 1,
        from: { id: userId, first_name: 'Test User' },
        chat: { id: chatId, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(startMessage);

      // Should send welcome message
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('ברוכים הבאים'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.any(Array)
          })
        })
      );

      // Step 2: User clicks help button
      const helpCallback = {
        id: 'callback_help',
        from: { id: userId },
        message: {
          message_id: 2,
          chat: { id: chatId },
          date: Math.floor(Date.now() / 1000)
        },
        data: 'help'
      };

      const callbackHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'callback_query'
      )[1];

      await callbackHandler(helpCallback);

      // Should answer callback and edit message
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith('callback_help');
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('איך להשתמש'),
        expect.objectContaining({
          chat_id: chatId,
          message_id: 2
        })
      );

      // Step 3: User goes to settings
      const settingsCallback = {
        id: 'callback_settings',
        from: { id: userId },
        message: {
          message_id: 2,
          chat: { id: chatId }
        },
        data: 'settings'
      };

      await callbackHandler(settingsCallback);

      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('הגדרות הבוט'),
        expect.objectContaining({
          chat_id: chatId,
          message_id: 2,
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle complete vehicle search flow', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const userId = '789012';
      const chatId = '789012';
      
      // Step 1: User sends license plate
      const licensePlateMessage = {
        message_id: 10,
        from: { id: userId, first_name: 'Search User' },
        chat: { id: chatId, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '12345678'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Mock the sendMessage to return a message with ID for editing
      mockBot.sendMessage.mockResolvedValueOnce({
        message_id: 11,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId },
        text: 'מחפש...'
      });

      await messageHandler(licensePlateMessage);

      // Should send searching message first
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('מחפש'),
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );

      // Should then edit with results (wait a bit for async operations)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockBot.editMessageText).toHaveBeenCalled();
      
      // The edit call should contain either results or "no results"
      const editCall = mockBot.editMessageText.mock.calls[
        mockBot.editMessageText.mock.calls.length - 1
      ];
      expect(editCall[0]).toMatch(/נמצאו נתונים|לא נמצאו נתונים/);
    });

    test('should handle settings modification flow', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const userId = '345678';
      const chatId = '345678';
      
      // Step 1: Go to settings
      const settingsMessage = {
        message_id: 20,
        from: { id: userId },
        chat: { id: chatId },
        date: Math.floor(Date.now() / 1000),
        text: '/settings'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(settingsMessage);

      // Step 2: Go to fields settings
      const fieldsCallback = {
        id: 'callback_fields',
        from: { id: userId },
        message: {
          message_id: 21,
          chat: { id: chatId }
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
          chat_id: chatId,
          message_id: 21,
          parse_mode: 'Markdown'
        })
      );

      // Step 3: Toggle a field
      const toggleCallback = {
        id: 'callback_toggle',
        from: { id: userId },
        message: {
          message_id: 21,
          chat: { id: chatId }
        },
        data: 'toggle_field_manufacturer'
      };

      await callbackHandler(toggleCallback);

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'callback_toggle',
        expect.objectContaining({
          text: expect.stringContaining('יצרן'),
          show_alert: false
        })
      );

      // Step 4: Save settings
      const saveCallback = {
        id: 'callback_save',
        from: { id: userId },
        message: {
          message_id: 21,
          chat: { id: chatId }
        },
        data: 'save_fields'
      };

      await callbackHandler(saveCallback);

      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        'callback_save',
        expect.objectContaining({
          text: 'ההגדרות נשמרו!',
          show_alert: false
        })
      );
    });
  });

  describe('Error Scenarios', () => {
    test('should handle invalid license plate gracefully', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const invalidMessage = {
        message_id: 30,
        from: { id: '999999', first_name: 'Error User' },
        chat: { id: '999999', type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: '123' // Too short
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(invalidMessage);

      // Should send error message
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        '999999',
        expect.stringContaining('לא תקין'),
        expect.any(Object)
      );
    });

    test('should handle rate limiting correctly', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const spamUserId = '888888';
      const spamChatId = '888888';
      
      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Send many messages quickly
      const promises = [];
      for (let i = 0; i < 15; i++) {
        const message = {
          message_id: 40 + i,
          from: { id: spamUserId },
          chat: { id: spamChatId },
          date: Math.floor(Date.now() / 1000),
          text: '/start'
        };
        promises.push(messageHandler(message));
      }

      await Promise.all(promises);

      // Should have sent rate limit message
      const rateLimitCall = mockBot.sendMessage.mock.calls.find(
        call => call[1].includes('יותר מדי בקשות')
      );
      expect(rateLimitCall).toBeDefined();
    });

    test('should handle API errors gracefully', async () => {
      if (skipTests) return;

      await botManager.start();
      
      // Mock API to fail
      const originalSearchVehicle = VehicleDataService.prototype.searchVehicle;
      VehicleDataService.prototype.searchVehicle = jest.fn()
        .mockRejectedValue(new Error('API Error'));

      const errorMessage = {
        message_id: 50,
        from: { id: '777777' },
        chat: { id: '777777' },
        date: Math.floor(Date.now() / 1000),
        text: '12345678'
      };

      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      mockBot.sendMessage.mockResolvedValueOnce({
        message_id: 51,
        date: Math.floor(Date.now() / 1000),
        chat: { id: '777777' }
      });

      await messageHandler(errorMessage);

      // Should handle error gracefully
      expect(botManager.stats.errorsHandled).toBeGreaterThan(0);

      // Restore original method
      VehicleDataService.prototype.searchVehicle = originalSearchVehicle;
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple users concurrently', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      // Create messages from different users
      const users = Array.from({ length: 10 }, (_, i) => ({
        userId: `user${i}`,
        chatId: `chat${i}`
      }));

      const messages = users.map((user, i) => ({
        message_id: 60 + i,
        from: { id: user.userId },
        chat: { id: user.chatId },
        date: Math.floor(Date.now() / 1000),
        text: '/start'
      }));

      const startTime = Date.now();
      
      // Process all messages concurrently
      await Promise.all(messages.map(msg => messageHandler(msg)));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle all users within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds
      expect(botManager.stats.messagesProcessed).toBe(10);
    });

    test('should maintain performance with cache usage', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const licensePlateMessage = {
        message_id: 70,
        from: { id: '555555' },
        chat: { id: '555555' },
        date: Math.floor(Date.now() / 1000),
        text: '12345678'
      };

      mockBot.sendMessage.mockResolvedValue({
        message_id: 71,
        date: Math.floor(Date.now() / 1000),
        chat: { id: '555555' }
      });

      // First search
      const startTime1 = Date.now();
      await messageHandler(licensePlateMessage);
      const time1 = Date.now() - startTime1;

      // Second search (should use cache)
      const startTime2 = Date.now();
      await messageHandler({ ...licensePlateMessage, message_id: 72 });
      const time2 = Date.now() - startTime2;

      // Both should complete reasonably quickly
      expect(time1).toBeLessThan(5000);
      expect(time2).toBeLessThan(5000);
    });
  });

  describe('Data Persistence', () => {
    test('should persist user settings across interactions', async () => {
      if (skipTests) return;

      await botManager.start();
      
      const userId = '666666';
      const chatId = '666666';
      
      const callbackHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'callback_query'
      )[1];

      // Step 1: Modify settings
      const toggleCallback = {
        id: 'callback_persist_test',
        from: { id: userId },
        message: {
          message_id: 80,
          chat: { id: chatId }
        },
        data: 'toggle_field_manufacturer'
      };

      await callbackHandler(toggleCallback);

      // Step 2: Check that settings were saved
      const userSettingsService = new UserSettingsService();
      const settings = await userSettingsService.getUserSettings(userId);
      
      // The manufacturer field should have been toggled
      expect(settings.userId).toBe(userId);
      expect(typeof settings.displayFields.manufacturer).toBe('boolean');
    });
  });

  describe('System Health', () => {
    test('should maintain system health under load', async () => {
      if (skipTests) return;

      await botManager.start();
      
      // Check initial health
      const initialHealth = await botManager.healthCheck();
      expect(initialHealth.healthy).toBe(true);

      // Simulate some load
      const messageHandler = mockBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      const loadMessages = Array.from({ length: 20 }, (_, i) => ({
        message_id: 90 + i,
        from: { id: `load_user_${i}` },
        chat: { id: `load_chat_${i}` },
        date: Math.floor(Date.now() / 1000),
        text: i % 2 === 0 ? '/start' : '12345678'
      }));

      await Promise.all(loadMessages.map(msg => messageHandler(msg)));

      // Check health after load
      const postLoadHealth = await botManager.healthCheck();
      expect(postLoadHealth.healthy).toBe(true);

      // Check stats
      const stats = botManager.getStats();
      expect(stats.messagesProcessed).toBe(20);
      expect(stats.isRunning).toBe(true);
    });
  });
});