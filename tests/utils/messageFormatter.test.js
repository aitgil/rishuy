const MessageFormatter = require('../../src/utils/messageFormatter');
const VehicleData = require('../../src/models/VehicleData');
const UserSettings = require('../../src/models/UserSettings');

describe('MessageFormatter', () => {
  let formatter;
  let mockVehicleData;
  let mockUserSettings;

  beforeEach(() => {
    formatter = new MessageFormatter();
    
    mockVehicleData = new VehicleData({
      mispar_rechev: '12345678',
      tozeret: 'טויוטה',
      kinuy_mishari: 'קורולה',
      shnat_yitzur: '2020',
      tzeva_rechev: 'לבן'
    });
    
    mockUserSettings = new UserSettings('test_user');
  });

  describe('formatWelcomeMessage', () => {
    test('should format welcome message with buttons', () => {
      const result = formatter.formatWelcomeMessage();
      
      expect(result.text).toContain('ברוכים הבאים');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
      expect(result.reply_markup.inline_keyboard[0]).toHaveLength(2);
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('עזרה');
      expect(result.reply_markup.inline_keyboard[0][1].text).toContain('הגדרות');
    });
  });

  describe('formatHelpMessage', () => {
    test('should format help message with instructions', () => {
      const result = formatter.formatHelpMessage();
      
      expect(result.text).toContain('איך להשתמש');
      expect(result.text).toContain('דוגמה');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('formatSearchingMessage', () => {
    test('should format searching message with cancel button', () => {
      const result = formatter.formatSearchingMessage();
      
      expect(result.text).toContain('מחפש');
      expect(result.reply_markup.inline_keyboard[0][0].text).toContain('ביטול');
      expect(result.reply_markup.inline_keyboard[0][0].callback_data).toBe('cancel_search');
    });
  });

  describe('formatVehicleResults', () => {
    test('should format vehicle results with all data', () => {
      const result = formatter.formatVehicleResults(mockVehicleData, mockUserSettings, true);
      
      expect(result.text).toContain('טויוטה קורולה');
      expect(result.text).toContain('12345678');
      expect(result.text).toContain('יש תו נכה תקף');
      expect(result.parse_mode).toBe('Markdown');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });

    test('should format vehicle results without disability permit', () => {
      const result = formatter.formatVehicleResults(mockVehicleData, mockUserSettings, false);
      
      expect(result.text).toContain('אין תו נכה');
    });

    test('should handle invalid vehicle data', () => {
      const invalidVehicle = new VehicleData({});
      const result = formatter.formatVehicleResults(invalidVehicle, mockUserSettings);
      
      expect(result.text).toContain('לא נמצאו נתונים');
    });

    test('should respect user display settings', () => {
      mockUserSettings.displayFields.manufacturer = false;
      mockUserSettings.displayFields.disabilityPermit = false;
      
      const result = formatter.formatVehicleResults(mockVehicleData, mockUserSettings, true);
      
      expect(result.text).not.toContain('יצרן');
      expect(result.text).not.toContain('תו נכה');
    });
  });

  describe('formatNoResultsMessage', () => {
    test('should format no results message', () => {
      const result = formatter.formatNoResultsMessage();
      
      expect(result.text).toContain('לא נמצאו נתונים');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('formatErrorMessage', () => {
    test('should format generic error message', () => {
      const result = formatter.formatErrorMessage();
      
      expect(result.text).toContain('אירעה שגיאה');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });

    test('should format invalid license plate error', () => {
      const result = formatter.formatErrorMessage('INVALID_LICENSE_PLATE');
      
      expect(result.text).toContain('לא תקין');
      expect(result.text).toContain('7-8 ספרות');
    });

    test('should format network timeout error', () => {
      const result = formatter.formatErrorMessage('NETWORK_TIMEOUT');
      
      expect(result.text).toContain('לוקח יותר זמן');
    });

    test('should format network error', () => {
      const result = formatter.formatErrorMessage('NETWORK_ERROR');
      
      expect(result.text).toContain('בעיית חיבור');
    });

    test('should format rate limit error', () => {
      const result = formatter.formatErrorMessage('RATE_LIMIT_EXCEEDED');
      
      expect(result.text).toContain('יותר מדי בקשות');
    });

    test('should format API server error', () => {
      const result = formatter.formatErrorMessage('API_SERVER_ERROR');
      
      expect(result.text).toContain('השירות אינו זמין');
    });
  });

  describe('formatSettingsMenu', () => {
    test('should format settings menu with summary', () => {
      const result = formatter.formatSettingsMenu(mockUserSettings);
      
      expect(result.text).toContain('הגדרות הבוט');
      expect(result.text).toContain('עברית');
      expect(result.text).toContain('שדות מופעלים');
      expect(result.parse_mode).toBe('Markdown');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('formatFieldsMenu', () => {
    test('should format fields menu with all fields', () => {
      const result = formatter.formatFieldsMenu(mockUserSettings);
      
      expect(result.text).toContain('בחירת שדות תצוגה');
      expect(result.parse_mode).toBe('Markdown');
      expect(result.reply_markup.inline_keyboard.length).toBeGreaterThan(5);
      
      // בדיקה שיש כפתורים לכל השדות
      const fieldDescriptions = UserSettings.getFieldDescriptions();
      const fieldCount = Object.keys(fieldDescriptions).length;
      expect(result.reply_markup.inline_keyboard.length).toBe(fieldCount + 1); // +1 for action buttons
    });

    test('should show correct status for enabled/disabled fields', () => {
      mockUserSettings.displayFields.manufacturer = true;
      mockUserSettings.displayFields.model = false;
      
      const result = formatter.formatFieldsMenu(mockUserSettings);
      
      // בדיקה שהכפתורים מציגים את הסטטוס הנכון
      const buttons = result.reply_markup.inline_keyboard;
      const manufacturerButton = buttons.find(row => 
        row[0].text.includes('יצרן')
      );
      const modelButton = buttons.find(row => 
        row[0].text.includes('דגם')
      );
      
      expect(manufacturerButton[0].text).toContain('✅');
      expect(modelButton[0].text).toContain('❌');
    });
  });

  describe('formatSaveConfirmation', () => {
    test('should format save confirmation message', () => {
      const result = formatter.formatSaveConfirmation();
      
      expect(result.text).toContain('נשמרו בהצלחה');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('formatResetConfirmation', () => {
    test('should format reset confirmation message', () => {
      const result = formatter.formatResetConfirmation();
      
      expect(result.text).toContain('אופסו לברירת המחדל');
      expect(result.reply_markup.inline_keyboard).toBeDefined();
    });
  });

  describe('formatLanguageMenu', () => {
    test('should format language menu with current selection', () => {
      const result = formatter.formatLanguageMenu(mockUserSettings);
      
      expect(result.text).toContain('בחירת שפה');
      expect(result.parse_mode).toBe('Markdown');
      
      // בדיקה שעברית מסומנת כנבחרת
      const hebrewButton = result.reply_markup.inline_keyboard[0][0];
      expect(hebrewButton.text).toContain('✅');
      expect(hebrewButton.text).toContain('עברית');
    });

    test('should show English as selected when user language is English', () => {
      mockUserSettings.language = 'en';
      const result = formatter.formatLanguageMenu(mockUserSettings);
      
      const englishButton = result.reply_markup.inline_keyboard[0][1];
      expect(englishButton.text).toContain('✅');
      expect(englishButton.text).toContain('English');
    });
  });

  describe('utility methods', () => {
    test('createInlineButton should create button object', () => {
      const button = formatter.createInlineButton('Test', 'test_callback');
      
      expect(button.text).toBe('Test');
      expect(button.callback_data).toBe('test_callback');
    });

    test('createButtonRow should return array of buttons', () => {
      const button1 = formatter.createInlineButton('Button 1', 'btn1');
      const button2 = formatter.createInlineButton('Button 2', 'btn2');
      const row = formatter.createButtonRow([button1, button2]);
      
      expect(row).toHaveLength(2);
      expect(row[0]).toBe(button1);
      expect(row[1]).toBe(button2);
    });

    test('createInlineKeyboard should create keyboard structure', () => {
      const row1 = [formatter.createInlineButton('Button 1', 'btn1')];
      const row2 = [formatter.createInlineButton('Button 2', 'btn2')];
      const keyboard = formatter.createInlineKeyboard([row1, row2]);
      
      expect(keyboard.inline_keyboard).toHaveLength(2);
      expect(keyboard.inline_keyboard[0]).toBe(row1);
      expect(keyboard.inline_keyboard[1]).toBe(row2);
    });

    test('sanitizeText should escape markdown characters', () => {
      const text = 'Test *bold* _italic_ [link](url)';
      const sanitized = formatter.sanitizeText(text);
      
      expect(sanitized).toContain('\\*');
      expect(sanitized).toContain('\\_');
      expect(sanitized).toContain('\\[');
    });

    test('sanitizeText should handle invalid input', () => {
      expect(formatter.sanitizeText(null)).toBe('');
      expect(formatter.sanitizeText(undefined)).toBe('');
      expect(formatter.sanitizeText(123)).toBe('');
    });

    test('truncateText should truncate long text', () => {
      const longText = 'a'.repeat(5000);
      const truncated = formatter.truncateText(longText, 100);
      
      expect(truncated.length).toBe(100);
      expect(truncated).toEndWith('...');
    });

    test('truncateText should not truncate short text', () => {
      const shortText = 'Short text';
      const result = formatter.truncateText(shortText, 100);
      
      expect(result).toBe(shortText);
    });
  });
});