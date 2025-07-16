# Project Structure

## Architecture Pattern
- **Layered Architecture**: Clear separation between bot management, handlers, services, and utilities
- **Handler Pattern**: Specialized handlers for different message types (commands, license plates, settings)
- **Service Layer**: Business logic separated from presentation layer
- **Utility Layer**: Reusable components (validation, rate limiting, error handling)

## Directory Structure

```
src/
├── index.js              # Main entry point
├── bot/                  # Bot management layer
│   └── index.js         # BotManager class - orchestrates all components
├── handlers/            # Message handlers (presentation layer)
│   ├── commandHandler.js      # /start, /help, basic commands
│   ├── licensePlateHandler.js # Vehicle search logic
│   └── settingsHandler.js     # User preferences
├── services/            # Business logic layer
│   ├── userSettingsService.js # User preference management
│   └── vehicleDataService.js  # Israeli gov API integration
├── models/              # Data models
│   ├── UserSettings.js        # User preference model
│   └── VehicleData.js         # Vehicle data model
└── utils/               # Utility layer
    ├── cache.js              # Caching utilities
    ├── errorHandler.js       # Error handling & logging
    ├── inputValidator.js     # Input validation
    ├── messageFormatter.js   # Message formatting
    ├── messageRouter.js      # Message routing logic
    └── rateLimiter.js        # Rate limiting

tests/
├── unit/                # Unit tests (mirrors src structure)
├── integration/         # API integration tests
└── e2e/                # End-to-end tests
```

## Key Architectural Components

### BotManager (`src/bot/index.js`)
- Central orchestrator that connects all components
- Manages bot lifecycle (start/stop)
- Routes messages to appropriate handlers
- Handles graceful shutdown and error recovery

### Handler Classes
- **CommandHandler**: Basic bot commands and navigation
- **LicensePlateHandler**: Vehicle search functionality
- **SettingsHandler**: User preference management
- Each handler is stateless and receives bot instance via constructor

### Service Layer
- **UserSettingsService**: Manages user preferences (in-memory)
- **VehicleDataService**: Integrates with Israeli government API
- Services contain business logic and external integrations

### Utility Classes
- **MessageRouter**: Routes incoming messages to appropriate handlers
- **InputValidator**: Validates and sanitizes user input
- **RateLimiter**: Prevents spam and abuse
- **ErrorHandler**: Centralized error handling and logging
- **MessageFormatter**: Formats responses with Hebrew support

## Coding Conventions

### File Naming
- Classes: PascalCase (e.g., `BotManager.js`)
- Utilities: camelCase (e.g., `messageRouter.js`)
- Tests: `*.test.js` suffix

### Class Structure
- Constructor receives dependencies
- Public methods for main functionality
- Private methods prefixed with `_`
- JSDoc comments for all public methods
- Hebrew comments for business logic explanations

### Error Handling
- All async operations wrapped in try-catch
- Errors logged via ErrorHandler utility
- Graceful degradation for non-critical failures
- User-friendly error messages in Hebrew

### Testing Structure
- Tests mirror source structure
- Unit tests for individual components
- Integration tests for external APIs
- E2E tests for complete user flows
- 90%+ coverage target