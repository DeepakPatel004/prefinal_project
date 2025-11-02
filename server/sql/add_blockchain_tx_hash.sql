-- Add blockchainTxHash column to grievances table
ALTER TABLE grievances ADD COLUMN blockchain_tx_hash TEXT;