# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack weighing system application with a C# .NET backend API and Angular frontend:

- **Backend**: `/src/backend/` - Clean Architecture .NET solution with Domain, Application, Infrastructure, and API layers
- **Frontend**: `/src/frontend/kiriu-weighing-frontend/` - Angular 20 application with PrimeNG UI components
- **Database**: `/src/backend/Kiriu.WeighingSystem.Database/` - Manual migration scripts and database documentation

## Development Commands

### Frontend (Angular)
Navigate to `/src/frontend/kiriu-weighing-frontend/` for all frontend operations:

```bash
# Development server
npm start
ng serve

# Build for production
npm run build
ng build

# Run tests
npm test
ng test

# Linting
npm run lint
ng lint
```

### Backend (.NET)
Navigate to `/src/backend/` for all backend operations:

```bash
# Build solution
dotnet build

# Run API (from Api project directory)
dotnet run --project Kiriu.WeighingSystem.Api

# Run tests (if any test projects exist)
dotnet test

# Restore packages
dotnet restore
```

### Database (SQL Server)
Navigate to `/src/backend/Kiriu.WeighingSystem.Database/` for database operations:

```sql
-- Apply all database migrations (idempotent)
manual_migrations.sql

-- Check database status and verify tables
check_database.sql

-- For future modifications, consult templates
migration_templates.sql
```

**Important:** Use manual SQL scripts instead of EF Core migrations to avoid version conflicts.

## Architecture Overview

### Backend Architecture
The backend follows Clean Architecture patterns with four main projects:

1. **Domain** (`Kiriu.WeighingSystem.Domain`): Core business entities and interfaces
   - Entities: Usuario, Rol, Permiso, WeighingOperation, WeighingPhoto, WeighingRemolque
   - Domain interfaces for services and repositories

2. **Application** (`Kiriu.WeighingSystem.Application`): Business logic and use cases
   - Application services (AuthApplicationService, UsuarioApplicationService, WeighingApplicationService)
   - DTOs for request/response models
   - Validation using FluentValidation

3. **Infrastructure** (`Kiriu.WeighingSystem.Infrastructure`): Data access and external services
   - Entity Framework DbContext (`WeighingDbContext`)
   - Repository implementations
   - External service implementations

4. **API** (`Kiriu.WeighingSystem.Api`): Web API layer
   - Controllers (AuthController, UsuariosController, WeighingController)
   - Middleware for global exception handling
   - Authentication and authorization setup

5. **Database** (`Kiriu.WeighingSystem.Database`): Database management
   - Manual migration scripts (manual_migrations.sql)
   - Database verification tools (check_database.sql)
   - Migration templates for future changes

### Frontend Architecture
The Angular frontend uses a feature-based architecture:

- **Core**: Authentication guards, interceptors, and core services
- **Features**: Modular feature areas (auth, dashboard, weighing)
- **Shared**: Reusable components, services, and utilities
- **Layout**: Header, sidebar, and navigation components

### Key Features
The weighing system supports:

- **Entry/Exit Operations**: Vehicle weighing for entry and exit
- **Double Trailer Support**: Complex weighing operations for multiple trailers
- **Container Operations**: Container-only weighing flows
- **Weight Capture**: Real-time weight monitoring and capture
- **Photo Documentation**: Image capture for cargo and vehicle states
- **User Management**: Role-based authentication and authorization

## Technology Stack

### Frontend
- Angular 20 with Server-Side Rendering (SSR)
- PrimeNG for UI components
- SCSS for styling
- TypeScript with strict mode
- ESLint for code quality

### Backend
- .NET 8
- Entity Framework Core for data access
- Mapster for object mapping
- FluentValidation for request validation
- JWT authentication
- Swagger/OpenAPI documentation

## Important Files and Patterns

### Frontend Key Files
- `src/app/features/weighing/types/weighing.types.ts`: Core type definitions for weighing operations
- `src/app/features/weighing/services/`: Business logic services for weighing flows
- `src/app/core/guards/auth.guard.ts`: Route protection
- `src/app/core/interceptors/`: HTTP interceptors for API communication

### Backend Key Files
- `Program.cs`: Application startup and dependency injection configuration
- `WeighingDbContext.cs`: Entity Framework database context
- `Extensions/`: Service registration and configuration extensions

## Development Guidelines

- Frontend components use standalone Angular components
- Backend follows repository pattern with dependency injection
- All validation is handled through FluentValidation in the Application layer
- Authentication uses JWT tokens with refresh token support
- The system uses invariant culture settings for consistent number formatting
- PrimeNG components are configured globally through `prime-ng.config.ts`