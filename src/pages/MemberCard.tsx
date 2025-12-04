import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekNavigation } from "@/components/WeekNavigation";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, Trophy, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatTeamName, formatMoneyline } from "@/lib/teamUtils";
import { getLeagueWeekNumber, formatWeekDateRange, getLeagueSeasonYear } from "@/lib/weekUtils";

const MemberCard = () => {
  const { leagueId, userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Fetch league info first (needed for week calculation)
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

  // Calculate current week based on league creation date
  const currentWeek = league ? getLeagueWeekNumber(league.created_at) : 1;

  // Get week/year from URL params or use current league week
  const selectedWeek = searchParams.get("week") ? parseInt(searchParams.get("week")!) : currentWeek;
  const selectedYear = searchParams.get("year") 
    ? parseInt(searchParams.get("year")!) 
    : league ? getLeagueSeasonYear(league.created_at, selectedWeek) : new Date().getFullYear();
  
  // Get date range for display
  const weekDateRange = league ? formatWeekDateRange(league.created_at, selectedWeek) : "";

  // Handle week navigation
  const handleWeekChange = (week: number, year: number) => {
    const newYear = league ? getLeagueSeasonYear(league.created_at, week) : year;
    navigate(`/leagues/${leagueId}/member/${userId}?week=${week}&year=${newYear}`);
  };

  // Fetch member profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch member's card for selected week
  const { data: memberCard, isLoading: cardLoading } = useQuery({
    queryKey: ["member-card", leagueId, userId, selectedWeek, selectedYear],
    queryFn: async () => {
      if (!leagueId || !userId) return null;
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", userId)
        .eq("league_id", leagueId)
        .eq("week_number", selectedWeek)
        .eq("season_year", selectedYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId && !!userId,
  });

  // Fetch bets for the card
  const { data: bets, isLoading: betsLoading } = useQuery({
    queryKey: ["member-card-bets", memberCard?.id],
    queryFn: async () => {
      if (!memberCard?.id) return [];
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("card_id", memberCard.id);
      if (error) throw error;
      return data;
    },
    enabled: !!memberCard?.id,
  });

  // Fetch upcoming events to determine if games are locked
  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upcoming_events")
        .select("*")
        .gte("start_date", new Date().toISOString());
      if (error) throw error;
      return data;
    },
  });

  const upcomingEventIds = new Set(upcomingEvents?.map(e => e.event_id) || []);

  const getResultIcon = (result: boolean | null, isLocked: boolean) => {
    if (result === true) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (result === false) return <XCircle className="h-5 w-5 text-red-500" />;
    if (isLocked) return <Lock className="h-5 w-5 text-muted-foreground" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getResultBadge = (result: boolean | null, isLocked: boolean) => {
    if (result === true) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Won</Badge>;
    if (result === false) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Lost</Badge>;
    if (isLocked) return <Badge variant="secondary">In Progress</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  const isLoading = profileLoading || cardLoading || betsLoading;

  // Calculate stats
  const wins = bets?.filter(b => b.result === true).length || 0;
  const losses = bets?.filter(b => b.result === false).length || 0;
  const pending = bets?.filter(b => b.result === null).length || 0;

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

          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
              <div>
                <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-2" />
                <Skeleton className="h-4 w-24 sm:w-32" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                  <AvatarFallback className="text-lg sm:text-xl">
                    {profile?.username?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-foreground">{profile?.username}'s Card</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {bets?.length || 0} picks
                  </p>
                </div>
              </div>
              <WeekNavigation
                currentWeek={currentWeek}
                selectedWeek={selectedWeek}
                selectedYear={selectedYear}
                onWeekChange={handleWeekChange}
                weekDateRange={weekDateRange}
              />
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Summary */}
        {memberCard && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{wins}</p>
                <p className="text-sm text-muted-foreground">Wins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{losses}</p>
                <p className="text-sm text-muted-foreground">Losses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="h-8 w-8 mx-auto mb-2 flex items-center justify-center text-primary font-bold text-lg">%</div>
                <p className="text-2xl font-bold">
                  {wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Win Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center">
                <div className="h-8 w-8 mx-auto mb-2 flex items-center justify-center text-primary">
                  <span className="text-xl font-bold">★</span>
                </div>
                <p className="text-2xl font-bold text-primary">{memberCard.total_score || 0}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Picks */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !memberCard ? (
          <Card>
            <CardHeader>
              <CardTitle>No Card Submitted</CardTitle>
              <CardDescription>
                {profile?.username} hasn't submitted a card for this week yet.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : bets && bets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bets.map((bet) => {
              const isUpcoming = upcomingEventIds.has(bet.event_id);
              const isLocked = !isUpcoming;
              
              return (
                <Card key={bet.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      {getResultIcon(bet.result, isLocked)}
                      {getResultBadge(bet.result, isLocked)}
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-lg">
                        {formatTeamName(bet.selected_team_id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTeamName(bet.away_team_id)} @ {formatTeamName(bet.home_team_id)}
                      </p>
                      <p className="text-sm font-mono">
                        {formatMoneyline(Number(bet.line))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No picks on this card</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MemberCard;
