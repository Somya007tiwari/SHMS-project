-- ============================================================
-- SHMS Phase 3.6 Migration: Notifications & Reminders
-- ============================================================

-- 1. Convert notifications.type to VARCHAR(50) for flexible notification types
ALTER TABLE notifications ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);

-- 2. Add link column to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- 3. Create index for fast user notification retrieval
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications (user_id, is_read, created_at DESC);

-- 4. Add reminder flags to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false;
