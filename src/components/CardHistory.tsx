import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface CardHistoryProps {
  userId?: string;
  leagueId?: string;
  showLeagueName?: boolean;
  title?: string;
  description?: string;
}

export const CardHistory = ({ 
  userId, 
  leagueId, 
  showLeagueName = false,
  title = "Card History",
  description = "Your past betting cards"
}: CardHistoryProps) => {
  const { data: cards, isLoading } = useQuery({
    queryKey: ["card-history", userId, leagueId],
    queryFn: async () => {
      let query = supabase
        .from("cards")
        .select("id, week_number, season_year, total_score, is_completed, created_at, league_id, user_id")
        .order("season_year", { ascending: false })
        .order("week_number", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }
      if (leagueId) {
        query = query.eq("league_id", leagueId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Get league names if needed
      const leagueIds = [...new Set(data.map(c => c.league_id))];
      const { data: leagues } = await supabase
        .from("leagues")
        .select("id, name")
        .in("id", leagueIds);

      const leagueMap = new Map(leagues?.map(l => [l.id, l.name]) || []);

      // Get user profiles if showing multiple users (league view)
      let profileMap = new Map();
      if (!userId && leagueId) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);
        profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      }

      // Get bet results for each card
      const cardIds = data.map(c => c.id);
      const { data: bets } = await supabase
        .from("bets")
        .select("card_id, result")
        .in("card_id", cardIds);

      const betStats: Record<number, { wins: number; losses: number; pending: number }> = {};
      bets?.forEach(bet => {
        if (!betStats[bet.card_id]) {
          betStats[bet.card_id] = { wins: 0, losses: 0, pending: 0 };
        }
        if (bet.result === true) betStats[bet.card_id].wins++;
        else if (bet.result === false) betStats[bet.card_id].losses++;
        else betStats[bet.card_id].pending++;
      });

      return data.map(card => ({
        ...card,
        leagueName: leagueMap.get(card.league_id) || "Unknown League",
        username: profileMap.get(card.user_id) || null,
        stats: betStats[card.id] || { wins: 0, losses: 0, pending: 0 },
      }));
    },
    enabled: !!(userId || leagueId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No cards found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {cards.map(card => (
            <Link
              key={card.id}
              to={`/leagues/${card.league_id}/member/${card.user_id}?week=${card.week_number}&year=${card.season_year}`}
              className="block"
            >
              <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <span className="text-lg font-bold text-primary">W{card.week_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {card.username ? `${card.username} - ` : ""}Week {card.week_number}
                      </p>
                      {showLeagueName && (
                        <Badge variant="outline" className="text-xs">
                          {card.leagueName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {card.season_year} Season • {format(new Date(card.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      {card.stats.wins}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-4 w-4" />
                      {card.stats.losses}
                    </span>
                    {card.stats.pending > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Clock className="h-4 w-4" />
                        {card.stats.pending}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-bold">{card.total_score || 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
