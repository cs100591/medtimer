# Project Organization & Folder Structure

## Repository Structure

The medication reminder application follows a monorepo structure with clear separation between frontend, backend, and shared components:

```
medication-reminder-app/
├── .kiro/                          # Kiro configuration and specs
│   ├── specs/                      # Project specifications
│   └── steering/                   # Development guidelines
├── .vscode/                        # VS Code workspace settings
├── apps/                           # Application implementations
│   ├── mobile/                     # Flutter mobile app
│   ├── web/                        # React web application
│   └── backend/                    # Node.js API server
├── packages/                       # Shared libraries and utilities
│   ├── shared-types/               # TypeScript type definitions
│   ├── ai-models/                  # ML models and utilities
│   └── localization/               # Translation files and i18n
├── infrastructure/                 # Infrastructure as code
│   ├── aws/                        # AWS CloudFormation/CDK
│   ├── docker/                     # Container configurations
│   └── monitoring/                 # Logging and monitoring setup
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   ├── architecture/               # System architecture docs
│   └── user-guides/                # End-user documentation
└── tools/                          # Development tools and scripts
    ├── scripts/                    # Build and deployment scripts
    └── testing/                    # Testing utilities and fixtures
```

## Application Structure

### Mobile App (`apps/mobile/`)
```
mobile/
├── lib/
│   ├── core/                       # Core utilities and constants
│   │   ├── constants/              # App constants and enums
│   │   ├── errors/                 # Error handling and exceptions
│   │   ├── utils/                  # Utility functions
│   │   └── config/                 # Configuration management
│   ├── data/                       # Data layer
│   │   ├── datasources/            # Local and remote data sources
│   │   ├── models/                 # Data models and DTOs
│   │   ├── repositories/           # Repository implementations
│   │   └── database/               # SQLite database setup
│   ├── domain/                     # Business logic layer
│   │   ├── entities/               # Core business entities
│   │   ├── repositories/           # Repository interfaces
│   │   ├── usecases/               # Business use cases
│   │   └── services/               # Domain services
│   ├── presentation/               # UI layer
│   │   ├── pages/                  # Screen/page widgets
│   │   ├── widgets/                # Reusable UI components
│   │   ├── providers/              # Riverpod state providers
│   │   └── themes/                 # App theming and styles
│   ├── features/                   # Feature-based organization
│   │   ├── medication/             # Medication management
│   │   ├── reminders/              # Reminder system
│   │   ├── adherence/              # Adherence tracking
│   │   ├── caregiver/              # Caregiver portal
│   │   ├── ai_personalization/     # AI features
│   │   └── settings/               # App settings
│   └── l10n/                       # Localization files
├── test/                           # Test files
├── android/                        # Android-specific code
├── ios/                            # iOS-specific code
└── pubspec.yaml                    # Flutter dependencies
```

### Web App (`apps/web/`)
```
web/
├── src/
│   ├── components/                 # Reusable React components
│   │   ├── ui/                     # Basic UI components
│   │   ├── forms/                  # Form components
│   │   └── layout/                 # Layout components
│   ├── features/                   # Feature-based modules
│   │   ├── medication/             # Medication management
│   │   ├── reminders/              # Reminder system
│   │   ├── adherence/              # Adherence tracking
│   │   ├── caregiver/              # Caregiver portal
│   │   └── settings/               # Settings management
│   ├── hooks/                      # Custom React hooks
│   ├── services/                   # API and external services
│   ├── store/                      # Redux store configuration
│   ├── utils/                      # Utility functions
│   ├── types/                      # TypeScript type definitions
│   ├── locales/                    # Translation files
│   └── assets/                     # Static assets
├── public/                         # Public assets
├── tests/                          # Test files
└── package.json                    # Dependencies and scripts
```

### Backend API (`apps/backend/`)
```
backend/
├── src/
│   ├── controllers/                # HTTP request handlers
│   │   ├── medication.controller.ts
│   │   ├── reminder.controller.ts
│   │   ├── adherence.controller.ts
│   │   ├── caregiver.controller.ts
│   │   └── auth.controller.ts
│   ├── services/                   # Business logic services
│   │   ├── medication.service.ts
│   │   ├── ai.service.ts
│   │   ├── notification.service.ts
│   │   └── interaction.service.ts
│   ├── repositories/               # Data access layer
│   │   ├── medication.repository.ts
│   │   ├── user.repository.ts
│   │   └── adherence.repository.ts
│   ├── models/                     # Database models and schemas
│   │   ├── entities/               # TypeORM entities
│   │   └── dto/                    # Data transfer objects
│   ├── middleware/                 # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/                     # API route definitions
│   ├── database/                   # Database configuration
│   │   ├── migrations/             # Database migrations
│   │   └── seeds/                  # Database seed data
│   ├── config/                     # Configuration management
│   └── utils/                      # Utility functions
├── tests/                          # Test files
└── package.json                    # Dependencies and scripts
```

## Shared Packages

### Shared Types (`packages/shared-types/`)
```
shared-types/
├── src/
│   ├── entities/                   # Core entity interfaces
│   ├── api/                        # API request/response types
│   ├── enums/                      # Shared enumerations
│   └── utils/                      # Type utilities
└── package.json
```

### AI Models (`packages/ai-models/`)
```
ai-models/
├── src/
│   ├── personalization/            # Personalization models
│   ├── interaction-checker/        # Drug interaction models
│   ├── pattern-recognition/        # Behavior pattern models
│   └── utils/                      # ML utilities
├── models/                         # Trained model files
└── package.json
```

### Localization (`packages/localization/`)
```
localization/
├── src/
│   ├── translations/               # Translation files by language
│   │   ├── en/                     # English translations
│   │   ├── es/                     # Spanish translations
│   │   ├── zh/                     # Chinese translations
│   │   └── ...                     # Other supported languages
│   ├── utils/                      # i18n utilities
│   └── types/                      # Localization types
└── package.json
```

## Naming Conventions

### File Naming
- **Components**: PascalCase for classes/components (`MedicationCard.tsx`)
- **Files**: kebab-case for regular files (`medication-service.ts`)
- **Directories**: kebab-case for folders (`ai-personalization/`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS`)

### Code Organization
- **Feature-First**: Group by feature rather than file type
- **Barrel Exports**: Use index files for clean imports
- **Separation of Concerns**: Clear separation between data, domain, and presentation layers
- **Dependency Direction**: Dependencies flow inward (presentation → domain → data)

## Development Guidelines

### Import Organization
```typescript
// 1. External libraries
import React from 'react';
import { Router } from 'express';

// 2. Internal packages
import { MedicationEntity } from '@shared/types';
import { AIService } from '@ai-models/personalization';

// 3. Relative imports
import { MedicationService } from '../services/medication.service';
import './component.styles.css';
```

### Component Structure (React/Flutter)
- Keep components focused and single-responsibility
- Use composition over inheritance
- Implement proper error boundaries
- Follow accessibility guidelines (WCAG 2.1 AA)

### API Design
- RESTful endpoints with consistent naming
- Proper HTTP status codes
- Comprehensive error responses
- API versioning strategy (`/api/v1/`)
- OpenAPI/Swagger documentation

### Database Design
- Normalized schema with proper relationships
- Encryption for sensitive health data
- Audit trails for compliance
- Proper indexing for performance
- Migration-based schema changes