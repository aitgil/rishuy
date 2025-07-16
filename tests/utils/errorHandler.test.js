const ErrorHandler = require('../../src/utils/errorHandler');

describe('ErrorHandler', () => {
  let errorHandler;
  let mockBot;
  const testChatId = '123456789';
  const testMessageId = 42;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    
    // Mock bot object
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({})
    };

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleError', () => {
    test('should handle error and send new message', async () => {
      const error = new Error('Test error');
      error.type = 'NETWORK_ERROR';
      
      const result = await errorHandler.handleError(error, mockBot, testChatId);
      
      expect(result).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('בעיית חיבור'),
        expect.objectContaining({
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle error and edit existing message', async () => {
      const error = new Error('Test error');
      error.type = 'API_SERVER_ERROR';
      
      const result = await errorHandler.handleError(error, mockBot, testChatId, testMessageId);
      
      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('השירות אינו זמין'),
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle unknown error type', async () => {
      const error = new Error('Unknown error');
      // No error.type set
      
      const result = await errorHandler.handleError(error, mockBot, testChatId);
      
      expect(result).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalled();
    });

    test('should handle bot send message failure', async () => {
      const error = new Error('Test error');
      error.type = 'NETWORK_ERROR';
      
      mockBot.sendMessage.mockRejectedValue(new Error('Bot error'));
      
      const result = await errorHandler.handleError(error, mockBot, testChatId);
      
      expect(result).toBe(false);
    });

    test('should fallback to send message when edit fails', async () => {
      const error = new Error('Test error');
      error.type = 'NETWORK_ERROR';
      
      mockBot.editMessageText.mockRejectedValue(new Error('Edit failed'));
      
      const result = await errorHandler.handleError(error, mockBot, testChatId, testMessageId);
      
      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();
      expect(mockBot.sendMessage).toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    test('should log error without sending message', () => {
      const error = new Error('Test error');
      error.type = 'INTERNAL_ERROR';
      
      errorHandler.logError(error, { userId: '123' });
      
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR:',
        expect.objectContaining({
          type: 'INTERNAL_ERROR',
          message: 'Test error',
          context: { userId: '123' }
        })
      );
    });

    test('should update error stats when logging', () => {
      const error = new Error('Test error');
      error.type = 'NETWORK_TIMEOUT';
      
      errorHandler.logError(error);
      errorHandler.logError(error);
      
      const stats = errorHandler.getErrorStats();
      expect(stats.errorTypes.NETWORK_TIMEOUT.count).toBe(2);
    });
  });

  describe('isRetryableError', () => {
    test('should identify retryable errors', () => {
      const retryableError = new Error('Network timeout');
      retryableError.type = 'NETWORK_TIMEOUT';
      
      const nonRetryableError = new Error('Invalid input');
      nonRetryableError.type = 'INVALID_LICENSE_PLATE';
      
      expect(errorHandler.isRetryableError(retryableError)).toBe(true);
      expect(errorHandler.isRetryableError(nonRetryableError)).toBe(false);
    });

    test('should handle unknown error types', () => {
      const unknownError = new Error('Unknown');
      unknownError.type = 'SOME_UNKNOWN_TYPE';
      
      expect(errorHandler.isRetryableError(unknownError)).toBe(false);
    });
  });

  describe('getUserErrorMessage', () => {
    test('should return formatted error message', () => {
      const error = new Error('Invalid license plate');
      error.type = 'INVALID_LICENSE_PLATE';
      
      const message = errorHandler.getUserErrorMessage(error);
      
      expect(message.text).toContain('לא תקין');
      expect(message.reply_markup).toBeDefined();
    });
  });

  describe('createCustomErrorMessage', () => {
    test('should create custom error message without retry', () => {
      const message = errorHandler.createCustomErrorMessage('Custom error message');
      
      expect(message.text).toContain('Custom error message');
      expect(message.reply_markup.inline_keyboard).toHaveLength(1);
    });

    test('should create custom error message with retry', () => {
      const message = errorHandler.createCustomErrorMessage('Custom error message', true);
      
      expect(message.text).toContain('Custom error message');
      expect(message.reply_markup.inline_keyboard).toHaveLength(2);
      expect(message.reply_markup.inline_keyboard[0][0].text).toContain('נסה שוב');
    });
  });

  describe('getErrorStats', () => {
    test('should return error statistics', () => {
      const error1 = new Error('Error 1');
      error1.type = 'NETWORK_ERROR';
      
      const error2 = new Error('Error 2');
      error2.type = 'API_SERVER_ERROR';
      
      errorHandler.logError(error1);
      errorHandler.logError(error1);
      errorHandler.logError(error2);
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorTypes.NETWORK_ERROR.count).toBe(2);
      expect(stats.errorTypes.API_SERVER_ERROR.count).toBe(1);
      expect(stats.errorTypes.NETWORK_ERROR.severity).toBe('error');
      expect(stats.errorTypes.NETWORK_ERROR.isRetryable).toBe(true);
    });

    test('should return empty stats when no errors', () => {
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.errorTypes)).toHaveLength(0);
    });
  });

  describe('resetErrorStats', () => {
    test('should reset error statistics', () => {
      const error = new Error('Test error');
      error.type = 'NETWORK_ERROR';
      
      errorHandler.logError(error);
      expect(errorHandler.getErrorStats().totalErrors).toBe(1);
      
      errorHandler.resetErrorStats();
      expect(errorHandler.getErrorStats().totalErrors).toBe(0);
    });
  });

  describe('static methods', () => {
    test('createError should create error with type', () => {
      const error = ErrorHandler.createError(
        'CUSTOM_ERROR',
        'Custom message',
        { customData: 'test' }
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe('CUSTOM_ERROR');
      expect(error.message).toBe('Custom message');
      expect(error.customData).toBe('test');
    });

    test('wrapWithErrorHandling should wrap function with error context', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = ErrorHandler.wrapWithErrorHandling(mockFn, { source: 'test' });
      
      try {
        await wrappedFn('arg1', 'arg2');
      } catch (error) {
        expect(error.context.source).toBe('test');
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      }
    });

    test('wrapWithErrorHandling should pass through successful calls', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = ErrorHandler.wrapWithErrorHandling(mockFn);
      
      const result = await wrappedFn('arg1');
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledWith('arg1');
    });
  });

  describe('error severity logging', () => {
    test('should log critical errors with console.error', () => {
      const error = new Error('Critical error');
      error.type = 'INTERNAL_ERROR';
      
      errorHandler.logError(error);
      
      expect(console.error).toHaveBeenCalledWith(
        'CRITICAL ERROR:',
        expect.any(Object)
      );
    });

    test('should log warnings with console.warn', () => {
      const error = new Error('Warning error');
      error.type = 'NETWORK_TIMEOUT';
      
      errorHandler.logError(error);
      
      expect(console.warn).toHaveBeenCalledWith(
        'WARNING:',
        expect.any(Object)
      );
    });

    test('should log info errors with console.info in non-production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Info error');
      error.type = 'INVALID_LICENSE_PLATE';
      
      errorHandler.logError(error);
      
      expect(console.info).toHaveBeenCalledWith(
        'INFO:',
        expect.any(Object)
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});