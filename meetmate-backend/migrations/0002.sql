
-- Migration to add timing columns to existing tables

-- Add timing columns to meetings table
ALTER TABLE meetings ADD COLUMN processing_started_at DATETIME;
ALTER TABLE meetings ADD COLUMN processing_completed_at DATETIME;
ALTER TABLE meetings ADD COLUMN processing_duration_ms INTEGER;

-- Add duration column to processing_status table
ALTER TABLE processing_status ADD COLUMN duration_ms INTEGER;

-- Verify the changes
-- You can run these queries to check if columns were added successfully:
-- PRAGMA table_info(meetings);
-- PRAGMA table_info(processing_status);