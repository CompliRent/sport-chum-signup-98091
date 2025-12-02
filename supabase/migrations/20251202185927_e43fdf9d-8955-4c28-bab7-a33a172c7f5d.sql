-- Add RLS policies for cards table
CREATE POLICY "Users can view their own cards"
ON public.cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards"
ON public.cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
ON public.cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
ON public.cards FOR DELETE
USING (auth.uid() = user_id);

-- Add RLS policies for bets table (assuming bets are linked to cards)
CREATE POLICY "Authenticated users can view all bets"
ON public.bets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create bets"
ON public.bets FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bets"
ON public.bets FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bets"
ON public.bets FOR DELETE
TO authenticated
USING (true);