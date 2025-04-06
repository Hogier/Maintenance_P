-- Remove staffType column from users table if it exists
ALTER TABLE users
DROP COLUMN IF EXISTS staffType; 