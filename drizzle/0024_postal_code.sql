-- Add postal_code column to cis_submissions for address section
ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS postal_code varchar(20);

-- Add new_postal_code column to cus_submissions for customer update requests
ALTER TABLE cus_submissions ADD COLUMN IF NOT EXISTS new_postal_code varchar(20);
