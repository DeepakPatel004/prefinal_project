# Database Migration Instructions

This project uses Neon Postgres as the database. To apply migrations:

1. Make sure you have `psql` installed and the `DATABASE_URL` environment variable set.

2. Run the migration using psql:
```bash
psql $DATABASE_URL -f server/sql/add_accept_by.sql
```

## Verification

After running the migration, you can verify the column was added by checking:

```sql
\d grievances  -- Shows table structure
SELECT id, accept_by FROM grievances LIMIT 5;  -- Shows sample data
```

## Rollback

If needed, you can rollback the changes with:

```sql
ALTER TABLE grievances DROP COLUMN accept_by;
```

Note: Only run rollback if absolutely necessary and after backing up data.