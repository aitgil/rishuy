# Implementation Plan - Display Fields Fix

- [ ] 1. Investigate actual API response structure
  - Create a temporary debug function to log raw API responses
  - Test with multiple vehicle license plates to see data variations
  - Document which API fields contain actual data vs. empty fields
  - Create mapping between API field names and current model properties
  - _Requirements: 2.1, 2.2_

- [ ] 2. Enhance VehicleData model with missing field mappings
  - Add missing field properties to VehicleData constructor (vehicleType, seats, weight, firstRegistration)
  - Map API response fields to model properties using correct field names from investigation
  - Add validation to handle cases where API fields are null or undefined
  - Update rawData storage to preserve original API response for debugging
  - _Requirements: 2.2, 2.3_

- [ ] 3. Implement comprehensive toHebrewDisplay method
  - Replace current limited field checking with complete field mapping system
  - Create fieldMappings object that maps each UserSettings field to display logic
  - Implement proper null/empty checking for each field before display
  - Ensure only fields with actual data are included in output
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ] 4. Add translation methods for new field types
  - Implement _translateVehicleType method with Hebrew translations
  - Add proper formatting for numeric fields (seats, weight)
  - Enhance date formatting for firstRegistration field
  - Create fallback handling for untranslated values
  - _Requirements: 1.1, 3.2_

- [ ] 5. Update UserSettings default configuration
  - Modify getDefaultSettings to disable fields that are commonly empty by default
  - Keep core fields (manufacturer, model, year, color) enabled by default
  - Set optional fields (vehicleType, seats, weight) to disabled by default
  - Ensure disabilityPermit field is properly handled in display logic
  - _Requirements: 4.1, 4.2_

- [ ] 6. Create API data analysis utility
  - Implement ApiDataAnalyzer class with analyzeVehicleData method
  - Add logging functionality to show available vs empty fields
  - Create field mapping documentation generator
  - Add debug mode option to show raw API field names in display
  - _Requirements: 2.1, 4.3_

- [ ] 7. Fix MessageFormatter integration
  - Ensure MessageFormatter properly calls VehicleData.toHebrewDisplay with user settings
  - Verify that disabilityPermit field is handled separately as designed
  - Test that empty results show appropriate "לא נמצאו נתונים" message
  - Confirm Hebrew formatting and RTL text display works correctly
  - _Requirements: 1.1, 3.3_

- [ ] 8. Add comprehensive error handling
  - Handle cases where toHebrewDisplay returns empty results gracefully
  - Add validation for userSettings parameter in display methods
  - Implement fallback display when field mapping fails
  - Add logging for debugging field display issues
  - _Requirements: 3.1, 3.3_

- [ ] 9. Create unit tests for enhanced display logic
  - Test toHebrewDisplay with various combinations of enabled/disabled fields
  - Test with API responses that have missing or null fields
  - Test Hebrew translation methods with different input values
  - Test edge cases like all fields disabled or all fields empty
  - _Requirements: 1.1, 1.4, 3.1_

- [ ] 10. Perform integration testing with real API data
  - Test the complete flow from settings selection to display output
  - Verify that changing settings immediately affects subsequent searches
  - Test with multiple vehicle types to ensure field availability varies correctly
  - Confirm that users see selected fields when data is available
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 11. Update settings interface validation
  - Review field descriptions in UserSettings.getFieldDescriptions for accuracy
  - Add tooltips or help text for fields that may not always have data
  - Consider grouping fields by availability (always available vs. sometimes available)
  - Ensure settings UI reflects the actual behavior of field display
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 12. Add debug and monitoring capabilities
  - Implement optional debug logging for field mapping and display
  - Add metrics to track which fields are most commonly empty
  - Create admin/debug command to show raw API response structure
  - Add logging to help diagnose future field display issues
  - _Requirements: 2.1, 4.3_