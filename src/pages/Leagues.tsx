import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { CreateLeagueDialog } from "@/components/CreateLeagueDialog";

const Leagues = () => {
  const { user } = useAuth();

  const { data: userLeagues, isLoading } = useQuery({
    queryKey: ["user-leagues", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("league_members")
        .select(`
          role,
          leagues!inner(
            id,
            name,
            description,
            is_private
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      // Get member counts for each league
      const leaguesWithCounts = await Promise.all(
        data.map(async (item) => {
          const { count } = await supabase
            .from("league_members")
            .select("*", { count: "exact", head: true })
            .eq("league_id", item.leagues.id);

          return {
            id: item.leagues.id,
            name: item.leagues.name,
            description: item.leagues.description,
            role: item.role,
            totalMembers: count || 0,
            isPrivate: item.leagues.is_private,
          };
        })
      );

      return leaguesWithCounts;
    },
    enabled: !!user?.id,
  });

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
          <CreateLeagueDialog />
          <Button size="lg" variant="outline" className="gap-2">
            <Users className="h-5 w-5" />
            Join League
          </Button>
        </div>

        {/* Leagues Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {userLeagues?.map((league) => (
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
                    {league.role === 'owner' && (
                      <Badge variant="default" className="gap-1">
                        <Trophy className="h-3 w-3" />
                        Owner
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {league.description && (
                    <p className="text-sm text-muted-foreground">{league.description}</p>
                  )}
                  <Link to={`/leagues/${league.id}`} className="block w-full mt-4">
                    <Button variant="outline" className="w-full">
                      View League
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State (hidden when leagues exist) */}
        {!isLoading && userLeagues?.length === 0 && (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Leagues Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Create your first league or join an existing one to start competing with friends!
              </p>
              <div className="flex gap-4">
                <CreateLeagueDialog />
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
