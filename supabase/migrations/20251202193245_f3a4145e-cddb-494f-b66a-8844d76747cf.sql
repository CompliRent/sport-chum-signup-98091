-- Create function to recalculate card score
CREATE OR REPLACE FUNCTION public.update_card_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the total_score on the card based on winning bets
  UPDATE cards
  SET total_score = (
    SELECT COALESCE(COUNT(*), 0)
    FROM bets
    WHERE bets.card_id = COALESCE(NEW.card_id, OLD.card_id)
      AND bets.result = true
  )
  WHERE id = COALESCE(NEW.card_id, OLD.card_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update score when bet result changes
CREATE TRIGGER update_card_score_on_bet_result
AFTER INSERT OR UPDATE OF result OR DELETE ON bets
FOR EACH ROW
EXECUTE FUNCTION public.update_card_score();