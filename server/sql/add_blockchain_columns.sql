-- Add blockchain verification columns to grievances table
ALTER TABLE grievances 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS blockchain_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blockchain_status TEXT;