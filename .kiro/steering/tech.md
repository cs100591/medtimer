# Technology Stack & Build System

## Architecture Overview

Hybrid architecture combining on-device processing for privacy with cloud services for synchronization. Offline-first design ensures core functionality works without internet connectivity.

## Frontend Technologies

### Mobile Applications
- **Framework**: Flutter 3.x with Dart
- **State Management**: Riverpod for reactive state management
- **Local Storage**: SQLite with encryption for sensitive health data
- **Platform Integration**: Native iOS/Android APIs for notifications, voice, and hardware access

### Web Application
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit for predictable state updates
- **Local Storage**: IndexedDB for offline functionality
- **Build Tool**: Vite for fast development and optimized builds

## Backend Technologies

### Core Services
- **Runtime**: Node.js with Express.js and TypeScript
- **Database**: PostgreSQL with encryption at rest
- **Cache**: Redis for session management and frequently accessed data
- **File Storage**: AWS S3 with encryption for medication images
- **Message Queue**: Redis Bull for background job processing

### AI/ML Stack
- **On-Device**: TensorFlow Lite for privacy-preserving personalization
- **Cloud AI**: TensorFlow Serving for complex drug interaction analysis
- **Voice Processing**: Platform-native speech recognition and TTS
- **Pattern Recognition**: Custom models for medication adherence patterns

## Infrastructure & DevOps

### Cloud Platform
- **Provider**: AWS with HIPAA-compliant services
- **Containers**: Amazon ECS with Fargate for serverless containers
- **API Gateway**: AWS API Gateway with custom authorizers
- **CDN**: CloudFront for global content delivery
- **Monitoring**: CloudWatch + Sentry for comprehensive error tracking

### Security & Compliance
- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Authentication**: JWT with refresh tokens, OAuth2 for third-party integrations
- **HIPAA Compliance**: End-to-end encryption, audit logging, access controls
- **Privacy**: On-device AI processing, minimal data collection

## Development Workflow

### Common Commands

#### Mobile Development (Flutter)
```bash
# Setup and dependencies
flutter pub get
flutter pub upgrade

# Development
flutter run --debug
flutter run --release
flutter test
flutter analyze

# Build
flutter build apk --release
flutter build ios --release
flutter build web --release
```

#### Web Development (React)
```bash
# Setup and dependencies
npm install
npm update

# Development
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run test suite
npm run lint         # Code linting
npm run type-check   # TypeScript validation
```

#### Backend Development (Node.js)
```bash
# Setup and dependencies
npm install
npm run migrate      # Database migrations

# Development
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript
npm run start        # Production server
npm run test         # Test suite
npm run test:watch   # Test in watch mode
```

#### Database Operations
```bash
# Migrations
npm run migrate:up       # Apply migrations
npm run migrate:down     # Rollback migrations
npm run migrate:create   # Create new migration

# Seeding
npm run seed:dev         # Development data
npm run seed:test        # Test data
```

### Code Quality & Testing

#### Linting & Formatting
- **Flutter**: `dart analyze` + `dart format`
- **TypeScript**: ESLint + Prettier with strict rules
- **Commit Hooks**: Pre-commit validation with husky

#### Testing Strategy
- **Unit Tests**: Jest (Node.js/React), Flutter test framework
- **Integration Tests**: Supertest for API testing
- **Property-Based Testing**: fast-check for comprehensive validation
- **E2E Tests**: Playwright for cross-browser testing

#### Performance Requirements
- **Reminder Delivery**: < 1 second from scheduled time
- **Barcode Scanning**: < 3 seconds scan-to-data
- **AI Recommendations**: < 2 seconds response time
- **Cross-Platform Sync**: < 5 seconds for data sync

## External Integrations

### Required APIs
- **Drug Database**: FDA Orange Book, RxNorm for medication data
- **SMS Gateway**: Twilio for emergency notifications
- **Health Apps**: Apple HealthKit, Google Fit integration
- **Voice Services**: Platform-native TTS/STT with multilingual support

### Hardware Integration
- **Smart Dispensers**: Bluetooth/WiFi connectivity for automated dispensing
- **Barcode Scanners**: Camera-based scanning with ML recognition
- **Wearables**: Optional integration for activity-based timing optimization