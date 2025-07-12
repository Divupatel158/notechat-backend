# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced error handling for database operations
- Improved input validation for all endpoints
- Added request rate limiting

### Changed
- Updated dependencies to latest stable versions
- Improved API response formatting

### Fixed
- Fixed CORS configuration for production deployment
- Resolved JWT token expiration handling

## [1.2.0] - 2024-01-15

### Added
- Real-time chat functionality with polling mechanism
- Enhanced security with Row Level Security (RLS) policies
- Email integration with Nodemailer
- SMS integration with Twilio
- Comprehensive input validation using express-validator
- Auto-deletion of messages older than 24 hours

### Changed
- Improved authentication middleware
- Enhanced error handling and logging
- Updated database schema with better constraints

### Fixed
- Fixed user authentication token validation
- Resolved database connection issues
- Fixed CORS configuration for frontend integration

## [1.1.0] - 2024-01-10

### Added
- User authentication with JWT tokens
- Password hashing with bcryptjs
- CRUD operations for notes
- User management endpoints
- Basic error handling

### Changed
- Restructured project architecture
- Improved API response format

## [1.0.0] - 2024-01-05

### Added
- Initial release
- Basic Express.js server setup
- Supabase database integration
- Basic note management functionality
- User registration and login

---

## Migration Guide

### From v1.1.0 to v1.2.0

1. Update your environment variables to include email and SMS configurations
2. Run the new database migrations for RLS policies
3. Update your frontend to handle the new real-time features

### From v1.0.0 to v1.1.0

1. Update your authentication flow to use JWT tokens
2. Modify your database schema to include the new user fields
3. Update your API calls to include the auth-token header 