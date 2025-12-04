import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, Trophy, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatTeamName, formatMoneyline } from "@/lib/teamUtils";

const MemberCard = () => {
  const { leagueId, userId } = useParams();
  const [searchParams] = useSearchParams();
  
  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  };

  // Get week/year from URL params or use current
  const selectedWeek = searchParams.get("week") ? parseInt(searchParams.get("week")!) : getWeekNumber();
  const selectedYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

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
              <Skeleton className="h-16 w-16 rounded-full" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {profile?.username?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{profile?.username}'s Card</h1>
                <p className="text-muted-foreground">
                  Week {selectedWeek}, {selectedYear} • {bets?.length || 0} picks
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Summary */}
        {bets && bets.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
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
