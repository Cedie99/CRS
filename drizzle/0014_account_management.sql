-- Add must_change_password flag (set when admin creates an account; cleared after user sets their own password)
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT false;

-- Add is_top_manager flag (top-level manager sees all agents/submissions, not just direct reports)
ALTER TABLE "users" ADD COLUMN "is_top_manager" boolean NOT NULL DEFAULT false;
