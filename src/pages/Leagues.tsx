import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trophy, TrendingUp } from "lucide-react";
import Header from "@/components/Header";

const Leagues = () => {
  // Mock data for leagues
  const userLeagues = [
    {
      id: 1,
      name: "Weekend Warriors",
      members: 12,
      rank: 3,
      totalMembers: 12,
      winRate: 68,
    },
    {
      id: 2,
      name: "Premier League Fans",
      members: 24,
      rank: 7,
      totalMembers: 24,
      winRate: 52,
    },
    {
      id: 3,
      name: "College Buddies",
      members: 8,
      rank: 1,
      totalMembers: 8,
      winRate: 75,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">My Leagues</h1>
          <p className="text-muted-foreground mt-2">Manage your betting leagues and compete with friends</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create New League
          </Button>
          <Button size="lg" variant="outline" className="gap-2">
            <Users className="h-5 w-5" />
            Join League
          </Button>
        </div>

        {/* Leagues Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userLeagues.map((league) => (
            <Card key={league.id} className="hover:shadow-lg transition-shadow cursor-pointer border-border/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{league.name}</CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {league.totalMembers} members
                    </CardDescription>
                  </div>
                  {league.rank === 1 && (
                    <Badge variant="default" className="gap-1">
                      <Trophy className="h-3 w-3" />
                      #1
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your Rank</span>
                  <span className="font-semibold text-foreground">
                    #{league.rank} / {league.totalMembers}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Win Rate
                  </span>
                  <span className="font-semibold text-primary">{league.winRate}%</span>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View League
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State (hidden when leagues exist) */}
        {userLeagues.length === 0 && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Leagues Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first league or join an existing one to start competing with friends!
              </p>
              <div className="flex gap-4">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create League
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <Users className="h-5 w-5" />
                  Join League
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Leagues;
