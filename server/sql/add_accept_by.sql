-- Add accept_by column to grievances table
ALTER TABLE grievances 
ADD COLUMN accept_by TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows with a default value (24 hours from created_at)
UPDATE grievances 
SET accept_by = created_at + INTERVAL '24 hours'
WHERE accept_by IS NULL;