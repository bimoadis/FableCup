-- ==========================================
-- SETUP SUPABASE CRON JOBS FOR ANTHROPOS CUP
-- ==========================================
-- This script schedules background jobs to lock matches and settle scores.
-- Run this script in your Supabase Dashboard SQL Editor (https://supabase.com).
-- Make sure to replace:
-- 1. 'YOUR_CRON_SECRET' with the CRON_SECRET value set in your Vercel/local environment variables.
-- 2. 'https://anthroposcup.com' with your actual production or staging URL.

-- 1. Enable Required Extensions
-- Note: 'pg_cron' must be enabled in your Supabase project settings:
-- Database -> Extensions -> search for 'pg_cron' and toggle it ON.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Clean up existing schedules to prevent duplicates
SELECT cron.unschedule('auto-lock-matches');
SELECT cron.unschedule('auto-settle-matches');

-- 3. Schedule 'auto-lock-matches' (Runs every minute)
-- Checks if any open match's kickoff time has passed and locks it.
SELECT cron.schedule(
  'auto-lock-matches',
  '* * * * *',
  $$
  SELECT net.http_get(
    url := 'https://anthroposcup.com/api/cron/auto-lock',
    headers := '{"Authorization": "Bearer super_secret_cron_key_fable_cup_2026"}'::jsonb
  );
  $$
);

-- 4. Schedule 'auto-settle-matches' (Runs every 5 minutes)
-- Fetches results for locked matches, updates scores, computes winners, and processes Solana reward payouts.
SELECT cron.schedule(
  'auto-settle-matches',
  '0 */3 * * *',
  $$
  SELECT net.http_get(
    url := 'https://anthroposcup.com/api/cron/auto-settle',
    headers := '{"Authorization": "Bearer super_secret_cron_key_fable_cup_2026"}'::jsonb
  );
  $$
);

-- ==========================================
-- MONITORING & DEBUGGING QUERIES
-- ==========================================
-- Run these queries in the Supabase SQL Editor to check status:

-- A. View all scheduled cron jobs:
-- SELECT * FROM cron.job;

-- B. View history of cron job executions (errors, run times, etc.):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- C. Check pg_net HTTP request queue:
-- SELECT * FROM net.http_request_queue ORDER BY id DESC LIMIT 20;

-- D. Unscheduling a job manually if needed:
-- SELECT cron.unschedule('auto-lock-matches');
-- SELECT cron.unschedule('auto-settle-matches');
