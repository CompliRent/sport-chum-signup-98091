-- Drop existing problematic policies
DROP POLICY IF EXISTS "League owners and admins can add members" ON public.league_members;
DROP POLICY IF EXISTS "League owners and admins can update members" ON public.league_members;
DROP POLICY IF EXISTS "Users can leave leagues and owners can remove members" ON public.league_members;
DROP POLICY IF EXISTS "Users can view league members of leagues they're in" ON public.league_members;

-- Create security definer function to check league member roles
CREATE OR REPLACE FUNCTION public.check_league_member_role(
  _league_id uuid,
  _user_id uuid,
  _roles league_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = _league_id
      AND user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Create security definer function to check if user is a member of a league
CREATE OR REPLACE FUNCTION public.is_league_member(
  _league_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = _league_id
      AND user_id = _user_id
  )
$$;

-- Recreate INSERT policy: Allow users to join leagues themselves, or owners/admins to add members
CREATE POLICY "League owners and admins can add members"
ON public.league_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR public.check_league_member_role(league_id, auth.uid(), ARRAY['owner'::league_role, 'admin'::league_role])
);

-- Recreate UPDATE policy: Only owners/admins can update member roles
CREATE POLICY "League owners and admins can update members"
ON public.league_members
FOR UPDATE
USING (
  public.check_league_member_role(league_id, auth.uid(), ARRAY['owner'::league_role, 'admin'::league_role])
);

-- Recreate DELETE policy: Users can leave leagues, or owners/admins can remove members
CREATE POLICY "Users can leave leagues and owners can remove members"
ON public.league_members
FOR DELETE
USING (
  user_id = auth.uid() 
  OR public.check_league_member_role(league_id, auth.uid(), ARRAY['owner'::league_role, 'admin'::league_role])
);

-- Recreate SELECT policy: Users can view members of leagues they belong to
CREATE POLICY "Users can view league members of leagues they're in"
ON public.league_members
FOR SELECT
USING (
  public.is_league_member(league_id, auth.uid())
);