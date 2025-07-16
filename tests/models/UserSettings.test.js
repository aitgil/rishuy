const UserSettings = require('../../src/models/UserSettings');

describe('UserSettings', () => {
  describe('constructor', () => {
    test('should create UserSettings with default values', () => {
      const settings = new UserSettings('user123');
      
      expect(settings.userId).toBe('user123');
      expect(settings.language).toBe('he');
      expect(settings.displayFields.manufacturer).toBe(true);
      expect(settings.displayFields.model).toBe(true);
      expect(settings.notifications).toBe(true);
    });

    test('should create UserSettings with custom values', () => {
      const customSettings = {
        language: 'en',
        displayFields: {
          manufacturer: false,
          model: true
        },
        notifications: false
      };
      
      const settings = new UserSettings('user123', customSettings);
      
      expect(settings.language).toBe('en');
      expect(settings.displayFields.manufacturer).toBe(false);
      expect(settings.displayFields.model).toBe(true);
      expect(settings.notifications).toBe(false);
    });
  });

  describe('getDefaultSettings', () => {
    test('should return correct default settings', () => {
      const defaults = UserSettings.getDefaultSettings();
      
      expect(defaults.language).toBe('he');
      expect(defaults.displayFields.manufacturer).toBe(true);
      expect(defaults.displayFields.disabilityPermit).toBe(true);
      expect(defaults.displayFields.vehicleType).toBe(false);
      expect(defaults.notifications).toBe(true);
    });
  });

  describe('updateDisplayField', () => {
    test('should update existing field', () => {
      const settings = new UserSettings('user123');
      const result = settings.updateDisplayField('manufacturer', false);
      
      expect(result).toBe(true);
      expect(settings.displayFields.manufacturer).toBe(false);
    });

    test('should not update non-existing field', () => {
      const settings = new UserSettings('user123');
      const result = settings.updateDisplayField('nonExistentField', false);
      
      expect(result).toBe(false);
    });

    test('should update updatedAt timestamp', () => {
      const settings = new UserSettings('user123');
      const oldTimestamp = settings.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        settings.updateDisplayField('manufacturer', false);
        expect(settings.updatedAt).not.toEqual(oldTimestamp);
      }, 1);
    });
  });

  describe('resetToDefaults', () => {
    test('should reset all settings to defaults', () => {
      const settings = new UserSettings('user123');
      
      // Change some settings
      settings.language = 'en';
      settings.displayFields.manufacturer = false;
      settings.notifications = false;
      
      settings.resetToDefaults();
      
      expect(settings.language).toBe('he');
      expect(settings.displayFields.manufacturer).toBe(true);
      expect(settings.notifications).toBe(true);
    });
  });

  describe('getEnabledFields', () => {
    test('should return list of enabled fields', () => {
      const settings = new UserSettings('user123');
      settings.displayFields.manufacturer = true;
      settings.displayFields.model = false;
      settings.displayFields.year = true;
      
      const enabledFields = settings.getEnabledFields();
      
      expect(enabledFields).toContain('manufacturer');
      expect(enabledFields).toContain('year');
      expect(enabledFields).not.toContain('model');
    });
  });

  describe('getEnabledFieldsCount', () => {
    test('should return correct count of enabled fields', () => {
      const settings = new UserSettings('user123');
      
      // Count default enabled fields
      const defaultCount = Object.values(settings.displayFields).filter(Boolean).length;
      expect(settings.getEnabledFieldsCount()).toBe(defaultCount);
      
      // Disable some fields
      settings.displayFields.manufacturer = false;
      settings.displayFields.model = false;
      
      expect(settings.getEnabledFieldsCount()).toBe(defaultCount - 2);
    });
  });

  describe('isFieldEnabled', () => {
    test('should check if field is enabled', () => {
      const settings = new UserSettings('user123');
      
      expect(settings.isFieldEnabled('manufacturer')).toBe(true);
      
      settings.displayFields.manufacturer = false;
      expect(settings.isFieldEnabled('manufacturer')).toBe(false);
    });
  });

  describe('getFieldDescriptions', () => {
    test('should return Hebrew field descriptions', () => {
      const descriptions = UserSettings.getFieldDescriptions();
      
      expect(descriptions.manufacturer).toBe('🏭 יצרן');
      expect(descriptions.model).toBe('🚗 דגם');
      expect(descriptions.disabilityPermit).toBe('♿ תו נכה');
    });
  });

  describe('JSON serialization', () => {
    test('should convert to JSON correctly', () => {
      const settings = new UserSettings('user123');
      const json = settings.toJSON();
      
      expect(json.userId).toBe('user123');
      expect(json.language).toBe('he');
      expect(json.displayFields).toBeDefined();
      expect(json.createdAt).toBeDefined();
    });

    test('should create from JSON correctly', () => {
      const jsonData = {
        userId: 'user456',
        language: 'en',
        displayFields: {
          manufacturer: false,
          model: true
        },
        notifications: false,
        createdAt: new Date('2023-01-01')
      };
      
      const settings = UserSettings.fromJSON(jsonData);
      
      expect(settings.userId).toBe('user456');
      expect(settings.language).toBe('en');
      expect(settings.displayFields.manufacturer).toBe(false);
      expect(settings.displayFields.model).toBe(true);
    });
  });

  describe('getSummary', () => {
    test('should return settings summary', () => {
      const settings = new UserSettings('user123');
      const summary = settings.getSummary();
      
      expect(summary.language).toBe('עברית');
      expect(summary.enabledFields).toBeGreaterThan(0);
      expect(summary.totalFields).toBeGreaterThan(0);
      expect(summary.notifications).toBe('מופעל');
    });
  });
});