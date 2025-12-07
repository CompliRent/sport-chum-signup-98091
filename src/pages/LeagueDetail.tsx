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
import { CardHistory } from "@/components/CardHistory";
import { LeagueLeaderboard } from "@/components/LeagueLeaderboard";
import { ArrowLeft, Users, Calendar, Copy, Check, Ticket, Trophy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { formatTeamName, formatMoneyline, formatBetTypeBadge, formatBetDisplay } from "@/lib/teamUtils";
import { getLeagueWeekNumber, getLeagueSeasonYear } from "@/lib/weekUtils";

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


  // Fetch league members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["league-members", id],
    queryFn: async () => {
      if (!id) return [];

      const { data: members, error } = await supabase
        .from("league_members")
        .select("user_id, role, joined_at")
        .eq("league_id", id);

      if (error) throw error;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return members.map((member) => {
        const profile = profileMap.get(member.user_id);
        return {
          odile: member.user_id,
          username: profile?.username || "Unknown",
          avatarUrl: profile?.avatar_url || null,
          role: member.role,
          joinedAt: member.joined_at,
        };
      }).sort((a, b) => {
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
      });
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
        .select("id, event_id, selection, bet_type, home_team_id, away_team_id, line, result, created_at, card_id, spread_value, total_value")
        .in("card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return bets?.map((bet) => {
        const userId = cardUserMap.get(bet.card_id);
        const profile = userId ? profileMap.get(userId) : null;
        const { primary, secondary } = formatBetDisplay(
          bet.bet_type,
          bet.selection,
          Number(bet.line),
          bet.spread_value,
          bet.total_value
        );
        return {
          id: bet.id,
          username: profile?.username || "Unknown",
          game: formatGameName(bet.home_team_id, bet.away_team_id),
          pick: primary,
          betType: bet.bet_type,
          odds: secondary,
          status: bet.result === null ? "pending" : bet.result ? "won" : "lost",
          time: formatTimeAgo(bet.created_at),
        };
      }) || [];
    },
    enabled: !!id,
  });

  // Calculate current week for this league
  const currentWeek = league ? getLeagueWeekNumber(league.created_at) : 1;
  const currentYear = league ? getLeagueSeasonYear(league.created_at, currentWeek) : new Date().getFullYear();

  // Check if current user has picks for the current week
  const { data: userCurrentCard } = useQuery({
    queryKey: ["user-current-card", id, user?.id, currentWeek, currentYear],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const { data, error } = await supabase
        .from("cards")
        .select("id")
        .eq("league_id", id)
        .eq("user_id", user.id)
        .eq("week_number", currentWeek)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id && !!league,
  });

  // Get bet count for the user's current card
  const { data: userBetsCount } = useQuery({
    queryKey: ["user-current-bets-count", userCurrentCard?.id],
    queryFn: async () => {
      if (!userCurrentCard?.id) return 0;
      const { count, error } = await supabase
        .from("bets")
        .select("*", { count: "exact", head: true })
        .eq("card_id", userCurrentCard.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userCurrentCard?.id,
  });

  const hasPicks = (userBetsCount ?? 0) > 0;

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{league.name}</h1>
              <p className="text-muted-foreground mt-2">{league.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/leagues/${id}/betting`}>
                <Button className="gap-2">
                  <Ticket className="h-4 w-4" />
                  <span className="hidden sm:inline">{hasPicks ? "View" : "Make"}</span> Picks
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
        {/* Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="w-full flex overflow-x-auto mb-6 h-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger value="leaderboard" className="flex-1 min-w-fit text-xs sm:text-sm">Leaderboard</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-fit text-xs sm:text-sm">History</TabsTrigger>
            <TabsTrigger value="bets" className="flex-1 min-w-fit text-xs sm:text-sm">Bets</TabsTrigger>
            <TabsTrigger value="info" className="flex-1 min-w-fit text-xs sm:text-sm">Info</TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <LeagueLeaderboard leagueId={id!} leagueCreatedAt={league.created_at} />
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
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs">
                                  {formatBetTypeBadge(bet.betType)}
                                </Badge>
                                <span className="text-foreground font-medium">{bet.pick}</span>
                                <span className="text-muted-foreground">{bet.odds}</span>
                              </div>
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
                
                {/* Members Section */}
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members ({memberCount || 0})
                  </h3>
                  {membersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : !membersData || membersData.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No members yet</p>
                  ) : (
                    <div className="space-y-2">
                      {membersData.map((member, index) => (
                        <div key={member.odile}>
                          <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{member.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.username}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant={member.role === "owner" ? "default" : member.role === "admin" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Badge>
                          </div>
                          {index < membersData.length - 1 && <Separator className="my-1" />}
                        </div>
                      ))}
                    </div>
                  )}
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

          {/* History Tab */}
          <TabsContent value="history">
            <CardHistory 
              leagueId={id}
              title="Card History"
              description="View all past betting cards from league members"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LeagueDetail;
