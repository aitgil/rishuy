const VehicleDataService = require('../../src/services/vehicleDataService');
const VehicleData = require('../../src/models/VehicleData');

// בדיקות אינטגרציה עם API הממשלה הישראלית
describe('Israeli Government API Integration', () => {
  let vehicleDataService;

  // Skip these tests in CI/CD or if explicitly disabled
  const skipTests = process.env.SKIP_API_TESTS === 'true' || process.env.CI === 'true';

  beforeAll(() => {
    if (skipTests) {
      console.log('Skipping Israeli Government API integration tests');
    }
  });

  beforeEach(() => {
    if (skipTests) return;
    vehicleDataService = new VehicleDataService();
  });

  afterEach(() => {
    if (skipTests) return;
    if (vehicleDataService && vehicleDataService.cache) {
      vehicleDataService.cache.destroy();
    }
  });

  describe('Vehicle Data API', () => {
    test('should fetch real vehicle data successfully', async () => {
      if (skipTests) return;

      // Using a test license plate number
      const licensePlate = '12345678';
      
      const vehicleData = await vehicleDataService.searchVehicle(licensePlate);
      
      expect(vehicleData).toBeInstanceOf(VehicleData);
      expect(vehicleData.licensePlate).toBe(licensePlate);
      expect(vehicleData.manufacturer).toBeTruthy();
      expect(vehicleData.model).toBeTruthy();
      expect(vehicleData.year).toBeTruthy();
    }, 10000); // 10 second timeout for API call

    test('should return null for non-existent vehicle', async () => {
      if (skipTests) return;

      // Using a non-existent license plate
      const licensePlate = '99999999';
      
      const vehicleData = await vehicleDataService.searchVehicle(licensePlate);
      
      expect(vehicleData).toBeNull();
    }, 10000);

    test('should handle API errors gracefully', async () => {
      if (skipTests) return;

      // Test with invalid license plate format
      await expect(
        vehicleDataService.searchVehicle('invalid')
      ).rejects.toThrow();
    });

    test('should cache results correctly', async () => {
      if (skipTests) return;

      const licensePlate = '12345678';
      
      // First call - should hit API
      const startTime1 = Date.now();
      const result1 = await vehicleDataService.searchVehicle(licensePlate);
      const time1 = Date.now() - startTime1;
      
      // Second call - should hit cache
      const startTime2 = Date.now();
      const result2 = await vehicleDataService.searchVehicle(licensePlate);
      const time2 = Date.now() - startTime2;
      
      // Results should be identical
      expect(result1).toEqual(result2);
      
      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 / 2);
      
      // Check cache stats
      const cacheStats = vehicleDataService.cache.getStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Disability Permit API', () => {
    test('should check disability permit status', async () => {
      if (skipTests) return;

      const licensePlate = '12345678';
      
      const hasPermit = await vehicleDataService.checkDisabilityPermit(licensePlate);
      
      expect(typeof hasPermit).toBe('boolean');
    }, 10000);

    test('should return false for non-existent vehicle permit', async () => {
      if (skipTests) return;

      const licensePlate = '99999999';
      
      const hasPermit = await vehicleDataService.checkDisabilityPermit(licensePlate);
      
      expect(hasPermit).toBe(false);
    }, 10000);

    test('should cache disability permit results', async () => {
      if (skipTests) return;

      const licensePlate = '12345678';
      
      // First call
      const result1 = await vehicleDataService.checkDisabilityPermit(licensePlate);
      
      // Second call - should hit cache
      const result2 = await vehicleDataService.checkDisabilityPermit(licensePlate);
      
      expect(result1).toBe(result2);
      
      // Check cache stats
      const cacheStats = vehicleDataService.cache.getStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    }, 15000);
  });

  describe('API Resilience', () => {
    test('should handle network timeouts', async () => {
      if (skipTests) return;

      // Create service with very short timeout
      const shortTimeoutService = new VehicleDataService();
      shortTimeoutService.timeout = 1; // 1ms - will definitely timeout
      
      shortTimeoutService.httpClient = require('axios').create({
        timeout: 1,
        headers: {
          'User-Agent': 'TelegramVehicleBot/1.0',
          'Accept': 'application/json'
        }
      });

      await expect(
        shortTimeoutService.searchVehicle('12345678')
      ).rejects.toThrow();
      
      shortTimeoutService.cache.destroy();
    });

    test('should retry failed requests', async () => {
      if (skipTests) return;

      // Mock the HTTP client to fail first few times
      const originalGet = vehicleDataService.httpClient.get;
      let callCount = 0;
      
      vehicleDataService.httpClient.get = jest.fn().mockImplementation((...args) => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return originalGet.apply(vehicleDataService.httpClient, args);
      });

      const result = await vehicleDataService.searchVehicle('12345678');
      
      expect(callCount).toBe(3); // Should have retried
      expect(result).toBeDefined();
      
      // Restore original method
      vehicleDataService.httpClient.get = originalGet;
    }, 15000);
  });

  describe('Data Validation', () => {
    test('should validate and clean license plate input', async () => {
      if (skipTests) return;

      // Test with formatted license plate
      const result1 = await vehicleDataService.searchVehicle('311-94-602');
      const result2 = await vehicleDataService.searchVehicle('31194602');
      
      // Should return same result regardless of formatting
      expect(result1).toEqual(result2);
    }, 10000);

    test('should reject invalid license plate formats', async () => {
      if (skipTests) return;

      const invalidPlates = [
        '',
        '123',
        '123456789',
        'abcdefgh',
        null,
        undefined
      ];

      for (const plate of invalidPlates) {
        await expect(
          vehicleDataService.searchVehicle(plate)
        ).rejects.toThrow();
      }
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent requests', async () => {
      if (skipTests) return;

      const licensePlates = ['12345678', '1234567', '12345678']; // Include duplicate for cache test
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        licensePlates.map(plate => vehicleDataService.searchVehicle(plate))
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(3);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Check that cache was used for duplicate request
      const cacheStats = vehicleDataService.cache.getStats();
      expect(cacheStats.hits).toBeGreaterThan(0);
    }, 20000);

    test('should maintain good response times', async () => {
      if (skipTests) return;

      const licensePlate = '31194602';
      
      const startTime = Date.now();
      const result = await vehicleDataService.searchVehicle(licensePlate);
      const responseTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
    }, 15000);
  });

  describe('Real Data Validation', () => {
    test('should return properly structured vehicle data', async () => {
      if (skipTests) return;

      const licensePlate = '31194602';
      const vehicleData = await vehicleDataService.searchVehicle(licensePlate);
      
      if (vehicleData) {
        expect(vehicleData).toBeInstanceOf(VehicleData);
        expect(vehicleData.licensePlate).toBe(licensePlate);
        
        // Check that Hebrew display works
        const mockUserSettings = {
          displayFields: {
            manufacturer: true,
            model: true,
            year: true,
            color: true,
            fuelType: true,
            ownershipType: true
          }
        };
        
        const hebrewDisplay = vehicleData.toHebrewDisplay(mockUserSettings);
        expect(hebrewDisplay).toBeTruthy();
        expect(hebrewDisplay).toContain('יצרן');
      }
    }, 10000);

    test('should handle Hebrew text correctly', async () => {
      if (skipTests) return;

      const licensePlate = '3402874'; // Toyota Corolla
      const vehicleData = await vehicleDataService.searchVehicle(licensePlate);
      
      if (vehicleData) {
        expect(vehicleData.manufacturer).toContain('טויוטה');
        expect(vehicleData.model).toContain('COROLLA');
        expect(vehicleData.ownershipType).toBe('פרטי');
      }
    }, 10000);
  });

  describe('Error Recovery', () => {
    test('should recover from temporary API failures', async () => {
      if (skipTests) return;

      // This test simulates recovery after API issues
      const licensePlate = '31194602';
      
      // First, try a request that should work
      const result1 = await vehicleDataService.searchVehicle(licensePlate);
      expect(result1).toBeDefined();
      
      // Clear cache to force API call
      vehicleDataService.cache.clear();
      
      // Try again - should still work
      const result2 = await vehicleDataService.searchVehicle(licensePlate);
      expect(result2).toBeDefined();
      expect(result2).toEqual(result1);
    }, 15000);
  });
});