-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'citizen',
    mobile_number TEXT NOT NULL,
    email TEXT,
    village_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Grievances table
CREATE TABLE IF NOT EXISTS grievances (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_number TEXT NOT NULL UNIQUE,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    village_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    evidence_files TEXT[],
    voice_recording_url TEXT,
    voice_transcription TEXT,
    assigned_to VARCHAR REFERENCES users(id),
    resolution_timeline INTEGER,
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    resolution_evidence TEXT[],
    verification_deadline TIMESTAMP WITH TIME ZONE,
    accept_by TIMESTAMP WITH TIME ZONE,
    is_escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    current_authority_level TEXT NOT NULL DEFAULT 'panchayat',
    escalation_count INTEGER NOT NULL DEFAULT 0,
    escalation_reason TEXT,
    escalation_due_date TIMESTAMP WITH TIME ZONE,
    can_resolve BOOLEAN,
    user_satisfaction TEXT,
    user_satisfaction_at TIMESTAMP WITH TIME ZONE,
    community_verify_count INTEGER NOT NULL DEFAULT 0,
    community_dispute_count INTEGER NOT NULL DEFAULT 0,
    auto_close_at TIMESTAMP WITH TIME ZONE,
    blockchain_tx_hash TEXT,
    blockchain_verified_at TIMESTAMP WITH TIME ZONE,
    blockchain_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id VARCHAR NOT NULL REFERENCES grievances(id),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    verification_type TEXT NOT NULL,
    status TEXT NOT NULL,
    comments TEXT,
    evidence_files TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain records table
CREATE TABLE IF NOT EXISTS blockchain_records (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id VARCHAR NOT NULL REFERENCES grievances(id),
    transaction_hash TEXT NOT NULL UNIQUE,
    block_number TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Escalation history table
CREATE TABLE IF NOT EXISTS escalation_history (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    grievance_id VARCHAR NOT NULL REFERENCES grievances(id),
    from_level TEXT NOT NULL,
    to_level TEXT NOT NULL,
    reason TEXT NOT NULL,
    escalated_by VARCHAR REFERENCES users(id),
    auto_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_grievances_user_id ON grievances(user_id);
CREATE INDEX IF NOT EXISTS idx_grievances_assigned_to ON grievances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_village_name ON grievances(village_name);
CREATE INDEX IF NOT EXISTS idx_verifications_grievance_id ON verifications(grievance_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_records_grievance_id ON blockchain_records(grievance_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_grievance_id ON escalation_history(grievance_id);

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_grievances_updated_at
    BEFORE UPDATE ON grievances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();