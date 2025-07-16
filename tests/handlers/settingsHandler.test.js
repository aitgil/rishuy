const SettingsHandler = require('../../src/handlers/settingsHandler');
const UserSettings = require('../../src/models/UserSettings');

// Mock dependencies
jest.mock('../../src/services/userSettingsService');
jest.mock('../../src/utils/messageFormatter');
jest.mock('../../src/utils/errorHandler');

describe('SettingsHandler', () => {
  let handler;
  let mockBot;
  let mockUserSettingsService;
  let mockMessageFormatter;
  let mockErrorHandler;

  const testUserId = '123456789';
  const testChatId = '987654321';
  const testMessageId = 42;
  const testCallbackQueryId = 'callback123';

  beforeEach(() => {
    // Mock bot
    mockBot = {
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({})
    };

    // Mock UserSettingsService
    const UserSettingsService = require('../../src/services/userSettingsService');
    mockUserSettingsService = {
      getUserSettings: jest.fn().mockResolvedValue(new UserSettings(testUserId)),
      updateDisplayField: jest.fn().mockResolvedValue(true),
      updateUserLanguage: jest.fn().mockResolvedValue(true),
      updateCompactMode: jest.fn().mockResolvedValue(true),
      saveUserSettings: jest.fn().mockResolvedValue(true),
      resetUserToDefaults: jest.fn().mockResolvedValue(true)
    };
    UserSettingsService.mockImplementation(() => mockUserSettingsService);

    // Mock MessageFormatter
    const MessageFormatter = require('../../src/utils/messageFormatter');
    mockMessageFormatter = {
      formatFieldsMenu: jest.fn().mockReturnValue({
        text: 'תפריט שדות',
        reply_markup: { inline_keyboard: [] },
        parse_mode: 'Markdown'
      }),
      formatLanguageMenu: jest.fn().mockReturnValue({
        text: 'תפריט שפה',
        reply_markup: { inline_keyboard: [] },
        parse_mode: 'Markdown'
      }),
      formatSettingsMenu: jest.fn().mockReturnValue({
        text: 'תפריט הגדרות',
        reply_markup: { inline_keyboard: [] },
        parse_mode: 'Markdown'
      }),
      formatSaveConfirmation: jest.fn().mockReturnValue({
        text: 'נשמר',
        reply_markup: { inline_keyboard: [] }
      }),
      formatResetConfirmation: jest.fn().mockReturnValue({
        text: 'אופס',
        reply_markup: { inline_keyboard: [] }
      })
    };
    MessageFormatter.mockImplementation(() => mockMessageFormatter);

    // Mock ErrorHandler
    const ErrorHandler = require('../../src/utils/errorHandler');
    mockErrorHandler = {
      handleError: jest.fn().mockResolvedValue(true)
    };
    ErrorHandler.mockImplementation(() => mockErrorHandler);

    handler = new SettingsHandler(mockBot);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleFieldsSettingsCallback', () => {
    test('should handle fields settings callback successfully', async () => {
      const result = await handler.handleFieldsSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(testCallbackQueryId);
      expect(mockUserSettingsService.getUserSettings).toHaveBeenCalledWith(testUserId);
      expect(mockMessageFormatter.formatFieldsMenu).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        'תפריט שדות',
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle fields settings callback error', async () => {
      mockBot.editMessageText.mockRejectedValue(new Error('Edit failed'));

      const result = await handler.handleFieldsSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleLanguageSettingsCallback', () => {
    test('should handle language settings callback successfully', async () => {
      const result = await handler.handleLanguageSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(testCallbackQueryId);
      expect(mockMessageFormatter.formatLanguageMenu).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });
  });

  describe('handleResetSettingsCallback', () => {
    test('should handle reset settings callback successfully', async () => {
      const result = await handler.handleResetSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'מאפס הגדרות...',
          show_alert: false
        })
      );
      expect(mockUserSettingsService.resetUserToDefaults).toHaveBeenCalledWith(testUserId);
      expect(mockMessageFormatter.formatResetConfirmation).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle reset settings failure', async () => {
      mockUserSettingsService.resetUserToDefaults.mockResolvedValue(false);

      const result = await handler.handleResetSettingsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleToggleFieldCallback', () => {
    test('should toggle field successfully', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockSettings.displayFields.manufacturer = true;
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);

      const result = await handler.handleToggleFieldCallback(
        'manufacturer', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockUserSettingsService.updateDisplayField).toHaveBeenCalledWith(
        testUserId, 'manufacturer', false
      );
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('בוטל'),
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle invalid field name', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);

      const result = await handler.handleToggleFieldCallback(
        'invalidField', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'שדה לא מזוהה',
          show_alert: true
        })
      );
    });

    test('should handle toggle field update failure', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockSettings.displayFields.manufacturer = true;
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);
      mockUserSettingsService.updateDisplayField.mockResolvedValue(false);

      const result = await handler.handleToggleFieldCallback(
        'manufacturer', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'שגיאה בעדכון השדה',
          show_alert: true
        })
      );
    });
  });

  describe('handleSaveFieldsCallback', () => {
    test('should handle save fields callback successfully', async () => {
      const result = await handler.handleSaveFieldsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'ההגדרות נשמרו!',
          show_alert: false
        })
      );
      expect(mockMessageFormatter.formatSaveConfirmation).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });
  });

  describe('handleSetLanguageCallback', () => {
    test('should set language successfully', async () => {
      const result = await handler.handleSetLanguageCallback(
        'en', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockUserSettingsService.updateUserLanguage).toHaveBeenCalledWith(testUserId, 'en');
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('English'),
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle Hebrew language selection', async () => {
      const result = await handler.handleSetLanguageCallback(
        'he', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('עברית'),
          show_alert: false
        })
      );
    });

    test('should handle language update failure', async () => {
      mockUserSettingsService.updateUserLanguage.mockResolvedValue(false);

      const result = await handler.handleSetLanguageCallback(
        'en', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'שגיאה בעדכון השפה',
          show_alert: true
        })
      );
    });
  });

  describe('handleCompactModeCallback', () => {
    test('should toggle compact mode successfully', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockSettings.compactMode = false;
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);

      const result = await handler.handleCompactModeCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockUserSettingsService.updateCompactMode).toHaveBeenCalledWith(testUserId, true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('הופעל'),
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle compact mode update failure', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);
      mockUserSettingsService.updateCompactMode.mockResolvedValue(false);

      const result = await handler.handleCompactModeCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'שגיאה בעדכון המצב',
          show_alert: true
        })
      );
    });
  });

  describe('handleNotificationsCallback', () => {
    test('should toggle notifications successfully', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockSettings.notifications = true;
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);

      const result = await handler.handleNotificationsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockUserSettingsService.saveUserSettings).toHaveBeenCalled();
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: expect.stringContaining('בוטלו'),
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle notifications update failure', async () => {
      const mockSettings = new UserSettings(testUserId);
      mockUserSettingsService.getUserSettings.mockResolvedValue(mockSettings);
      mockUserSettingsService.saveUserSettings.mockResolvedValue(false);

      const result = await handler.handleNotificationsCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'שגיאה בעדכון ההתראות',
          show_alert: true
        })
      );
    });
  });

  describe('utility methods', () => {
    test('getHandlerStats should return handler statistics', () => {
      const stats = handler.getHandlerStats();

      expect(stats).toHaveProperty('handlerType');
      expect(stats).toHaveProperty('supportedCallbacks');
      expect(stats).toHaveProperty('availableFields');
      expect(stats.handlerType).toBe('SettingsHandler');
      expect(Array.isArray(stats.supportedCallbacks)).toBe(true);
      expect(typeof stats.availableFields).toBe('number');
    });

    test('validateHandlerConfiguration should validate configuration', () => {
      expect(handler.validateHandlerConfiguration()).toBe(true);

      // Test with missing bot
      const handlerWithoutBot = new SettingsHandler(null);
      expect(handlerWithoutBot.validateHandlerConfiguration()).toBe(false);
    });

    test('getAvailableFields should return field descriptions', () => {
      const fields = handler.getAvailableFields();

      expect(typeof fields).toBe('object');
      expect(fields).toHaveProperty('manufacturer');
      expect(fields).toHaveProperty('model');
      expect(fields).toHaveProperty('disabilityPermit');
    });

    test('isValidField should validate field names', () => {
      expect(handler.isValidField('manufacturer')).toBe(true);
      expect(handler.isValidField('model')).toBe(true);
      expect(handler.isValidField('invalidField')).toBe(false);
      expect(handler.isValidField('')).toBe(false);
      expect(handler.isValidField(null)).toBe(false);
    });
  });

  describe('error handling', () => {
    test('should handle errors in all callback methods gracefully', async () => {
      const methods = [
        () => handler.handleFieldsSettingsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => handler.handleLanguageSettingsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => handler.handleResetSettingsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => handler.handleSaveFieldsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => handler.handleCompactModeCallback(testUserId, testChatId, testMessageId, testCallbackQueryId),
        () => handler.handleNotificationsCallback(testUserId, testChatId, testMessageId, testCallbackQueryId)
      ];

      // Make bot methods fail
      mockBot.editMessageText.mockRejectedValue(new Error('Bot error'));

      for (const method of methods) {
        const result = await method();
        expect(typeof result).toBe('boolean');
      }
    });

    test('should handle toggle field callback errors gracefully', async () => {
      mockUserSettingsService.getUserSettings.mockRejectedValue(new Error('Service error'));

      const result = await handler.handleToggleFieldCallback(
        'manufacturer', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'אירעה שגיאה',
          show_alert: true
        })
      );
    });

    test('should handle set language callback errors gracefully', async () => {
      mockUserSettingsService.updateUserLanguage.mockRejectedValue(new Error('Service error'));

      const result = await handler.handleSetLanguageCallback(
        'en', testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'אירעה שגיאה',
          show_alert: true
        })
      );
    });
  });
});