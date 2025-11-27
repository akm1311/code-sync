# Employee Data Management System

## Overview

This is a console-based Employee Data Management System built with Python and SQLite. The application provides comprehensive functionality to manage employee records through an interactive command-line interface, featuring operations like employee registration, viewing records, updating details, salary management, and data analysis. The system uses a clean architectural approach with separate modules for database operations, employee management logic, and data models.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Database Layer (`database.py`)**
- Implements a `DatabaseConnection` class that handles SQLite connections
- Uses local SQLite database file (`employee_management.db`) for data persistence
- Provides connection management through context managers
- Implements SQLite with row_factory for dictionary-style results
- No external database dependencies - uses Python's built-in sqlite3 module

**Data Model (`models.py`)**
- Defines an `Employee` dataclass with core employee attributes
- Uses Python's `decimal.Decimal` for precise salary calculations
- Includes validation and utility methods like `full_name` property
- Provides data serialization through `to_dict()` method

**Business Logic (`employee_manager.py`)**
- Implements `EmployeeManager` class for all employee-related operations
- Handles CRUD operations (Create, Read, Update, Delete) with proper error handling
- Includes interactive employee registration with validation
- Provides employee details management (update/delete functionality)
- Includes data display functionality using the `tabulate` library
- Supports salary management operations (fixed amount and percentage increases)
- Manages database transactions through the database connection layer

**Application Entry Point (`main.py`)**
- Provides interactive console-based menu system
- Handles application initialization and flow control
- Features comprehensive menu options:
  - Employee registration
  - View all employees
  - View employees by designation
  - Update employee details
  - Delete employees
  - Salary updates by designation
  - Demo data insertion
  - Employee summary statistics
- Implements formatted output with headers and sections
- Includes user input validation and error handling

### Design Patterns

**Repository Pattern**: The `EmployeeManager` acts as a repository, abstracting database operations from the main application logic.

**Context Manager Pattern**: Database connections use context managers to ensure proper resource cleanup and transaction handling.

**Data Transfer Object**: The `Employee` dataclass serves as a DTO for transferring employee data between layers.

### Error Handling

The system implements comprehensive error handling at the database layer with try-catch blocks and proper error propagation. Database operations return boolean success indicators or empty collections on failure.

## External Dependencies

**Database**
- SQLite as the primary data store (local file-based database)
- No external database server required
- Connection managed through Python's built-in `sqlite3` module

**Python Libraries**
- `sqlite3`: Built-in SQLite database adapter (no installation required)
- `tabulate`: Table formatting for console output
- `decimal`: Precise financial calculations for salary data

**Database Configuration**
- Local SQLite database file: `employee_management.db`
- Automatic database file creation on first run
- No additional configuration required

## Recent Changes: Latest modifications with dates

**August 25, 2025:**
- Migrated from PostgreSQL to SQLite for simplified deployment
- Added interactive menu-driven interface
- Implemented employee registration functionality
- Added employee details management (update/delete operations)
- Enhanced salary management with designation-based updates
- Improved user input validation and error handling
- Added comprehensive statistics and reporting features