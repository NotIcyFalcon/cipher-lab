ALTER TABLE homework
ADD COLUMN total_base_xp INTEGER NOT NULL DEFAULT 0
CHECK (total_base_xp >= 0);
