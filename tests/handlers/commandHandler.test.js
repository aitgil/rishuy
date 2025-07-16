const CommandHandler = require('../../src/handlers/commandHandler');

// Mock dependencies
jest.mock('../../src/utils/messageFormatter');
jest.mock('../../src/services/userSettingsService');
jest.mock('../../src/utils/errorHandler');

describe('CommandHandler', () => {
  let commandHandler;
  let mockBot;
  let mockMessageFormatter;
  let mockUserSettingsService;
  let mockErrorHandler;

  const testUserId = '123456789';
  const testChatId = '987654321';
  const testMessageId = 42;
  const testCallbackQueryId = 'callback123';

  beforeEach(() => {
    // Mock bot
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({})
    };

    // Mock MessageFormatter
    mockMessageFormatter = {
      formatWelcomeMessage: jest.fn().mockReturnValue({
        text: 'ברוכים הבאים',
        reply_markup: { inline_keyboard: [] }
      }),
      formatHelpMessage: jest.fn().mockReturnValue({
        text: 'עזרה',
        reply_markup: { inline_keyboard: [] }
      }),
      formatSettingsMenu: jest.fn().mockReturnValue({
        text: 'הגדרות',
        reply_markup: { inline_keyboard: [] },
        parse_mode: 'Markdown'
      })
    };
    MessageFormatter.mockImplementation(() => mockMessageFormatter);

    // Mock UserSettingsService
    mockUserSettingsService = {
      getUserSettings: jest.fn().mockResolvedValue({
        userId: testUserId,
        language: 'he'
      })
    };
    UserSettingsService.mockImplementation(() => mockUserSettingsService);

    // Mock ErrorHandler
    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(true)
    };
    ErrorHandler.mockImplementation(() => mockErrorHandler);

    commandHandler = new CommandHandler(mockBot);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleStartCommand', () => {
    test('should handle start command successfully', async () => {
      const result = await commandHandler.handleStartCommand(testUserId, testChatId);

      expect(result).toBe(true);
      expect(mockUserSettingsService.getUserSettings).toHaveBeenCalledWith(testUserId);
      expect(mockMessageFormatter.formatWelcomeMessage).toHaveBeenCalled();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        'ברוכים הבאים',
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle start command error', async () => {
      mockBot.sendMessage.mockRejectedValue(new Error('Send failed'));

      const result = await commandHandler.handleStartCommand(testUserId, testChatId);

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleHelpCommand', () => {
    test('should handle help command successfully', async () => {
      const result = await commandHandler.handleHelpCommand(testUserId, testChatId);

      expect(result).toBe(true);
      expect(mockMessageFormatter.formatHelpMessage).toHaveBeenCalled();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        'עזרה',
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle help command error', async () => {
      mockBot.sendMessage.mockRejectedValue(new Error('Send failed'));

      const result = await commandHandler.handleHelpCommand(testUserId, testChatId);

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleSettingsCommand', () => {
    test('should handle settings command successfully', async () => {
      const result = await commandHandler.handleSettingsCommand(testUserId, testChatId);

      expect(result).toBe(true);
      expect(mockUserSettingsService.getUserSettings).toHaveBeenCalledWith(testUserId);
      expect(mockMessageFormatter.formatSettingsMenu).toHaveBeenCalled();
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        'הגדרות',
        expect.objectContaining({
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle settings command error', async () => {
      mockUserSettingsService.getUserSettings.mockRejectedValue(new Error('Settings failed'));

      const result = await commandHandler.handleSettingsCommand(testUserId, testChatId);

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleHelpCallback', () => {
    test('should handle help callback successfully', async () => {
      const result = await commandHandler.handleHelpCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(testCallbackQueryId);
      expect(mockMessageFormatter.formatHelpMessage).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        'עזרה',
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle help callback error', async () => {
      mockBot.editMessageText.mockRejectedValue(new Error('Edit failed'));

      const result = await commandHandler.handleHelpCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleSettingsCallback', () => {
    test('should handle settings callback successfully', async () => {
      const result = await commandHandler.handleSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(testCallbackQueryId);
      expect(mockUserSettingsService.getUserSettings).toHaveBeenCalledWith(testUserId);
      expect(mockMessageFormatter.formatSettingsMenu).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });
  });

  describe('handleNewSearchCallback', () => {
    test('should handle new search callback successfully', async () => {
      const result = await commandHandler.handleNewSearchCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('שלחו מספר'),
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('חיפוש חדש'),
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );
    });
  });

  describe('handleMainMenuCallback', () => {
    test('should handle main menu callback successfully', async () => {
      const result = await commandHandler.handleMainMenuCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(testCallbackQueryId);
      expect(mockMessageFormatter.formatWelcomeMessage).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        'ברוכים הבאים',
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId
        })
      );
    });
  });

  describe('handleUnrecognizedText', () => {
    test('should handle unrecognized text successfully', async () => {
      const result = await commandHandler.handleUnrecognizedText(
        'unknown text', testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('לא הבנתי'),
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle unrecognized text error', async () => {
      mockBot.sendMessage.mockRejectedValue(new Error('Send failed'));

      const result = await commandHandler.handleUnrecognizedText(
        'unknown text', testUserId, testChatId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleUnsupportedMessage', () => {
    test('should handle unsupported message successfully', async () => {
      const result = await commandHandler.handleUnsupportedMessage(
        'photo', testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('סוג הודעה לא נתמך'),
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });
  });

  describe('handleUnrecognizedCallback', () => {
    test('should handle unrecognized callback successfully', async () => {
      const result = await commandHandler.handleUnrecognizedCallback(
        'unknown_callback', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'פעולה לא מזוהה',
          show_alert: true
        })
      );
    });

    test('should handle unrecognized callback error', async () => {
      mockBot.answerCallbackQuery.mockRejectedValue(new Error('Answer failed'));

      const result = await commandHandler.handleUnrecognizedCallback(
        'unknown_callback', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    test('getHandlerStats should return handler statistics', () => {
      const stats = commandHandler.getHandlerStats();

      expect(stats).toHaveProperty('supportedCommands');
      expect(stats).toHaveProperty('supportedCallbacks');
      expect(stats).toHaveProperty('handlerType');
      expect(stats.handlerType).toBe('CommandHandler');
      expect(Array.isArray(stats.supportedCommands)).toBe(true);
      expect(Array.isArray(stats.supportedCallbacks)).toBe(true);
    });

    test('validateBotConfiguration should validate configuration', () => {
      expect(commandHandler.validateBotConfiguration()).toBe(true);

      // Test with missing bot
      const handlerWithoutBot = new CommandHandler(null);
      expect(handlerWithoutBot.validateBotConfiguration()).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should handle errors in all methods gracefully', async () => {
      // Test that all methods handle errors and return false
      const methods = [
        () => commandHandler.handleStartCommand(testUserId, testChatId),
        () => commandHandler.handleHelpCommand(testUserId, testChatId),
        () => commandHandler.handleSettingsCommand(testUserId, testChatId),
        () => commandHandler.handleHelpCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => commandHandler.handleSettingsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => commandHandler.handleNewSearchCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => commandHandler.handleMainMenuCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => commandHandler.handleUnrecognizedText('text', testUserId, testChatId),
        () => commandHandler.handleUnsupportedMessage('photo', testUserId, testChatId),
        () => commandHandler.handleUnrecognizedCallback('callback', testUserId, testChatId, testMessageId, testCallbackQueryId)
      ];

      // Make all bot methods fail
      mockBot.sendMessage.mockRejectedValue(new Error('Bot error'));
      mockBot.editMessageText.mockRejectedValue(new Error('Bot error'));
      mockBot.answerCallbackQuery.mockRejectedValue(new Error('Bot error'));

      for (const method of methods) {
        const result = await method();
        expect(result).toBe(false);
      }

      // Verify error handler was called for each method
      expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(methods.length);
    });
  });
});