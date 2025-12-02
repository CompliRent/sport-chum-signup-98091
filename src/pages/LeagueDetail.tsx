import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import { LeagueSettingsDialog } from "@/components/LeagueSettingsDialog";
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Users, Calendar, DollarSign, Copy, Check, Ticket } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { formatTeamName, formatMoneyline } from "@/lib/teamUtils";

// Helper functions
const formatGameName = (homeTeamId: string, awayTeamId: string) => {
  return `${formatTeamName(awayTeamId)} @ ${formatTeamName(homeTeamId)}`;
};

const formatTimeAgo = (dateString: string) => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
};

const LeagueDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLeavingLeague, setIsLeavingLeague] = useState(false);

  const { data: league, isLoading } = useQuery({
    queryKey: ["league", id],
    queryFn: async () => {
      if (!id) throw new Error("League ID is required");

      const { data, error } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: memberCount } = useQuery({
    queryKey: ["league-members-count", id],
    queryFn: async () => {
      if (!id) return 0;

      const { count, error } = await supabase
        .from("league_members")
        .select("*", { count: "exact", head: true })
        .eq("league_id", id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: currentUserMembership } = useQuery({
    queryKey: ["league-membership", id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      const { data, error } = await supabase
        .from("league_members")
        .select("role")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  // Fetch leaderboard data from cards
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["league-leaderboard", id],
    queryFn: async () => {
      if (!id) return [];

      // Get all cards for this league
      const { data: cards, error: cardsError } = await supabase
        .from("cards")
        .select("user_id, total_score, is_completed")
        .eq("league_id", id);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(cards.map(c => c.user_id))];

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Aggregate scores by user
      const userScores: Record<string, { 
        username: string; 
        avatarUrl: string | null;
        totalScore: number; 
        wins: number; 
        losses: number;
      }> = {};

      cards.forEach((card) => {
        const odile = card.user_id;
        const profile = profileMap.get(odile);
        if (!userScores[odile]) {
          userScores[odile] = {
            username: profile?.username || "Unknown",
            avatarUrl: profile?.avatar_url || null,
            totalScore: 0,
            wins: 0,
            losses: 0,
          };
        }
        userScores[odile].totalScore += card.total_score || 0;
      });

      // Convert to array and sort by total score
      return Object.entries(userScores)
        .map(([odile, data]) => ({
          userId: odile,
          rank: 1,
          username: data.username,
          avatarUrl: data.avatarUrl,
          wins: data.wins,
          losses: data.losses,
          winRate: data.wins + data.losses > 0 
            ? Math.round((data.wins / (data.wins + data.losses)) * 100) 
            : 0,
          points: data.totalScore,
        }))
        .sort((a, b) => b.points - a.points)
        .map((item, index) => ({ ...item, rank: index + 1 }));
    },
    enabled: !!id,
  });

  // Fetch recent bets
  const { data: recentBetsData, isLoading: betsLoading } = useQuery({
    queryKey: ["league-recent-bets", id],
    queryFn: async () => {
      if (!id) return [];

      // Get cards for this league first
      const { data: leagueCards } = await supabase
        .from("cards")
        .select("id, user_id")
        .eq("league_id", id);

      if (!leagueCards || leagueCards.length === 0) return [];

      const cardIds = leagueCards.map(c => c.id);
      const userIds = [...new Set(leagueCards.map(c => c.user_id))];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const cardUserMap = new Map(leagueCards.map(c => [c.id, c.user_id]));

      // Get bets for these cards
      const { data: bets, error } = await supabase
        .from("bets")
        .select("id, event_id, selected_team_id, home_team_id, away_team_id, line, result, created_at, card_id")
        .in("card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return bets?.map((bet) => {
        const userId = cardUserMap.get(bet.card_id);
        const profile = userId ? profileMap.get(userId) : null;
        return {
          id: bet.id,
          username: profile?.username || "Unknown",
          game: formatGameName(bet.home_team_id, bet.away_team_id),
          pick: formatTeamName(bet.selected_team_id),
          line: bet.line,
          status: bet.result === null ? "pending" : bet.result ? "won" : "lost",
          time: formatTimeAgo(bet.created_at),
        };
      }) || [];
    },
    enabled: !!id,
  });

  const leaderboard = leaderboardData || [];
  const recentBets = recentBetsData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "lost":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const copyInviteCode = () => {
    if (league?.invite_code) {
      navigator.clipboard.writeText(league.invite_code);
      setCopiedCode(true);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLeaveLeague = async () => {
    if (!user?.id || !id) return;

    setIsLeavingLeague(true);

    try {
      const { error } = await supabase
        .from("league_members")
        .delete()
        .eq("league_id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Left League",
        description: `You've left ${league?.name}`,
      });

      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      navigate("/leagues");
    } catch (error: any) {
      console.error("Error leaving league:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to leave league",
        variant: "destructive",
      });
    } finally {
      setIsLeavingLeague(false);
    }
  };

  const isOwner = currentUserMembership?.role === "owner";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">League not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <Link to="/leagues">
            <Button variant="ghost" size="sm" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Leagues
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{league.name}</h1>
              <p className="text-muted-foreground mt-2">{league.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/leagues/${id}/betting`}>
                <Button className="gap-2">
                  <Ticket className="h-4 w-4" />
                  Make Picks
                </Button>
              </Link>
              {isOwner && (
                <LeagueSettingsDialog
                  leagueId={league.id}
                  currentName={league.name}
                  currentDescription={league.description}
                  currentIsPrivate={league.is_private}
                  currentMaxMembers={league.max_members}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* League Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">{memberCount || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Members</p>
                  <p className="text-2xl font-bold">{league.max_members || "Unlimited"}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-2xl font-bold">{format(new Date(league.created_at), "MMM d, yyyy")}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Privacy</p>
                  <p className="text-2xl font-bold">{league.is_private ? "Private" : "Public"}</p>
                </div>
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="bets">Recent Bets</TabsTrigger>
            <TabsTrigger value="info">League Info</TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Rankings</CardTitle>
                <CardDescription>Current standings for all league members</CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No picks submitted yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Be the first to make your picks!
                    </p>
                    <Link to={`/leagues/${id}/betting`}>
                      <Button className="mt-4">Make Picks</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((member) => (
                      <div key={member.userId}>
                        <Link 
                          to={`/leagues/${id}/member/${member.userId}`}
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
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Win Rate</p>
                              <div className="flex items-center gap-1">
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
                        {member.rank < leaderboard.length && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Bets Tab */}
          <TabsContent value="bets">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest bets placed by league members</CardDescription>
              </CardHeader>
              <CardContent>
                {betsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentBets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No bets placed yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bets will appear here once members make their picks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBets.map((bet, index) => (
                      <div key={bet.id}>
                        <div className="flex items-start justify-between py-3">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarFallback>{bet.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <p className="font-medium">{bet.username}</p>
                              <p className="text-sm text-muted-foreground">{bet.game}</p>
                              <p className="text-sm">
                                <span className="text-foreground font-medium">{bet.pick}</span> · {formatMoneyline(bet.line)}
                              </p>
                              <p className="text-xs text-muted-foreground">{bet.time}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={getStatusColor(bet.status)}>
                            {bet.status.toUpperCase()}
                          </Badge>
                        </div>
                        {index < recentBets.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* League Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>League Information</CardTitle>
                <CardDescription>Details and settings for this league</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{league.description || "No description provided"}</p>
                </div>
                <Separator />
                {league.is_private && league.invite_code && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-2">Invite Code</h3>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-4 py-2 rounded-md font-mono text-lg tracking-wider">
                          {league.invite_code}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyInviteCode}
                        >
                          {copiedCode ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Share this code with others to invite them to the league
                      </p>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">Privacy</h3>
                    <p className="text-muted-foreground">{league.is_private ? "Private" : "Public"} league</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Max Members</h3>
                    <p className="text-muted-foreground">{league.max_members || "Unlimited"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Created</h3>
                    <p className="text-muted-foreground">{format(new Date(league.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Total Members</h3>
                    <p className="text-muted-foreground">{memberCount || 0} active members</p>
                  </div>
                </div>
                <Separator />
                {!isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        Leave League
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave League?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave {league.name}? You'll need an invite code to rejoin if it's private.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleLeaveLeague}
                          disabled={isLeavingLeague}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isLeavingLeague ? "Leaving..." : "Leave League"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {isOwner && (
                  <p className="text-sm text-muted-foreground text-center">
                    As the league owner, you cannot leave the league. Transfer ownership or delete the league instead.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LeagueDetail;
