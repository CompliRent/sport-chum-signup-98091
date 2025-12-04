-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own cards" ON public.cards;

-- Create a new policy that allows users to view cards from leagues they belong to
CREATE POLICY "Users can view cards in their leagues" 
ON public.cards 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  is_league_member(league_id, auth.uid())
);