-- Convert profile column to text first
ALTER TABLE participants ALTER COLUMN profile TYPE text USING profile::text;

-- Drop the old enum type
DROP TYPE IF EXISTS participant_profile;

-- Create the new enum with correct values matching the frontend code
CREATE TYPE participant_profile AS ENUM ('traditional', 'novice', 'curious', 'performer', 'ambassador');

-- Convert the column back to enum
ALTER TABLE participants ALTER COLUMN profile TYPE participant_profile USING profile::participant_profile;