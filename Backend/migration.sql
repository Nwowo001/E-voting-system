-- Make email nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Remove nin column if it exists
ALTER TABLE users DROP COLUMN IF EXISTS nin;

-- Add matric_number and staff_id columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS matric_number VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) UNIQUE;

-- Make voterid nullable (matric_number/staff_id will be used instead)
ALTER TABLE users ALTER COLUMN voterid DROP NOT NULL;

-- Remove voterid column from votes table to ensure ballot secrecy
ALTER TABLE votes DROP COLUMN IF EXISTS voterid;

-- Make sure votecounts is fully populated
-- Create a trigger function to automatically create a votecount row when a candidate is added
CREATE OR REPLACE FUNCTION initialize_candidate_votecount()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO votecounts (candidateid, votecount)
    VALUES (NEW.candidateid, 0)
    ON CONFLICT (candidateid) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_initialize_candidate_votecount ON candidates;
CREATE TRIGGER trg_initialize_candidate_votecount
AFTER INSERT ON candidates
FOR EACH ROW
EXECUTE FUNCTION initialize_candidate_votecount();

-- Populate votecounts for any existing candidates
INSERT INTO votecounts (candidateid, votecount)
SELECT candidateid, 0 
FROM candidates
ON CONFLICT (candidateid) DO NOTHING;

-- AcuVote Database Migrations
-- Add email verification, phone, and bio columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create OTPs table for registration, voting, and password reset codes
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    type VARCHAR(30) NOT NULL, -- 'registration', 'vote', 'password_reset'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- Add missing columns to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS matric_number VARCHAR(50);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT '';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS manifesto TEXT;


