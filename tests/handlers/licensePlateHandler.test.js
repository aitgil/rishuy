const LicensePlateHandler = require('../../src/handlers/licensePlateHandler');
const VehicleData = require('../../src/models/VehicleData');

// Mock dependencies
jest.mock('../../src/services/vehicleDataService');
jest.mock('../../src/services/userSettingsService');
jest.mock('../../src/utils/messageFormatter');
jest.mock('../../src/utils/errorHandler');

describe('LicensePlateHandler', () => {
  let handler;
  let mockBot;
  let mockVehicleDataService;
  let mockUserSettingsService;
  let mockMessageFormatter;
  let mockErrorHandler;

  const testUserId = '123456789';
  const testChatId = '987654321';
  const testMessageId = 42;
  const testCallbackQueryId = 'callback123';
  const testLicensePlate = '12345678';

  beforeEach(() => {
    // Mock bot
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: testMessageId }),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({})
    };

    // Mock VehicleDataService
    const VehicleDataService = require('../../src/services/vehicleDataService');
    mockVehicleDataService = {
      searchVehicle: jest.fn(),
      checkDisabilityPermit: jest.fn(),
      getStats: jest.fn().mockReturnValue({ timeout: 5000 })
    };
    VehicleDataService.mockImplementation(() => mockVehicleDataService);

    // Mock UserSettingsService
    const UserSettingsService = require('../../src/services/userSettingsService');
    mockUserSettingsService = {
      getUserSettings: jest.fn().mockResolvedValue({
        userId: testUserId,
        language: 'he',
        displayFields: {
          manufacturer: true,
          model: true,
          disabilityPermit: true
        }
      })
    };
    UserSettingsService.mockImplementation(() => mockUserSettingsService);

    // Mock MessageFormatter
    const MessageFormatter = require('../../src/utils/messageFormatter');
    mockMessageFormatter = {
      formatSearchingMessage: jest.fn().mockReturnValue({
        text: 'מחפש...',
        reply_markup: { inline_keyboard: [] }
      }),
      formatVehicleResults: jest.fn().mockReturnValue({
        text: 'תוצאות רכב',
        reply_markup: { inline_keyboard: [] },
        parse_mode: 'Markdown'
      }),
      formatNoResultsMessage: jest.fn().mockReturnValue({
        text: 'לא נמצאו תוצאות',
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
    ErrorHandler.createError = jest.fn().mockImplementation((type, message) => {
      const error = new Error(message);
      error.type = type;
      return error;
    });

    handler = new LicensePlateHandler(mockBot);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleLicensePlateSearch', () => {
    test('should handle successful vehicle search with results', async () => {
      const mockVehicleData = new VehicleData({
        mispar_rechev: testLicensePlate,
        tozeret: 'טויוטה',
        kinuy_mishari: 'קורולה'
      });

      mockVehicleDataService.searchVehicle.mockResolvedValue(mockVehicleData);
      mockVehicleDataService.checkDisabilityPermit.mockResolvedValue(true);

      const result = await handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        'מחפש...',
        expect.objectContaining({ reply_markup: expect.any(Object) })
      );
      expect(mockVehicleDataService.searchVehicle).toHaveBeenCalledWith(testLicensePlate);
      expect(mockVehicleDataService.checkDisabilityPermit).toHaveBeenCalledWith(testLicensePlate);
      expect(mockMessageFormatter.formatVehicleResults).toHaveBeenCalledWith(
        mockVehicleData,
        expect.any(Object),
        true
      );
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should handle search with no results', async () => {
      mockVehicleDataService.searchVehicle.mockResolvedValue(null);

      const result = await handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(mockVehicleDataService.searchVehicle).toHaveBeenCalledWith(testLicensePlate);
      expect(mockVehicleDataService.checkDisabilityPermit).not.toHaveBeenCalled();
      expect(mockMessageFormatter.formatNoResultsMessage).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalled();
    });

    test('should prevent duplicate searches', async () => {
      mockVehicleDataService.searchVehicle.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 100))
      );

      // Start first search
      const promise1 = handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      // Try to start second search immediately
      const result2 = await handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      expect(result2).toBe(false);
      expect(mockBot.sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('חיפוש כבר מתבצע')
      );

      // Wait for first search to complete
      await promise1;
    });

    test('should handle search errors', async () => {
      const searchError = new Error('API Error');
      mockVehicleDataService.searchVehicle.mockRejectedValue(searchError);

      const result = await handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        searchError,
        mockBot,
        testChatId
      );
    });

    test('should handle message edit failure with fallback', async () => {
      const mockVehicleData = new VehicleData({
        mispar_rechev: testLicensePlate,
        tozeret: 'טויוטה'
      });

      mockVehicleDataService.searchVehicle.mockResolvedValue(mockVehicleData);
      mockVehicleDataService.checkDisabilityPermit.mockResolvedValue(false);
      mockBot.editMessageText.mockRejectedValue(new Error('Edit failed'));

      const result = await handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(mockBot.editMessageText).toHaveBeenCalled();
      // Should fallback to sending new message
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2); // Initial + fallback
    });
  });

  describe('handleInvalidLicensePlate', () => {
    test('should handle invalid license plate', async () => {
      const invalidInput = '123';

      const result = await handler.handleInvalidLicensePlate(
        invalidInput, testUserId, testChatId
      );

      expect(result).toBe(true);
      expect(ErrorHandler.createError).toHaveBeenCalledWith(
        'INVALID_LICENSE_PLATE',
        `Invalid license plate: ${invalidInput}`
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    test('should handle errors in invalid license plate handling', async () => {
      mockErrorHandler.handleError.mockRejectedValue(new Error('Handler error'));

      const result = await handler.handleInvalidLicensePlate(
        '123', testUserId, testChatId
      );

      expect(result).toBe(false);
    });
  });

  describe('handleCancelSearchCallback', () => {
    test('should handle cancel search callback successfully', async () => {
      const result = await handler.handleCancelSearchCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'החיפוש בוטל',
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('החיפוש בוטל'),
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle cancel search callback error', async () => {
      mockBot.answerCallbackQuery.mockRejectedValue(new Error('Answer failed'));

      const result = await handler.handleCancelSearchCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('handleRetrySearchCallback', () => {
    test('should handle retry search callback successfully', async () => {
      const result = await handler.handleRetrySearchCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(true);
      expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith(
        testCallbackQueryId,
        expect.objectContaining({
          text: 'מנסה שוב...',
          show_alert: false
        })
      );
      expect(mockBot.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('נסה שוב'),
        expect.objectContaining({
          chat_id: testChatId,
          message_id: testMessageId,
          reply_markup: expect.any(Object),
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle retry search callback error', async () => {
      mockBot.editMessageText.mockRejectedValue(new Error('Edit failed'));

      const result = await handler.handleRetrySearchCallback(
        testUserId, testChatId, testMessageId, testCallbackQueryId
      );

      expect(result).toBe(false);
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    test('getSearchStats should return search statistics', () => {
      const stats = handler.getSearchStats();

      expect(stats).toHaveProperty('activeSearches');
      expect(stats).toHaveProperty('handlerType');
      expect(stats).toHaveProperty('serviceStats');
      expect(stats.handlerType).toBe('LicensePlateHandler');
      expect(stats.activeSearches).toBe(0);
    });

    test('clearActiveSearches should clear active searches', () => {
      // Add a search to active searches
      handler.activeSearches.add('test_search');
      expect(handler.activeSearches.size).toBe(1);

      handler.clearActiveSearches();
      expect(handler.activeSearches.size).toBe(0);
    });

    test('isSearchActive should check if search is active', () => {
      expect(handler.isSearchActive(testUserId, testLicensePlate)).toBe(false);

      handler.activeSearches.add(`${testUserId}_${testLicensePlate}`);
      expect(handler.isSearchActive(testUserId, testLicensePlate)).toBe(true);
    });

    test('validateHandlerConfiguration should validate configuration', () => {
      expect(handler.validateHandlerConfiguration()).toBe(true);

      // Test with missing bot
      const handlerWithoutBot = new LicensePlateHandler(null);
      expect(handlerWithoutBot.validateHandlerConfiguration()).toBe(false);
    });
  });

  describe('search flow integration', () => {
    test('should complete full search flow with vehicle found', async () => {
      const mockVehicleData = new VehicleData({
        mispar_rechev: testLicensePlate,
        tozeret: 'טויוטה',
        kinuy_mishari: 'קורולה'
      });

      mockVehicleDataService.searchVehicle.mockResolvedValue(mockVehicleData);
      mockVehicleDataService.checkDisabilityPermit.mockResolvedValue(true);

      await handler.handleLicensePlateSearch(testLicensePlate, testUserId, testChatId);

      // Verify the complete flow
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(1); // Searching message
      expect(mockUserSettingsService.getUserSettings).toHaveBeenCalledWith(testUserId);
      expect(mockVehicleDataService.searchVehicle).toHaveBeenCalledWith(testLicensePlate);
      expect(mockVehicleDataService.checkDisabilityPermit).toHaveBeenCalledWith(testLicensePlate);
      expect(mockMessageFormatter.formatVehicleResults).toHaveBeenCalledWith(
        mockVehicleData,
        expect.any(Object),
        true
      );
      expect(mockBot.editMessageText).toHaveBeenCalledTimes(1); // Update with results
    });

    test('should complete full search flow with no vehicle found', async () => {
      mockVehicleDataService.searchVehicle.mockResolvedValue(null);

      await handler.handleLicensePlateSearch(testLicensePlate, testUserId, testChatId);

      // Verify the complete flow
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(1); // Searching message
      expect(mockVehicleDataService.searchVehicle).toHaveBeenCalledWith(testLicensePlate);
      expect(mockVehicleDataService.checkDisabilityPermit).not.toHaveBeenCalled();
      expect(mockMessageFormatter.formatNoResultsMessage).toHaveBeenCalled();
      expect(mockBot.editMessageText).toHaveBeenCalledTimes(1); // Update with no results
    });
  });

  describe('active searches management', () => {
    test('should properly manage active searches lifecycle', async () => {
      const searchKey = `${testUserId}_${testLicensePlate}`;
      
      // Mock a slow search
      mockVehicleDataService.searchVehicle.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 50))
      );

      expect(handler.activeSearches.has(searchKey)).toBe(false);

      const searchPromise = handler.handleLicensePlateSearch(
        testLicensePlate, testUserId, testChatId
      );

      // During search, it should be active
      expect(handler.activeSearches.has(searchKey)).toBe(true);

      await searchPromise;

      // After search, it should be removed
      expect(handler.activeSearches.has(searchKey)).toBe(false);
    });

    test('should clean up active searches even on error', async () => {
      const searchKey = `${testUserId}_${testLicensePlate}`;
      
      mockVehicleDataService.searchVehicle.mockRejectedValue(new Error('Search failed'));

      expect(handler.activeSearches.has(searchKey)).toBe(false);

      await handler.handleLicensePlateSearch(testLicensePlate, testUserId, testChatId);

      // Should be cleaned up even after error
      expect(handler.activeSearches.has(searchKey)).toBe(false);
    });
  });
});