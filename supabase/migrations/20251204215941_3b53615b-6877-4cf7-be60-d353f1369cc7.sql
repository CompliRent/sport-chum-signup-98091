-- Add cascade delete for cards when league is deleted
ALTER TABLE public.cards 
DROP CONSTRAINT IF EXISTS cards_league_id_fkey;

ALTER TABLE public.cards 
ADD CONSTRAINT cards_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

-- Add cascade delete for bets when card is deleted
ALTER TABLE public.bets 
DROP CONSTRAINT IF EXISTS bets_card_id_fkey;

ALTER TABLE public.bets 
ADD CONSTRAINT bets_card_id_fkey 
FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;

-- Verify league_members already has cascade (add if not)
ALTER TABLE public.league_members 
DROP CONSTRAINT IF EXISTS league_members_league_id_fkey;

ALTER TABLE public.league_members 
ADD CONSTRAINT league_members_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;