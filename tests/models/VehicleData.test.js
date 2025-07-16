const VehicleData = require('../../src/models/VehicleData');
const UserSettings = require('../../src/models/UserSettings');

describe('VehicleData', () => {
  let mockApiData;
  let userSettings;

  beforeEach(() => {
    mockApiData = {
      mispar_rechev: '12345678',
      tozeret: 'טויוטה',
      kinuy_mishari: 'קורולה',
      shnat_yitzur: '2020',
      tzeva_rechev: 'לבן',
      nefach_manoa: '1600',
      sug_delek: 'בנזין',
      sug_baalut: 'פרטי',
      tokef_dt: '2024-12-31'
    };

    userSettings = new UserSettings('test_user');
  });

  describe('constructor', () => {
    test('should create VehicleData with API data', () => {
      const vehicle = new VehicleData(mockApiData);
      
      expect(vehicle.licensePlate).toBe('12345678');
      expect(vehicle.manufacturer).toBe('טויוטה');
      expect(vehicle.model).toBe('קורולה');
      expect(vehicle.year).toBe('2020');
      expect(vehicle.color).toBe('לבן');
    });

    test('should handle empty data', () => {
      const vehicle = new VehicleData();
      
      expect(vehicle.licensePlate).toBe('');
      expect(vehicle.manufacturer).toBe('');
      expect(vehicle.model).toBe('');
    });
  });

  describe('toHebrewDisplay', () => {
    test('should format vehicle data in Hebrew', () => {
      const vehicle = new VehicleData(mockApiData);
      const display = vehicle.toHebrewDisplay(userSettings);
      
      expect(display).toContain('🏭 יצרן: טויוטה');
      expect(display).toContain('🚗 דגם: קורולה');
      expect(display).toContain('📅 שנת ייצור: 2020');
      expect(display).toContain('🎨 צבע: לבן');
    });

    test('should respect user display settings', () => {
      const vehicle = new VehicleData(mockApiData);
      userSettings.displayFields.manufacturer = false;
      userSettings.displayFields.model = false;
      
      const display = vehicle.toHebrewDisplay(userSettings);
      
      expect(display).not.toContain('🏭 יצרן');
      expect(display).not.toContain('🚗 דגם');
      expect(display).toContain('📅 שנת ייצור: 2020');
    });

    test('should return no data message when no fields enabled', () => {
      const vehicle = new VehicleData(mockApiData);
      
      // כבה את כל השדות
      Object.keys(userSettings.displayFields).forEach(field => {
        userSettings.displayFields[field] = false;
      });
      
      const display = vehicle.toHebrewDisplay(userSettings);
      expect(display).toBe('לא נמצאו נתונים');
    });
  });

  describe('color translation', () => {
    test('should translate English colors to Hebrew', () => {
      const vehicle = new VehicleData({ tzeva_rechev: 'WHITE' });
      expect(vehicle._translateColor('WHITE')).toBe('לבן');
      expect(vehicle._translateColor('BLACK')).toBe('שחור');
      expect(vehicle._translateColor('BLUE')).toBe('כחול');
    });

    test('should keep Hebrew colors as is', () => {
      const vehicle = new VehicleData();
      expect(vehicle._translateColor('לבן')).toBe('לבן');
      expect(vehicle._translateColor('שחור')).toBe('שחור');
    });

    test('should return original color if not found in map', () => {
      const vehicle = new VehicleData();
      expect(vehicle._translateColor('PURPLE')).toBe('PURPLE');
    });
  });

  describe('fuel type translation', () => {
    test('should translate fuel types correctly', () => {
      const vehicle = new VehicleData();
      expect(vehicle._translateFuelType('GASOLINE')).toBe('בנזין');
      expect(vehicle._translateFuelType('DIESEL')).toBe('דיזל');
      expect(vehicle._translateFuelType('ELECTRIC')).toBe('חשמלי');
    });
  });

  describe('isValid', () => {
    test('should return true for valid vehicle data', () => {
      const vehicle = new VehicleData(mockApiData);
      expect(vehicle.isValid()).toBe(true);
    });

    test('should return false for invalid vehicle data', () => {
      const vehicle = new VehicleData({ mispar_rechev: '123' });
      expect(vehicle.isValid()).toBe(false);
    });
  });

  describe('getTitle', () => {
    test('should create title from manufacturer, model and year', () => {
      const vehicle = new VehicleData(mockApiData);
      expect(vehicle.getTitle()).toBe('טויוטה קורולה 2020');
    });

    test('should fallback to license plate if no other data', () => {
      const vehicle = new VehicleData({ mispar_rechev: '12345678' });
      expect(vehicle.getTitle()).toBe('רכב 12345678');
    });
  });
});