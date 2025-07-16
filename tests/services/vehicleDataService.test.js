const VehicleDataService = require('../../src/services/vehicleDataService');
const VehicleData = require('../../src/models/VehicleData');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('VehicleDataService', () => {
  let service;
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn()
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    service = new VehicleDataService();
  });

  describe('constructor', () => {
    test('should initialize with correct default values', () => {
      expect(service.baseUrl).toBe('https://data.gov.il/api/3/action/datastore_search');
      expect(service.vehicleResourceId).toBe('053cea08-09bc-40ec-8f7a-156f0677aff3');
      expect(service.disabilityResourceId).toBe('c8b9f9c8-4612-4068-934f-d4acd2e3c06e');
      expect(service.timeout).toBe(5000);
      expect(service.maxRetries).toBe(3);
    });

    test('should use environment variables when available', () => {
      process.env.API_TIMEOUT = '10000';
      process.env.API_RETRY_ATTEMPTS = '5';
      
      const serviceWithEnv = new VehicleDataService();
      
      expect(serviceWithEnv.timeout).toBe(10000);
      expect(serviceWithEnv.maxRetries).toBe(5);
      
      // Cleanup
      delete process.env.API_TIMEOUT;
      delete process.env.API_RETRY_ATTEMPTS;
    });
  });

  describe('_cleanLicensePlate', () => {
    test('should clean license plate correctly', () => {
      expect(service._cleanLicensePlate('12-345-678')).toBe('12345678');
      expect(service._cleanLicensePlate('12 345 678')).toBe('12345678');
      expect(service._cleanLicensePlate('12.345.678')).toBe('12345678');
      expect(service._cleanLicensePlate('abc12345678def')).toBe('12345678');
    });

    test('should handle invalid input', () => {
      expect(service._cleanLicensePlate(null)).toBe('');
      expect(service._cleanLicensePlate(undefined)).toBe('');
      expect(service._cleanLicensePlate(123)).toBe('');
    });
  });

  describe('_isValidLicensePlate', () => {
    test('should validate Israeli license plates', () => {
      expect(service._isValidLicensePlate('1234567')).toBe(true);
      expect(service._isValidLicensePlate('12345678')).toBe(true);
      expect(service._isValidLicensePlate('123456')).toBe(false);
      expect(service._isValidLicensePlate('123456789')).toBe(false);
      expect(service._isValidLicensePlate('')).toBe(false);
      expect(service._isValidLicensePlate(null)).toBe(false);
    });
  });

  describe('searchVehicle', () => {
    const mockVehicleResponse = {
      data: {
        success: true,
        result: {
          records: [{
            mispar_rechev: '12345678',
            tozeret: 'טויוטה',
            kinuy_mishari: 'קורולה',
            shnat_yitzur: '2020'
          }]
        }
      }
    };

    test('should search vehicle successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockVehicleResponse);
      
      const result = await service.searchVehicle('12345678');
      
      expect(result).toBeInstanceOf(VehicleData);
      expect(result.licensePlate).toBe('12345678');
      expect(result.manufacturer).toBe(''); // Mock data doesn't have tozeret_nm
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        service.baseUrl,
        {
          params: {
            resource_id: service.vehicleResourceId,
            limit: 10,
            q: '12345678'
          }
        }
      );
    });

    test('should return null when no vehicle found', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          result: {
            records: []
          }
        }
      });
      
      const result = await service.searchVehicle('12345678');
      expect(result).toBeNull();
    });

    test('should throw error for invalid license plate', async () => {
      await expect(service.searchVehicle('123')).rejects.toThrow('פורמט מספר לוחית רישוי לא תקין');
    });

    test('should clean license plate before search', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockVehicleResponse);
      
      await service.searchVehicle('12-345-678');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        service.baseUrl,
        expect.objectContaining({
          params: expect.objectContaining({
            q: '12345678'
          })
        })
      );
    });
  });

  describe('checkDisabilityPermit', () => {
    test('should return true when permit found', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          result: {
            records: [{ mispar_rechev: '12345678' }]
          }
        }
      });
      
      const result = await service.checkDisabilityPermit('12345678');
      expect(result).toBe(true);
    });

    test('should return false when no permit found', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          success: true,
          result: {
            records: []
          }
        }
      });
      
      const result = await service.checkDisabilityPermit('12345678');
      expect(result).toBe(false);
    });

    test('should return false on error instead of throwing', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));
      
      const result = await service.checkDisabilityPermit('12345678');
      expect(result).toBe(false);
    });
  });

  describe('_makeApiRequest retry logic', () => {
    test('should retry on network timeout', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({
          data: {
            success: true,
            result: { records: [] }
          }
        });
      
      const params = { resource_id: 'test', q: '12345678' };
      const result = await service._makeApiRequest(params);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result.data.success).toBe(true);
    });

    test('should retry on 500 server error', async () => {
      const serverError = new Error('Server Error');
      serverError.response = { status: 500 };
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue({
          data: {
            success: true,
            result: { records: [] }
          }
        });
      
      const params = { resource_id: 'test', q: '12345678' };
      const result = await service._makeApiRequest(params);
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.data.success).toBe(true);
    });

    test('should not retry on 400 client error', async () => {
      const clientError = new Error('Bad Request');
      clientError.response = { status: 400 };
      
      mockAxiosInstance.get.mockRejectedValue(clientError);
      
      const params = { resource_id: 'test', q: '12345678' };
      
      await expect(service._makeApiRequest(params)).rejects.toThrow('Bad Request');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    test('should fail after max retries', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockAxiosInstance.get.mockRejectedValue(timeoutError);
      
      const params = { resource_id: 'test', q: '12345678' };
      
      await expect(service._makeApiRequest(params)).rejects.toThrow('timeout');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // maxRetries
    });
  });

  describe('error classification', () => {
    test('should classify network errors correctly', () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ENOTFOUND';
      
      service._classifyError(networkError);
      expect(networkError.type).toBe('NETWORK_ERROR');
    });

    test('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';
      
      service._classifyError(timeoutError);
      expect(timeoutError.type).toBe('NETWORK_TIMEOUT');
    });

    test('should classify rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate Limited');
      rateLimitError.response = { status: 429 };
      
      service._classifyError(rateLimitError);
      expect(rateLimitError.type).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('getStats', () => {
    test('should return service statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('baseUrl');
      expect(stats).toHaveProperty('timeout');
      expect(stats).toHaveProperty('maxRetries');
      expect(stats).toHaveProperty('vehicleResourceId');
      expect(stats).toHaveProperty('disabilityResourceId');
    });
  });
});