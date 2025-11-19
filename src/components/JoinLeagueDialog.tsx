import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Lock, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const inviteCodeSchema = z.object({
  invite_code: z
    .string()
    .trim()
    .length(8, { message: "Invite code must be exactly 8 characters" })
    .regex(/^[A-Z0-9]+$/, { message: "Invite code must contain only uppercase letters and numbers" }),
});

type InviteCodeFormValues = z.infer<typeof inviteCodeSchema>;

export function JoinLeagueDialog() {
  const [open, setOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InviteCodeFormValues>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: {
      invite_code: "",
    },
  });

  // Fetch public leagues that the user is not a member of
  const { data: publicLeagues, isLoading } = useQuery({
    queryKey: ["public-leagues", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get leagues user is already in
      const { data: userLeagues } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id);

      const userLeagueIds = userLeagues?.map((l) => l.league_id) || [];

      // Get public leagues not in user's leagues
      let query = supabase
        .from("leagues")
        .select("id, name, description, max_members, created_by")
        .eq("is_private", false);

      if (userLeagueIds.length > 0) {
        query = query.not("id", "in", `(${userLeagueIds.join(",")})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get member counts for each league
      const leaguesWithCounts = await Promise.all(
        data.map(async (league) => {
          const { count } = await supabase
            .from("league_members")
            .select("*", { count: "exact", head: true })
            .eq("league_id", league.id);

          return {
            ...league,
            currentMembers: count || 0,
          };
        })
      );

      return leaguesWithCounts;
    },
    enabled: !!user?.id && open,
  });

  const joinLeague = async (leagueId: string, leagueName: string) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to join a league",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const { error } = await supabase
        .from("league_members")
        .insert({
          league_id: leagueId,
          user_id: user.id,
          role: "member",
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `You've joined ${leagueName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-leagues"] });
      queryClient.invalidateQueries({ queryKey: ["public-leagues"] });

      setOpen(false);
    } catch (error: any) {
      if (error.code === "23505") {
        toast({
          title: "Already a Member",
          description: "You're already a member of this league",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to join league",
          variant: "destructive",
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const onSubmitInviteCode = async (values: InviteCodeFormValues) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to join a league",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Find league with this invite code
      const { data: league, error: leagueError } = await supabase
        .from("leagues")
        .select("id, name, max_members")
        .eq("invite_code", values.invite_code.toUpperCase())
        .maybeSingle();

      if (leagueError) throw leagueError;

      if (!league) {
        toast({
          title: "Invalid Code",
          description: "No league found with this invite code",
          variant: "destructive",
        });
        return;
      }

      // Check if league is full
      const { count } = await supabase
        .from("league_members")
        .select("*", { count: "exact", head: true })
        .eq("league_id", league.id);

      if (count && league.max_members && count >= league.max_members) {
        toast({
          title: "League Full",
          description: "This league has reached its maximum capacity",
          variant: "destructive",
        });
        return;
      }

      // Join the league
      const { error } = await supabase
        .from("league_members")
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: "member",
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `You've joined ${league.name}`,
      });

      queryClient.invalidateQueries({ queryKey: ["user-leagues"] });
      form.reset();
      setOpen(false);
    } catch (error: any) {
      if (error.code === "23505") {
        toast({
          title: "Already a Member",
          description: "You're already a member of this league",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to join league",
          variant: "destructive",
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="gap-2">
          <Users className="h-5 w-5" />
          Join League
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Join a League</DialogTitle>
          <DialogDescription>
            Browse public leagues or enter an invite code to join a private league.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Public</TabsTrigger>
            <TabsTrigger value="code">Invite Code</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : publicLeagues && publicLeagues.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {publicLeagues.map((league) => (
                  <Card key={league.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{league.name}</CardTitle>
                            <Badge variant="outline" className="gap-1">
                              <Globe className="h-3 w-3" />
                              Public
                            </Badge>
                          </div>
                          {league.description && (
                            <CardDescription className="mt-2">
                              {league.description}
                            </CardDescription>
                          )}
                          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>
                              {league.currentMembers} / {league.max_members || "∞"} members
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => joinLeague(league.id, league.name)}
                          disabled={
                            isJoining ||
                            (league.max_members !== null &&
                              league.currentMembers >= league.max_members)
                          }
                        >
                          {league.max_members !== null &&
                          league.currentMembers >= league.max_members
                            ? "Full"
                            : "Join"}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No public leagues available to join
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitInviteCode)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="invite_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="ABC12345"
                              className="pl-9 uppercase"
                              maxLength={8}
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          </div>
                          <Button type="submit" disabled={isJoining}>
                            {isJoining ? "Joining..." : "Join"}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    Enter the 8-character invite code provided by the league owner to
                    join a private league.
                  </p>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
