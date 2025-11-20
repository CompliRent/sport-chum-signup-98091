import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinLeague() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const joinLeague = async () => {
      if (!user || !inviteCode) {
        toast({
          title: "Error",
          description: "You must be signed in to join a league",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        // Find the league by invite code
        const { data: league, error: leagueError } = await supabase
          .from("leagues")
          .select("id, name, max_members")
          .eq("invite_code", inviteCode.toUpperCase())
          .maybeSingle();

        if (leagueError) throw leagueError;

        if (!league) {
          toast({
            title: "Invalid Invite Code",
            description: "This invite code doesn't match any league",
            variant: "destructive",
          });
          navigate("/leagues");
          return;
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
          .from("league_members")
          .select("id")
          .eq("league_id", league.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingMember) {
          toast({
            title: "Already a Member",
            description: `You're already in ${league.name}`,
          });
          navigate(`/leagues/${league.id}`);
          return;
        }

        // Check league capacity
        if (league.max_members) {
          const { count } = await supabase
            .from("league_members")
            .select("*", { count: "exact", head: true })
            .eq("league_id", league.id);

          if (count && count >= league.max_members) {
            toast({
              title: "League Full",
              description: `${league.name} has reached its member limit`,
              variant: "destructive",
            });
            navigate("/leagues");
            return;
          }
        }

        // Join the league
        const { error: joinError } = await supabase
          .from("league_members")
          .insert({
            league_id: league.id,
            user_id: user.id,
            role: "member",
          });

        if (joinError) throw joinError;

        toast({
          title: "Success!",
          description: `You've joined ${league.name}`,
        });

        navigate(`/leagues/${league.id}`);
      } catch (error: any) {
        console.error("Error joining league:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to join league",
          variant: "destructive",
        });
        navigate("/leagues");
      } finally {
        setIsProcessing(false);
      }
    };

    joinLeague();
  }, [user, inviteCode, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
              <p className="text-muted-foreground">
                {isProcessing ? "Processing invite..." : "Redirecting..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
