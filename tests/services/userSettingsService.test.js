const UserSettingsService = require('../../src/services/userSettingsService');
const UserSettings = require('../../src/models/UserSettings');

describe('UserSettingsService', () => {
  let service;
  const testUserId = 'test_user_123';

  beforeEach(() => {
    service = new UserSettingsService();
  });

  describe('getUserSettings', () => {
    test('should create new settings for new user', async () => {
      const settings = await service.getUserSettings(testUserId);
      
      expect(settings).toBeInstanceOf(UserSettings);
      expect(settings.userId).toBe(testUserId);
      expect(settings.language).toBe('he');
      expect(settings.displayFields.manufacturer).toBe(true);
    });

    test('should return existing settings for existing user', async () => {
      // יצירת הגדרות ראשוניות
      const initialSettings = await service.getUserSettings(testUserId);
      initialSettings.language = 'en';
      await service.saveUserSettings(initialSettings);
      
      // קבלת ההגדרות שוב
      const retrievedSettings = await service.getUserSettings(testUserId);
      
      expect(retrievedSettings.language).toBe('en');
      expect(retrievedSettings.userId).toBe(testUserId);
    });

    test('should handle invalid user ID', async () => {
      const settings = await service.getUserSettings('');
      
      expect(settings).toBeInstanceOf(UserSettings);
      expect(settings.userId).toBe('');
    });

    test('should return default settings on error', async () => {
      // Mock storage to throw error
      service.storage.get = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const settings = await service.getUserSettings(testUserId);
      
      expect(settings).toBeInstanceOf(UserSettings);
      expect(settings.userId).toBe(testUserId);
    });
  });

  describe('saveUserSettings', () => {
    test('should save user settings successfully', async () => {
      const settings = new UserSettings(testUserId);
      settings.language = 'en';
      
      const result = await service.saveUserSettings(settings);
      
      expect(result).toBe(true);
      expect(service.storage.has(testUserId)).toBe(true);
    });

    test('should update timestamp when saving', async () => {
      const settings = new UserSettings(testUserId);
      const originalTimestamp = settings.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      await service.saveUserSettings(settings);
      
      expect(settings.updatedAt).not.toEqual(originalTimestamp);
    });

    test('should handle invalid settings', async () => {
      const result = await service.saveUserSettings(null);
      expect(result).toBe(false);
      
      const result2 = await service.saveUserSettings({});
      expect(result2).toBe(false);
    });
  });

  describe('updateDisplayField', () => {
    test('should update display field successfully', async () => {
      const result = await service.updateDisplayField(testUserId, 'manufacturer', false);
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.displayFields.manufacturer).toBe(false);
    });

    test('should handle invalid field name', async () => {
      const result = await service.updateDisplayField(testUserId, 'invalidField', true);
      expect(result).toBe(false);
    });
  });

  describe('updateMultipleDisplayFields', () => {
    test('should update multiple fields successfully', async () => {
      const fieldsUpdate = {
        manufacturer: false,
        model: false,
        year: true
      };
      
      const result = await service.updateMultipleDisplayFields(testUserId, fieldsUpdate);
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.displayFields.manufacturer).toBe(false);
      expect(settings.displayFields.model).toBe(false);
      expect(settings.displayFields.year).toBe(true);
    });

    test('should handle empty update object', async () => {
      const result = await service.updateMultipleDisplayFields(testUserId, {});
      expect(result).toBe(false);
    });

    test('should handle invalid field names', async () => {
      const fieldsUpdate = {
        invalidField1: true,
        invalidField2: false
      };
      
      const result = await service.updateMultipleDisplayFields(testUserId, fieldsUpdate);
      expect(result).toBe(false);
    });
  });

  describe('resetUserToDefaults', () => {
    test('should reset user settings to defaults', async () => {
      // שינוי הגדרות
      await service.updateDisplayField(testUserId, 'manufacturer', false);
      await service.updateUserLanguage(testUserId, 'en');
      
      // איפוס
      const result = await service.resetUserToDefaults(testUserId);
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.language).toBe('he');
      expect(settings.displayFields.manufacturer).toBe(true);
    });
  });

  describe('updateUserLanguage', () => {
    test('should update user language successfully', async () => {
      const result = await service.updateUserLanguage(testUserId, 'en');
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.language).toBe('en');
    });

    test('should reject invalid language codes', async () => {
      const result = await service.updateUserLanguage(testUserId, 'fr');
      expect(result).toBe(false);
    });
  });

  describe('updateCompactMode', () => {
    test('should update compact mode successfully', async () => {
      const result = await service.updateCompactMode(testUserId, true);
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.compactMode).toBe(true);
    });
  });

  describe('deleteUserSettings', () => {
    test('should delete existing user settings', async () => {
      // יצירת הגדרות
      await service.getUserSettings(testUserId);
      expect(service.storage.has(testUserId)).toBe(true);
      
      // מחיקה
      const result = await service.deleteUserSettings(testUserId);
      
      expect(result).toBe(true);
      expect(service.storage.has(testUserId)).toBe(false);
    });

    test('should handle deletion of non-existing user', async () => {
      const result = await service.deleteUserSettings('non_existing_user');
      expect(result).toBe(false);
    });
  });

  describe('getAllUserIds', () => {
    test('should return all user IDs', async () => {
      await service.getUserSettings('user1');
      await service.getUserSettings('user2');
      await service.getUserSettings('user3');
      
      const userIds = await service.getAllUserIds();
      
      expect(userIds).toContain('user1');
      expect(userIds).toContain('user2');
      expect(userIds).toContain('user3');
      expect(userIds.length).toBe(3);
    });

    test('should return empty array when no users', async () => {
      const userIds = await service.getAllUserIds();
      expect(userIds).toEqual([]);
    });
  });

  describe('getServiceStats', () => {
    test('should return service statistics', async () => {
      // יצירת כמה משתמשים עם הגדרות שונות
      await service.updateDisplayField('user1', 'manufacturer', false);
      await service.updateDisplayField('user2', 'manufacturer', true);
      await service.updateDisplayField('user2', 'model', false);
      
      const stats = await service.getServiceStats();
      
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('fieldStats');
      expect(stats).toHaveProperty('storageSize');
      expect(stats.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('exportUserSettings', () => {
    test('should export user settings', async () => {
      const settings = await service.getUserSettings(testUserId);
      settings.language = 'en';
      await service.saveUserSettings(settings);
      
      const exported = await service.exportUserSettings(testUserId);
      
      expect(exported).toBeDefined();
      expect(exported.userId).toBe(testUserId);
      expect(exported.language).toBe('en');
    });

    test('should return null for non-existing user', async () => {
      const exported = await service.exportUserSettings('non_existing_user');
      expect(exported).toBeNull();
    });
  });

  describe('importUserSettings', () => {
    test('should import user settings successfully', async () => {
      const settingsData = {
        userId: testUserId,
        language: 'en',
        displayFields: {
          manufacturer: false,
          model: true
        },
        createdAt: new Date()
      };
      
      const result = await service.importUserSettings(testUserId, settingsData);
      
      expect(result).toBe(true);
      
      const settings = await service.getUserSettings(testUserId);
      expect(settings.language).toBe('en');
      expect(settings.displayFields.manufacturer).toBe(false);
    });

    test('should reject invalid settings data', async () => {
      const result = await service.importUserSettings(testUserId, null);
      expect(result).toBe(false);
      
      const result2 = await service.importUserSettings(testUserId, { userId: 'different_user' });
      expect(result2).toBe(false);
    });
  });

  describe('cleanupOldSettings', () => {
    test('should cleanup old settings', async () => {
      // יצירת הגדרות עם תאריך ישן
      const oldSettings = new UserSettings('old_user');
      oldSettings.updatedAt = new Date('2020-01-01');
      service.storage.set('old_user', oldSettings.toJSON());
      
      // יצירת הגדרות חדשות
      await service.getUserSettings('new_user');
      
      const deletedCount = await service.cleanupOldSettings(30);
      
      expect(deletedCount).toBe(1);
      expect(service.storage.has('old_user')).toBe(false);
      expect(service.storage.has('new_user')).toBe(true);
    });
  });
});