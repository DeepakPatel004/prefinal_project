# Database Setup and Migration Guide

## Prerequisites

1. PostgreSQL client (`psql`) installed
2. Database connection URL in the `.env` file
3. Database superuser access (for creating extensions)

## Initial Setup

1. Create the database (if not already created):
```bash
createdb your_database_name
```

2. Apply the schema:
```bash
# On Windows PowerShell:
$env:PGPASSWORD='your_password'; psql "your_connection_string" -f server/sql/schema.sql

# On Unix/Linux:
PGPASSWORD='your_password' psql "your_connection_string" -f server/sql/schema.sql
```

## Schema Details

The schema includes:
- Users table (authentication and user management)
- Grievances table (main grievance tracking)
- Verifications table (community verification records)
- Blockchain records table (on-chain transaction records)
- Escalation history table (tracking escalation flow)

Key features:
- UUID generation using pgcrypto
- Automatic timestamp management
- Proper foreign key constraints
- Indexes for common queries
- Array support for file attachments

## Migrations

When making schema changes:
1. Create a new migration file in `server/sql/migrations/`
2. Name it with timestamp and description (e.g., `202510261234_add_new_column.sql`)
3. Test the migration in a development environment
4. Apply to production using the same psql command

## Backup Recommendation

Regular backups are recommended:
```bash
# Backup
pg_dump your_database > backup.sql

# Restore
psql your_database < backup.sql
```