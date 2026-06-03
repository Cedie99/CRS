-- Add agent_account_specialist column to combine first and last name fields
ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS agent_account_specialist varchar(255);

-- Migrate existing data: combine first and last name into the new column
UPDATE cis_submissions
SET agent_account_specialist = CONCAT(
  COALESCE(agent_account_specialist_first, ''),
  CASE 
    WHEN agent_account_specialist_first IS NOT NULL AND agent_account_specialist_last IS NOT NULL THEN ' '
    ELSE ''
  END,
  COALESCE(agent_account_specialist_last, '')
)
WHERE agent_account_specialist IS NULL 
  AND (agent_account_specialist_first IS NOT NULL OR agent_account_specialist_last IS NOT NULL);
