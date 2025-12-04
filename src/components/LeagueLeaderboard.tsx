import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLeagueWeekNumber, formatWeekDateRange, getLeagueSeasonYear } from "@/lib/weekUtils";

interface LeagueLeaderboardProps {
  leagueId: string;
  leagueCreatedAt: string;
}

interface LeaderboardEntry {
  odile: string;
  rank: number;
  username: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
}

export function LeagueLeaderboard({ leagueId, leagueCreatedAt }: LeagueLeaderboardProps) {
  const currentWeek = getLeagueWeekNumber(leagueCreatedAt);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  // Fetch weekly leaderboard for selected week
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ["league-weekly-leaderboard", leagueId, selectedWeek],
    queryFn: async () => {
      const seasonYear = getLeagueSeasonYear(leagueCreatedAt, selectedWeek);
      
      // Get cards for this specific week
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("id, user_id, total_score")
        .eq("league_id", leagueId)
        .eq("week_number", selectedWeek)
        .eq("season_year", seasonYear);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      const cardIds = cards.map(c => c.id);
      const userIds = [...new Set(cards.map(c => c.user_id))];

      // Get bets and profiles in parallel
      const [betsResult, profilesResult] = await Promise.all([
        supabase.from("bets").select("card_id, result").in("card_id", cardIds),
        supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
      const cardUserMap = new Map(cards.map(c => [c.id, c.user_id]));

      // Calculate wins/losses per user
      const userBetStats: Record<string, { wins: number; losses: number }> = {};
      betsResult.data?.forEach((bet) => {
        const userId = cardUserMap.get(bet.card_id);
        if (userId) {
          if (!userBetStats[userId]) userBetStats[userId] = { wins: 0, losses: 0 };
          if (bet.result === true) userBetStats[userId].wins++;
          else if (bet.result === false) userBetStats[userId].losses++;
        }
      });

      // Build leaderboard
      return cards
        .map((card) => {
          const profile = profileMap.get(card.user_id);
          const stats = userBetStats[card.user_id] || { wins: 0, losses: 0 };
          const total = stats.wins + stats.losses;
          return {
            odile: card.user_id,
            rank: 1,
            username: profile?.username || "Unknown",
            avatarUrl: profile?.avatar_url || null,
            wins: stats.wins,
            losses: stats.losses,
            winRate: total > 0 ? Math.round((stats.wins / total) * 100) : 0,
            points: card.total_score || 0,
          };
        })
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }));
    },
    enabled: !!leagueId,
  });

  // Fetch all-time leaderboard (based on weekly rankings)
  const { data: allTimeData, isLoading: allTimeLoading } = useQuery({
    queryKey: ["league-alltime-leaderboard", leagueId],
    queryFn: async () => {
      // Get all cards for this league
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("id, user_id, total_score, week_number, season_year")
        .eq("league_id", leagueId);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      const userIds = [...new Set(cards.map(c => c.user_id))];
      const cardIds = cards.map(c => c.id);

      // Get profiles and bets
      const [profilesResult, betsResult] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
        supabase.from("bets").select("card_id, result").in("card_id", cardIds)
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
      const cardUserMap = new Map(cards.map(c => [c.id, c.user_id]));

      // Calculate wins/losses per user
      const userBetStats: Record<string, { wins: number; losses: number }> = {};
      betsResult.data?.forEach((bet) => {
        const userId = cardUserMap.get(bet.card_id);
        if (userId) {
          if (!userBetStats[userId]) userBetStats[userId] = { wins: 0, losses: 0 };
          if (bet.result === true) userBetStats[userId].wins++;
          else if (bet.result === false) userBetStats[userId].losses++;
        }
      });

      // Group cards by week to calculate weekly rankings
      const weeklyCards: Record<string, typeof cards> = {};
      cards.forEach((card) => {
        const key = `${card.season_year}-${card.week_number}`;
        if (!weeklyCards[key]) weeklyCards[key] = [];
        weeklyCards[key].push(card);
      });

      // Calculate ranking points for each user based on weekly finishes
      // 1st = 10pts, 2nd = 9pts, 3rd = 8pts, etc. (min 1pt for 10th+)
      const userRankingPoints: Record<string, number> = {};
      const userWeeksPlayed: Record<string, number> = {};

      Object.values(weeklyCards).forEach((weekCards) => {
        // Sort by total_score descending
        const sorted = [...weekCards].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
        sorted.forEach((card, index) => {
          const rankPoints = Math.max(1, 10 - index); // 1st=10, 2nd=9, ..., 10th+=1
          userRankingPoints[card.user_id] = (userRankingPoints[card.user_id] || 0) + rankPoints;
          userWeeksPlayed[card.user_id] = (userWeeksPlayed[card.user_id] || 0) + 1;
        });
      });

      // Build all-time leaderboard
      return Object.entries(userRankingPoints)
        .map(([userId, rankPoints]) => {
          const profile = profileMap.get(userId);
          const stats = userBetStats[userId] || { wins: 0, losses: 0 };
          const total = stats.wins + stats.losses;
          return {
            odile: userId,
            rank: 1,
            username: profile?.username || "Unknown",
            avatarUrl: profile?.avatar_url || null,
            wins: stats.wins,
            losses: stats.losses,
            winRate: total > 0 ? Math.round((stats.wins / total) * 100) : 0,
            points: rankPoints,
            weeksPlayed: userWeeksPlayed[userId] || 0,
          };
        })
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }));
    },
    enabled: !!leagueId,
  });

  const handlePrevWeek = () => setSelectedWeek((w) => Math.max(1, w - 1));
  const handleNextWeek = () => setSelectedWeek((w) => Math.min(currentWeek, w + 1));

  const renderLeaderboard = (data: LeaderboardEntry[] | undefined, isLoading: boolean, showWeeksPlayed = false, isPastWeek = false) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isPastWeek ? "No picks were submitted for this week" : "No picks submitted yet"}
          </p>
          {!isPastWeek && (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to make your picks!
              </p>
              <Link to={`/leagues/${leagueId}/betting`}>
                <Button className="mt-4">Make Picks</Button>
              </Link>
            </>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((member: any) => (
          <div key={member.odile}>
            <Link
              to={`/leagues/${leagueId}/member/${member.odile}`}
              className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8">
                  {member.rank <= 3 ? (
                    <Trophy
                      className={`h-5 w-5 ${
                        member.rank === 1
                          ? "text-yellow-500"
                          : member.rank === 2
                          ? "text-gray-400"
                          : "text-amber-600"
                      }`}
                    />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">#{member.rank}</span>
                  )}
                </div>
                <Avatar>
                  <AvatarFallback>{member.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium hover:underline">{member.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.wins}W - {member.losses}L
                    {showWeeksPlayed && member.weeksPlayed && (
                      <span className="ml-2">· {member.weeksPlayed} weeks</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <div className="flex items-center gap-1 justify-end">
                    {member.winRate >= 50 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <p className="font-semibold">{member.winRate}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="font-bold text-lg">{member.points}</p>
                </div>
              </div>
            </Link>
            {member.rank < data.length && <Separator />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings</CardTitle>
        <CardDescription>League standings and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="weekly" className="flex-1">Weekly</TabsTrigger>
            <TabsTrigger value="alltime" className="flex-1">All-Time</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevWeek}
                disabled={selectedWeek <= 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <div className="text-center">
                <p className="font-semibold">Week {selectedWeek}</p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatWeekDateRange(leagueCreatedAt, selectedWeek)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextWeek}
                disabled={selectedWeek >= currentWeek}
                className="gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {renderLeaderboard(weeklyData, weeklyLoading, false, selectedWeek < currentWeek)}
          </TabsContent>

          <TabsContent value="alltime">
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Points based on weekly rankings: 1st = 10pts, 2nd = 9pts, etc.
              </p>
            </div>
            {renderLeaderboard(allTimeData, allTimeLoading, true)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
