const MessageRouter = require('../../src/utils/messageRouter');

describe('MessageRouter', () => {
  let router;

  beforeEach(() => {
    router = new MessageRouter();
  });

  describe('routeMessage', () => {
    test('should route start command', () => {
      const message = {
        text: '/start',
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('COMMAND');
      expect(result.action).toBe('handleStartCommand');
      expect(result.data.userId).toBe(123);
      expect(result.data.chatId).toBe(456);
    });

    test('should route help command', () => {
      const message = {
        text: '/help',
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('COMMAND');
      expect(result.action).toBe('handleHelpCommand');
    });

    test('should route settings command', () => {
      const message = {
        text: '/settings',
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('COMMAND');
      expect(result.action).toBe('handleSettingsCommand');
    });

    test('should route valid license plate', () => {
      const message = {
        text: '12345678',
        from: { id: 123 },
        chat: { id: 456 },
        message_id: 789
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('LICENSE_PLATE_SEARCH');
      expect(result.action).toBe('handleLicensePlateSearch');
      expect(result.data.licensePlate).toBe('12345678');
      expect(result.data.originalText).toBe('12345678');
    });

    test('should route license plate with formatting', () => {
      const message = {
        text: '123-45-678',
        from: { id: 123 },
        chat: { id: 456 },
        message_id: 789
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('LICENSE_PLATE_SEARCH');
      expect(result.data.licensePlate).toBe('12345678');
      expect(result.data.originalText).toBe('123-45-678');
    });

    test('should route license plate with spaces', () => {
      const message = {
        text: '123 45 678',
        from: { id: 123 },
        chat: { id: 456 },
        message_id: 789
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('LICENSE_PLATE_SEARCH');
      expect(result.data.licensePlate).toBe('12345678');
    });

    test('should route invalid license plate', () => {
      const message = {
        text: '123',
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('INVALID_LICENSE_PLATE');
      expect(result.action).toBe('handleInvalidLicensePlate');
      expect(result.data.invalidInput).toBe('123');
    });

    test('should route unrecognized text', () => {
      const message = {
        text: 'hello world',
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('UNRECOGNIZED_TEXT');
      expect(result.action).toBe('handleUnrecognizedText');
      expect(result.data.text).toBe('hello world');
    });

    test('should route unsupported message type', () => {
      const message = {
        photo: [{ file_id: 'photo123' }],
        from: { id: 123 },
        chat: { id: 456 }
      };

      const result = router.routeMessage(message);

      expect(result.type).toBe('UNSUPPORTED');
      expect(result.action).toBe('sendUnsupportedMessage');
    });
  });

  describe('callback query routing', () => {
    test('should route help callback', () => {
      const callbackQuery = {
        data: 'help',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('CALLBACK');
      expect(result.action).toBe('handleHelpCallback');
      expect(result.data.callbackQueryId).toBe('callback123');
    });

    test('should route settings callback', () => {
      const callbackQuery = {
        data: 'settings',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('CALLBACK');
      expect(result.action).toBe('handleSettingsCallback');
    });

    test('should route new search callback', () => {
      const callbackQuery = {
        data: 'new_search',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('CALLBACK');
      expect(result.action).toBe('handleNewSearchCallback');
    });

    test('should route toggle field callback', () => {
      const callbackQuery = {
        data: 'toggle_field_manufacturer',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('FIELD_TOGGLE');
      expect(result.action).toBe('handleToggleFieldCallback');
      expect(result.data.fieldName).toBe('manufacturer');
    });

    test('should route save fields callback', () => {
      const callbackQuery = {
        data: 'save_fields',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('FIELD_SAVE');
      expect(result.action).toBe('handleSaveFieldsCallback');
    });

    test('should route set language callback', () => {
      const callbackQuery = {
        data: 'set_language_en',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('LANGUAGE_SET');
      expect(result.action).toBe('handleSetLanguageCallback');
      expect(result.data.language).toBe('en');
    });

    test('should route unrecognized callback', () => {
      const callbackQuery = {
        data: 'unknown_callback',
        from: { id: 123 },
        message: { chat: { id: 456 }, message_id: 789 },
        id: 'callback123'
      };

      const result = router.routeMessage(callbackQuery);

      expect(result.type).toBe('UNRECOGNIZED_CALLBACK');
      expect(result.action).toBe('handleUnrecognizedCallback');
      expect(result.data.callbackData).toBe('unknown_callback');
    });
  });

  describe('license plate validation', () => {
    test('should validate 7-digit license plates', () => {
      expect(router._isValidLicensePlate('1234567')).toBe(true);
    });

    test('should validate 8-digit license plates', () => {
      expect(router._isValidLicensePlate('12345678')).toBe(true);
    });

    test('should reject short license plates', () => {
      expect(router._isValidLicensePlate('123456')).toBe(false);
    });

    test('should reject long license plates', () => {
      expect(router._isValidLicensePlate('123456789')).toBe(false);
    });

    test('should reject non-numeric license plates', () => {
      expect(router._isValidLicensePlate('abcd1234')).toBe(false);
    });

    test('should handle null/undefined input', () => {
      expect(router._isValidLicensePlate(null)).toBe(false);
      expect(router._isValidLicensePlate(undefined)).toBe(false);
      expect(router._isValidLicensePlate('')).toBe(false);
    });
  });

  describe('license plate cleaning', () => {
    test('should clean license plate with dashes', () => {
      expect(router._cleanLicensePlate('123-45-678')).toBe('12345678');
    });

    test('should clean license plate with spaces', () => {
      expect(router._cleanLicensePlate('123 45 678')).toBe('12345678');
    });

    test('should clean license plate with dots', () => {
      expect(router._cleanLicensePlate('123.45.678')).toBe('12345678');
    });

    test('should remove non-numeric characters', () => {
      expect(router._cleanLicensePlate('abc123def456ghi')).toBe('123456');
    });

    test('should handle mixed formatting', () => {
      expect(router._cleanLicensePlate('12-3 4.5abc678')).toBe('12345678');
    });

    test('should handle null/undefined input', () => {
      expect(router._cleanLicensePlate(null)).toBe('');
      expect(router._cleanLicensePlate(undefined)).toBe('');
      expect(router._cleanLicensePlate(123)).toBe('');
    });
  });

  describe('utility methods', () => {
    test('isCommand should identify bot commands', () => {
      expect(router.isCommand('/start')).toBe(true);
      expect(router.isCommand('/help')).toBe(true);
      expect(router.isCommand('hello')).toBe(false);
      expect(router.isCommand('')).toBe(false);
      expect(router.isCommand(null)).toBe(false);
    });

    test('isPotentialLicensePlate should identify potential license plates', () => {
      expect(router.isPotentialLicensePlate('1234567')).toBe(true);
      expect(router.isPotentialLicensePlate('12345678')).toBe(true);
      expect(router.isPotentialLicensePlate('123-45-678')).toBe(true);
      expect(router.isPotentialLicensePlate('123 45 678')).toBe(true);
      expect(router.isPotentialLicensePlate('hello')).toBe(false);
      expect(router.isPotentialLicensePlate('123')).toBe(false);
    });

    test('getSupportedCommands should return command list', () => {
      const commands = router.getSupportedCommands();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toHaveProperty('command');
      expect(commands[0]).toHaveProperty('description');
    });

    test('getRoutingStats should return statistics', () => {
      const stats = router.getRoutingStats();
      
      expect(stats).toHaveProperty('supportedMessageTypes');
      expect(stats).toHaveProperty('supportedCommands');
      expect(stats).toHaveProperty('callbackPatterns');
      expect(Array.isArray(stats.supportedMessageTypes)).toBe(true);
    });

    test('validateRoutingResult should validate routing results', () => {
      const validResult = {
        type: 'COMMAND',
        action: 'handleStartCommand',
        data: { userId: 123 }
      };
      
      const invalidResult = {
        type: 'COMMAND'
        // missing action and data
      };
      
      expect(router.validateRoutingResult(validResult)).toBe(true);
      expect(router.validateRoutingResult(invalidResult)).toBe(false);
      expect(router.validateRoutingResult(null)).toBe(false);
      expect(router.validateRoutingResult({})).toBe(false);
    });

    test('createErrorContext should create error context', () => {
      const message = {
        text: 'test',
        from: { id: 123 },
        chat: { id: 456 }
      };
      
      const context = router.createErrorContext(message);
      
      expect(context.messageType).toBe('text');
      expect(context.userId).toBe(123);
      expect(context.chatId).toBe(456);
      expect(context.timestamp).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should handle routing errors gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a message that will cause an error during routing
      const problematicMessage = {
        get text() {
          throw new Error('Property access error');
        },
        from: { id: 123 },
        chat: { id: 456 }
      };
      
      const result = router.routeMessage(problematicMessage);
      
      expect(result.type).toBe('ERROR');
      expect(result.action).toBe('handleRoutingError');
      expect(result.data.error).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });
});