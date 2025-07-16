# Requirements Document

## Introduction

This feature addresses an issue where users can select display fields in the bot settings, but even when all fields are selected, they don't appear in the vehicle search results. The problem needs to be diagnosed and fixed to ensure that user display preferences are properly respected and that all available vehicle data fields are shown when selected.

## Requirements

### Requirement 1

**User Story:** As a user, I want all selected display fields to appear in vehicle search results, so that I can see the information I've chosen to display.

#### Acceptance Criteria

1. WHEN a user selects display fields in settings THEN those fields SHALL appear in vehicle search results if data is available
2. WHEN a user selects all display fields THEN all available vehicle data SHALL be shown in search results
3. WHEN a field has no data from the API THEN it SHALL either be omitted or show "לא זמין" (not available)
4. WHEN a user changes display field settings THEN subsequent searches SHALL reflect the new preferences immediately

### Requirement 2

**User Story:** As a developer, I want to understand which fields have actual data from the API, so that I can properly implement the display logic.

#### Acceptance Criteria

1. WHEN investigating the API response THEN I SHALL identify which fields contain actual data
2. WHEN mapping API fields to display fields THEN I SHALL ensure all available data is accessible
3. WHEN API field names don't match model properties THEN I SHALL create proper mappings
4. WHEN new fields are available from the API THEN they SHALL be easily addable to the display options

### Requirement 3

**User Story:** As a user, I want to see a clear indication when selected fields have no data, so that I understand why some information isn't displayed.

#### Acceptance Criteria

1. WHEN a selected field has no data THEN the system SHALL handle it gracefully
2. WHEN multiple fields are missing data THEN the display SHALL remain clean and readable
3. WHEN all selected fields have no data THEN a meaningful message SHALL be shown
4. WHEN some fields have data and others don't THEN only fields with data SHALL be displayed

### Requirement 4

**User Story:** As a user, I want the settings interface to accurately reflect which fields actually have displayable data, so that I can make informed choices.

#### Acceptance Criteria

1. WHEN viewing display field options THEN fields that never have data SHALL be clearly marked or removed
2. WHEN a field is commonly empty THEN it SHALL be disabled by default but still selectable
3. WHEN field descriptions are shown THEN they SHALL accurately describe what data will be displayed
4. WHEN hovering over or selecting fields THEN additional context SHALL be provided if helpful