-- SQL command to alter public.matches table to support match odds
-- Run this in your Supabase Dashboard SQL Editor if not already applied.
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS away_win INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS draw INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS home_win INTEGER DEFAULT NULL;
