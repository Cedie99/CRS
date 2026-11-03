-- Track when an admin last downloaded a backup of an ERP-encoded CIS (Admin → Backup Records)
ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS last_backup_at timestamp;
ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS last_backup_by uuid REFERENCES users(id) ON DELETE SET NULL;
