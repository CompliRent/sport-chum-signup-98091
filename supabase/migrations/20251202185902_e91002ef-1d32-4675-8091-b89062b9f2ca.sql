-- Add missing columns to cards table
ALTER TABLE public.cards 
ADD COLUMN IF NOT EXISTS week_number integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS season_year integer NOT NULL DEFAULT 2024,
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS total_score integer DEFAULT 0;

-- Make league_id NOT NULL (update any null values first)
UPDATE public.cards SET league_id = (SELECT id FROM public.leagues LIMIT 1) WHERE league_id IS NULL;
ALTER TABLE public.cards ALTER COLUMN league_id SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_league_week'
  ) THEN
    ALTER TABLE public.cards ADD CONSTRAINT unique_user_league_week 
    UNIQUE (user_id, league_id, week_number, season_year);
  END IF;
END $$;