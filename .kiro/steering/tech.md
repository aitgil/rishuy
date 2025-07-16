# Technology Stack

## Core Technologies
- **Runtime**: Node.js 18+
- **Language**: JavaScript (ES2021)
- **Main Framework**: node-telegram-bot-api
- **HTTP Client**: axios
- **Environment**: dotenv

## Development Tools
- **Testing**: Jest with 90%+ coverage target
- **Linting**: ESLint with recommended rules
- **Formatting**: Prettier
- **Development**: nodemon for hot reload

## Deployment & Infrastructure
- **Containerization**: Docker + Docker Compose
- **Process Management**: Built-in graceful shutdown handling
- **Reverse Proxy**: Nginx (optional, for webhook mode)
- **Caching**: Redis (optional, for advanced caching)

## Common Commands

### Development
```bash
npm run dev          # Start with nodemon
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
```

### Production
```bash
npm start            # Start production server
./scripts/start.sh   # Docker deployment
./scripts/status.sh  # Check deployment status
./scripts/stop.sh    # Stop services
```

### Testing
```bash
npm test                    # All tests
npm run test:coverage      # With coverage report
npm run test -- --watch    # Watch mode
```

## Configuration
- Environment variables via `.env` files
- ESLint config in `.eslintrc.js`
- Jest config in `jest.config.js`
- Prettier config in `.prettierrc`
- Docker setup in `docker-compose.yml`