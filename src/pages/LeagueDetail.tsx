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
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Users, Calendar, DollarSign, Copy, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

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

  // Mock leaderboard data - will be replaced with real data later
  const leaderboard = [
    { rank: 1, username: "SportsFanatic", wins: 24, losses: 8, winRate: 75, points: 1240 },
    { rank: 2, username: "BetMaster99", wins: 22, losses: 10, winRate: 69, points: 1180 },
    { rank: 3, username: "LuckyStreak", wins: 20, losses: 12, winRate: 63, points: 1090 },
    { rank: 4, username: "GameDay", wins: 18, losses: 14, winRate: 56, points: 980 },
    { rank: 5, username: "ProPicker", wins: 17, losses: 15, winRate: 53, points: 920 },
    { rank: 6, username: "AllInAce", wins: 16, losses: 16, winRate: 50, points: 860 },
    { rank: 7, username: "WinnerCircle", wins: 15, losses: 17, winRate: 47, points: 810 },
    { rank: 8, username: "BetSmart", wins: 14, losses: 18, winRate: 44, points: 750 },
  ];

  // Mock recent bets data - will be replaced with real data later
  const recentBets = [
    {
      id: 1,
      username: "SportsFanatic",
      game: "Lakers vs Warriors",
      pick: "Lakers -5.5",
      amount: "$50",
      status: "won",
      time: "2 hours ago",
    },
    {
      id: 2,
      username: "BetMaster99",
      game: "Cowboys vs Eagles",
      pick: "Over 48.5",
      amount: "$30",
      status: "won",
      time: "3 hours ago",
    },
    {
      id: 3,
      username: "LuckyStreak",
      game: "Celtics vs Heat",
      pick: "Heat +3.5",
      amount: "$40",
      status: "lost",
      time: "5 hours ago",
    },
    {
      id: 4,
      username: "GameDay",
      game: "Chiefs vs Bills",
      pick: "Chiefs ML",
      amount: "$60",
      status: "pending",
      time: "1 day ago",
    },
  ];

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
                <div className="space-y-4">
                  {leaderboard.map((member) => (
                    <div key={member.rank}>
                      <div className="flex items-center justify-between py-3">
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
                            <p className="font-medium">{member.username}</p>
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
                      </div>
                      {member.rank < leaderboard.length && <Separator />}
                    </div>
                  ))}
                </div>
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
                <div className="space-y-4">
                  {recentBets.map((bet) => (
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
                              <span className="text-foreground font-medium">{bet.pick}</span> · {bet.amount}
                            </p>
                            <p className="text-xs text-muted-foreground">{bet.time}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(bet.status)}>
                          {bet.status.toUpperCase()}
                        </Badge>
                      </div>
                      {bet.id < recentBets.length && <Separator />}
                    </div>
                  ))}
                </div>
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
