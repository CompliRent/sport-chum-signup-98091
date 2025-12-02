import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, AlertCircle, Edit, Lock } from "lucide-react";
import { formatTeamName, formatMoneyline } from "@/lib/teamUtils";

const MAX_PICKS = 5;

interface BetSelection {
  eventId: string;
  teamId: string;
  line: number;
  homeTeamId: string;
  awayTeamId: string;
}

const Betting = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selections, setSelections] = useState<Record<string, BetSelection>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Fetch league info
  const { data: league } = useQuery({
    queryKey: ["league", leagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch upcoming events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upcoming_events")
        .select("*")
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Check for existing card this week
  const { data: existingCard, isLoading: cardLoading } = useQuery({
    queryKey: ["user-card", leagueId, user?.id],
    queryFn: async () => {
      if (!user?.id || !leagueId) return null;
      const currentWeek = getWeekNumber();
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("league_id", leagueId)
        .eq("week_number", currentWeek)
        .eq("season_year", new Date().getFullYear())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!leagueId,
  });

  // Fetch existing bets for the card
  const { data: existingBets } = useQuery({
    queryKey: ["card-bets", existingCard?.id],
    queryFn: async () => {
      if (!existingCard?.id) return [];
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("card_id", existingCard.id);
      if (error) throw error;
      return data;
    },
    enabled: !!existingCard?.id,
  });

  // Separate locked bets (games started) from editable bets
  const { lockedBets, editableBetEventIds } = useMemo(() => {
    if (!existingBets || !events) return { lockedBets: [], editableBetEventIds: new Set<string>() };
    
    const now = new Date();
    const upcomingEventIds = new Set(events.map(e => e.event_id));
    
    const locked: typeof existingBets = [];
    const editableIds = new Set<string>();
    
    existingBets.forEach(bet => {
      if (upcomingEventIds.has(bet.event_id)) {
        // Event is still upcoming, editable
        editableIds.add(bet.event_id);
      } else {
        // Event has started/passed, locked
        locked.push(bet);
      }
    });
    
    return { lockedBets: locked, editableBetEventIds: editableIds };
  }, [existingBets, events]);

  // Load only editable bets into selections when editing
  useEffect(() => {
    if (isEditing && existingBets && existingBets.length > 0 && events) {
      const loadedSelections: Record<string, BetSelection> = {};
      existingBets.forEach((bet) => {
        // Only load if the event is still upcoming
        if (editableBetEventIds.has(bet.event_id)) {
          loadedSelections[bet.event_id] = {
            eventId: bet.event_id,
            teamId: bet.selected_team_id,
            line: Number(bet.line),
            homeTeamId: bet.home_team_id,
            awayTeamId: bet.away_team_id,
          };
        }
      });
      setSelections(loadedSelections);
    }
  }, [isEditing, existingBets, events, editableBetEventIds]);

  // Submit/Update card mutation
  const submitCardMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !leagueId) throw new Error("Not authenticated");

      const currentWeek = getWeekNumber();
      const betsArray = Object.values(selections);
      const totalPicks = betsArray.length + lockedBets.length;

      if (totalPicks === 0) {
        throw new Error("Please select at least one pick");
      }

      if (totalPicks > MAX_PICKS) {
        throw new Error(`Maximum ${MAX_PICKS} picks allowed (including ${lockedBets.length} locked picks)`);
      }

      let cardId: number;

      if (existingCard && isEditing) {
        // Update existing card - only delete editable bets (not locked ones)
        const lockedEventIds = lockedBets.map(b => b.event_id);
        
        if (lockedEventIds.length > 0) {
          // Delete only bets that are NOT locked
          const { error: deleteError } = await supabase
            .from("bets")
            .delete()
            .eq("card_id", existingCard.id)
            .not("event_id", "in", `(${lockedEventIds.map(id => `"${id}"`).join(",")})`);

          if (deleteError) throw deleteError;
        } else {
          // No locked bets, delete all
          const { error: deleteError } = await supabase
            .from("bets")
            .delete()
            .eq("card_id", existingCard.id);

          if (deleteError) throw deleteError;
        }
        
        cardId = existingCard.id;
      } else {
        // Create new card
        const { data: card, error: cardError } = await supabase
          .from("cards")
          .insert({
            user_id: user.id,
            league_id: leagueId,
            week_number: currentWeek,
            season_year: new Date().getFullYear(),
          })
          .select()
          .single();

        if (cardError) throw cardError;
        cardId = card.id;
      }

      // Create only the new/editable bets
      if (betsArray.length > 0) {
        const betsToInsert = betsArray.map((bet) => ({
          card_id: cardId,
          event_id: bet.eventId,
          selected_team_id: bet.teamId,
          home_team_id: bet.homeTeamId,
          away_team_id: bet.awayTeamId,
          line: bet.line,
        }));

        const { error: betsError } = await supabase
          .from("bets")
          .insert(betsToInsert);

        if (betsError) throw betsError;
      }

      return cardId;
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Card Updated!" : "Card Submitted!",
        description: isEditing 
          ? "Your picks have been updated." 
          : "Your picks have been locked in for this week.",
      });
      queryClient.invalidateQueries({ queryKey: ["user-card"] });
      queryClient.invalidateQueries({ queryKey: ["card-bets"] });
      queryClient.invalidateQueries({ queryKey: ["league-recent-bets"] });
      navigate(`/leagues/${leagueId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit card",
        variant: "destructive",
      });
    },
  });

  const handleSelectTeam = (eventId: string, teamId: string, line: number) => {
    const event = events?.find((e) => e.event_id === eventId);
    if (!event) return;

    setSelections((prev) => {
      const existing = prev[eventId];
      // If clicking the same team, deselect
      if (existing?.teamId === teamId) {
        const { [eventId]: _, ...rest } = prev;
        return rest;
      }
      
      // Check if we're at max picks and trying to add a new event (include locked bets in count)
      const currentCount = Object.keys(prev).length + lockedBets.length;
      if (!existing && currentCount >= MAX_PICKS) {
        toast({
          title: "Maximum picks reached",
          description: `You can only select ${MAX_PICKS} picks per card${lockedBets.length > 0 ? ` (${lockedBets.length} locked)` : ''}`,
          variant: "destructive",
        });
        return prev;
      }

      // Otherwise, select this team
      return {
        ...prev,
        [eventId]: {
          eventId,
          teamId,
          line,
          homeTeamId: event.home_team_id,
          awayTeamId: event.away_team_id,
        },
      };
    });
  };

  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const selectionCount = Object.keys(selections).length;
  const totalPickCount = selectionCount + lockedBets.length;

  // Show existing card view if not editing
  if (existingCard && !isEditing && !cardLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="border-b border-border/40 bg-card/50">
          <div className="container mx-auto px-4 py-6">
            <Link to={`/leagues/${leagueId}`}>
              <Button variant="ghost" size="sm" className="mb-4 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to {league?.name || "League"}
              </Button>
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Your Card</h1>
                <p className="text-muted-foreground mt-2">
                  Week {existingCard.week_number} • {existingBets?.length || 0} picks
                </p>
              </div>
              <Button onClick={handleStartEditing} variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Picks
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8">
          {existingBets && existingBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {existingBets.map((bet) => {
                const event = events?.find(e => e.event_id === bet.event_id);
                const isLocked = !event; // If event not found in upcoming, it's locked
                return (
                  <div key={bet.id} className="relative">
                    {isLocked && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      </div>
                    )}
                    <EventCard
                      event={event || {
                        id: bet.id,
                        event_id: bet.event_id,
                        home_team_id: bet.home_team_id,
                        away_team_id: bet.away_team_id,
                        home_moneyline: Number(bet.line),
                        away_moneyline: Number(bet.line),
                        start_date: new Date().toISOString(),
                      }}
                      selectedTeam={bet.selected_team_id}
                      onSelectTeam={() => {}} // View only
                      disabled
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No picks on this card yet</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <Link to={`/leagues/${leagueId}`}>
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {league?.name || "League"}
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isEditing ? "Edit Your Picks" : "Make Your Picks"}
              </h1>
              <p className="text-muted-foreground mt-2">
                Select up to {MAX_PICKS} winners for this week's games
                {lockedBets.length > 0 && ` (${lockedBets.length} locked)`}
              </p>
            </div>
            <Badge 
              variant={totalPickCount >= MAX_PICKS ? "destructive" : "secondary"} 
              className="text-lg px-4 py-2"
            >
              {totalPickCount}/{MAX_PICKS} picks
            </Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {totalPickCount >= MAX_PICKS && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've selected the maximum {MAX_PICKS} picks{lockedBets.length > 0 && ` (${lockedBets.length} locked)`}. Deselect a pick to choose a different game.
            </AlertDescription>
          </Alert>
        )}

        {eventsLoading || cardLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <>
            {/* Locked Bets Section */}
            {isEditing && lockedBets.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Locked Picks ({lockedBets.length})</h2>
                  <span className="text-sm text-muted-foreground">- Games already started</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                  {lockedBets.map((bet) => (
                    <Card key={bet.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        </div>
                        <p className="font-medium">{formatTeamName(bet.selected_team_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTeamName(bet.away_team_id)} @ {formatTeamName(bet.home_team_id)}
                        </p>
                        <p className="text-sm font-mono mt-1">{formatMoneyline(Number(bet.line))}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Editable Events */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  selectedTeam={selections[event.event_id]?.teamId || null}
                  onSelectTeam={handleSelectTeam}
                  disabled={totalPickCount >= MAX_PICKS && !selections[event.event_id]}
                />
              ))}
            </div>

            <Card className="sticky bottom-4 border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {totalPickCount} {totalPickCount === 1 ? "pick" : "picks"} total
                      {lockedBets.length > 0 && ` (${lockedBets.length} locked, ${selectionCount} editable)`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isEditing ? "Save changes to update your card" : "Submit your card to lock in your picks"}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => submitCardMutation.mutate()}
                    disabled={(totalPickCount === 0) || submitCardMutation.isPending}
                  >
                    {submitCardMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditing ? "Saving..." : "Submitting..."}
                      </>
                    ) : isEditing ? (
                      "Save Changes"
                    ) : (
                      "Submit Card"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Upcoming Games</CardTitle>
              <CardDescription>
                There are no games available for betting right now. Check back later!
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Betting;
