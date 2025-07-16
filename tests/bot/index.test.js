const BotManager = require('../../src/bot');

// Mock node-telegram-bot-api
jest.mock('node-telegram-bot-api');

// Mock handlers
jest.mock('../../src/handlers/commandHandler');
jest.mock('../../src/handlers/licensePlateHandler');
jest.mock('../../src/handlers/settingsHandler');
jest.mock('../../src/utils/messageRouter');
jest.mock('../../src/utils/errorHandler');

describe('BotManager', () => {
  let botManager;
  let mockTelegramBot;
  let mockCommandHandler;
  let mockLicensePlateHandler;
  let mockSettingsHandler;
  let mockMessageRouter;
  let mockErrorHandler;

  const testToken = 'test_bot_token';

  beforeEach(() => {
    // Mock TelegramBot
    const TelegramBot = require('node-telegram-bot-api');
    mockTelegramBot = {
      startPolling: jest.fn().mockResolvedValue({}),
      stopPolling: jest.fn().mockResolvedValue({}),
      getMe: jest.fn().mockResolvedValue({
        id: 123456789,
        username: 'test_bot',
        first_name: 'Test Bot'
      }),
      on: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({})
    };
    TelegramBot.mockImplementation(() => mockTelegramBot);

    // Mock handlers
    const CommandHandler = require('../../src/handlers/commandHandler');
    mockCommandHandler = {
      handleStartCommand: jest.fn().mockResolvedValue(true),
      handleHelpCommand: jest.fn().mockResolvedValue(true),
      handleSettingsCommand: jest.fn().mockResolvedValue(true),
      handleHelpCallback: jest.fn().mockResolvedValue(true),
      handleSettingsCallback: jest.fn().mockResolvedValue(true),
      handleNewSearchCallback: jest.fn().mockResolvedValue(true),
      handleMainMenuCallback: jest.fn().mockResolvedValue(true),
      handleUnrecognizedText: jest.fn().mockResolvedValue(true),
      handleUnsupportedMessage: jest.fn().mockResolvedValue(true),
      handleUnrecognizedCallback: jest.fn().mockResolvedValue(true),
      getHandlerStats: jest.fn().mockReturnValue({ type: 'command' })
    };
    CommandHandler.mockImplementation(() => mockCommandHandler);

    const LicensePlateHandler = require('../../src/handlers/licensePlateHandler');
    mockLicensePlateHandler = {
      handleLicensePlateSearch: jest.fn().mockResolvedValue(true),
      handleInvalidLicensePlate: jest.fn().mockResolvedValue(true),
      handleCancelSearchCallback: jest.fn().mockResolvedValue(true),
      handleRetrySearchCallback: jest.fn().mockResolvedValue(true),
      getSearchStats: jest.fn().mockReturnValue({ type: 'licensePlate' })
    };
    LicensePlateHandler.mockImplementation(() => mockLicensePlateHandler);

    const SettingsHandler = require('../../src/handlers/settingsHandler');
    mockSettingsHandler = {
      handleFieldsSettingsCallback: jest.fn().mockResolvedValue(true),
      handleLanguageSettingsCallback: jest.fn().mockResolvedValue(true),
      handleResetSettingsCallback: jest.fn().mockResolvedValue(true),
      handleToggleFieldCallback: jest.fn().mockResolvedValue(true),
      handleSaveFieldsCallback: jest.fn().mockResolvedValue(true),
      handleSetLanguageCallback: jest.fn().mockResolvedValue(true),
      getHandlerStats: jest.fn().mockReturnValue({ type: 'settings' })
    };
    SettingsHandler.mockImplementation(() => mockSettingsHandler);

    // Mock MessageRouter
    const MessageRouter = require('../../src/utils/messageRouter');
    mockMessageRouter = {
      routeMessage: jest.fn().mockReturnValue({
        type: 'COMMAND',
        action: 'handleStartCommand',
        data: { userId: '123', chatId: '456' }
      }),
      validateRoutingResult: jest.fn().mockReturnValue(true),
      createErrorContext: jest.fn().mockReturnValue({ context: 'test' }),
      getRoutingStats: jest.fn().mockReturnValue({ type: 'router' })
    };
    MessageRouter.mockImplementation(() => mockMessageRouter);

    // Mock ErrorHandler
    const ErrorHandler = require('../../src/utils/errorHandler');
    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(true),
      logError: jest.fn(),
      getErrorStats: jest.fn().mockReturnValue({ totalErrors: 0 }),
      resetErrorStats: jest.fn()
    };
    ErrorHandler.mockImplementation(() => mockErrorHandler);

    botManager = new BotManager(testToken);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should create BotManager with token', () => {
      expect(botManager.token).toBe(testToken);
      expect(botManager.isRunning).toBe(false);
      expect(botManager.bot).toBeNull();
    });

    test('should throw error without token', () => {
      expect(() => new BotManager()).toThrow('Bot token is required');
    });
  });

  describe('start', () => {
    test('should start bot successfully', async () => {
      const result = await botManager.start();

      expect(result).toBe(true);
      expect(botManager.isRunning).toBe(true);
      expect(botManager.bot).toBeDefined();
      expect(mockTelegramBot.startPolling).toHaveBeenCalled();
      expect(mockTelegramBot.getMe).toHaveBeenCalled();
      expect(botManager.stats.startTime).toBeDefined();
    });

    test('should handle start error', async () => {
      mockTelegramBot.startPolling.mockRejectedValue(new Error('Start failed'));

      await expect(botManager.start()).rejects.toThrow('Start failed');
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    test('should stop bot successfully', async () => {
      await botManager.start();
      const result = await botManager.stop();

      expect(result).toBe(true);
      expect(botManager.isRunning).toBe(false);
      expect(mockTelegramBot.stopPolling).toHaveBeenCalled();
    });

    test('should handle stop when not running', async () => {
      const result = await botManager.stop();
      expect(result).toBe(true);
    });

    test('should handle stop error', async () => {
      await botManager.start();
      mockTelegramBot.stopPolling.mockRejectedValue(new Error('Stop failed'));

      const result = await botManager.stop();
      expect(result).toBe(false);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await botManager.start();
    });

    test('should handle text message', async () => {
      const mockMessage = {
        from: { id: 123 },
        chat: { id: 456 },
        text: '/start'
      };

      // Simulate message event
      const messageHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(mockMessage);

      expect(mockMessageRouter.routeMessage).toHaveBeenCalledWith(mockMessage);
      expect(mockCommandHandler.handleStartCommand).toHaveBeenCalledWith('123', '456');
      expect(botManager.stats.messagesProcessed).toBe(1);
    });

    test('should handle callback query', async () => {
      const mockCallbackQuery = {
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        data: 'help',
        id: 'callback123'
      };

      mockMessageRouter.routeMessage.mockReturnValue({
        type: 'CALLBACK',
        action: 'handleHelpCallback',
        data: {
          userId: '123',
          chatId: '456',
          messageId: 789,
          callbackQueryId: 'callback123'
        }
      });

      // Simulate callback query event
      const callbackHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'callback_query'
      )[1];

      await callbackHandler(mockCallbackQuery);

      expect(mockMessageRouter.routeMessage).toHaveBeenCalledWith(mockCallbackQuery);
      expect(mockCommandHandler.handleHelpCallback).toHaveBeenCalledWith(
        '123', '456', 789, 'callback123'
      );
    });

    test('should handle message error', async () => {
      const mockMessage = {
        from: { id: 123 },
        chat: { id: 456 },
        text: '/start'
      };

      mockMessageRouter.routeMessage.mockImplementation(() => {
        throw new Error('Routing failed');
      });

      const messageHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(mockMessage);

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
      expect(botManager.stats.errorsHandled).toBe(1);
    });

    test('should handle invalid routing result', async () => {
      const mockMessage = {
        from: { id: 123 },
        chat: { id: 456 },
        text: '/start'
      };

      mockMessageRouter.validateRoutingResult.mockReturnValue(false);

      const messageHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'message'
      )[1];

      await messageHandler(mockMessage);

      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('action execution', () => {
    beforeEach(async () => {
      await botManager.start();
    });

    test('should execute license plate search action', async () => {
      const routingResult = {
        type: 'LICENSE_PLATE_SEARCH',
        action: 'handleLicensePlateSearch',
        data: {
          licensePlate: '12345678',
          userId: '123',
          chatId: '456',
          messageId: 789
        }
      };

      await botManager._executeAction(routingResult);

      expect(mockLicensePlateHandler.handleLicensePlateSearch).toHaveBeenCalledWith(
        '12345678', '123', '456', 789
      );
    });

    test('should execute settings action', async () => {
      const routingResult = {
        type: 'FIELD_TOGGLE',
        action: 'handleToggleFieldCallback',
        data: {
          fieldName: 'manufacturer',
          userId: '123',
          chatId: '456',
          messageId: 789,
          callbackQueryId: 'callback123'
        }
      };

      await botManager._executeAction(routingResult);

      expect(mockSettingsHandler.handleToggleFieldCallback).toHaveBeenCalledWith(
        'manufacturer', '123', '456', 789, 'callback123'
      );
    });

    test('should handle unknown action', async () => {
      const routingResult = {
        type: 'UNKNOWN',
        action: 'unknownAction',
        data: {}
      };

      const result = await botManager._executeAction(routingResult);
      expect(result).toBe(false);
    });

    test('should handle routing error action', async () => {
      const routingResult = {
        type: 'ERROR',
        action: 'handleRoutingError',
        data: {
          error: new Error('Routing error'),
          originalMessage: { from: { id: 123 } }
        }
      };

      const result = await botManager._executeAction(routingResult);

      expect(result).toBe(false);
      expect(mockErrorHandler.logError).toHaveBeenCalled();
      expect(mockMessageRouter.createErrorContext).toHaveBeenCalled();
    });
  });

  describe('stats and monitoring', () => {
    test('should return stats', () => {
      const stats = botManager.getStats();

      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('messagesProcessed');
      expect(stats).toHaveProperty('errorsHandled');
      expect(stats).toHaveProperty('handlers');
      expect(stats).toHaveProperty('router');
      expect(stats).toHaveProperty('errors');
    });

    test('should format uptime correctly', () => {
      // Test different uptime formats
      expect(botManager._formatUptime(1000)).toBe('1s');
      expect(botManager._formatUptime(61000)).toBe('1m 1s');
      expect(botManager._formatUptime(3661000)).toBe('1h 1m');
      expect(botManager._formatUptime(90061000)).toBe('1d 1h 1m');
    });

    test('should reset stats', () => {
      botManager.stats.messagesProcessed = 10;
      botManager.stats.errorsHandled = 5;

      botManager.resetStats();

      expect(botManager.stats.messagesProcessed).toBe(0);
      expect(botManager.stats.errorsHandled).toBe(0);
      expect(mockErrorHandler.resetErrorStats).toHaveBeenCalled();
    });
  });

  describe('health check', () => {
    test('should return healthy when running', async () => {
      await botManager.start();
      const health = await botManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.botInfo).toBeDefined();
      expect(health.stats).toBeDefined();
    });

    test('should return unhealthy when not running', async () => {
      const health = await botManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.reason).toBe('Bot not running');
    });

    test('should handle health check error', async () => {
      await botManager.start();
      mockTelegramBot.getMe.mockRejectedValue(new Error('API Error'));

      const health = await botManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.reason).toBe('API Error');
      expect(health.error).toBeDefined();
    });
  });

  describe('error event handling', () => {
    beforeEach(async () => {
      await botManager.start();
    });

    test('should handle polling error', () => {
      const pollingErrorHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'polling_error'
      )[1];

      const error = new Error('Polling error');
      pollingErrorHandler(error);

      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        error,
        { context: 'polling' }
      );
      expect(botManager.stats.errorsHandled).toBe(1);
    });

    test('should handle webhook error', () => {
      const webhookErrorHandler = mockTelegramBot.on.mock.calls.find(
        call => call[0] === 'webhook_error'
      )[1];

      const error = new Error('Webhook error');
      webhookErrorHandler(error);

      expect(mockErrorHandler.logError).toHaveBeenCalledWith(
        error,
        { context: 'webhook' }
      );
      expect(botManager.stats.errorsHandled).toBe(1);
    });
  });
});