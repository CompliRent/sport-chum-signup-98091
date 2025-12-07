import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTeamName, formatMoneyline, getTeamAbbreviation, formatSpread, formatTotal, formatBetTypeBadge } from "@/lib/teamUtils";
import { format } from "date-fns";
import { Lock, ChevronRight } from "lucide-react";
import { BetSelection } from "@/components/EventBettingModal";

interface Event {
  id: number;
  event_id: string;
  home_team_id: string;
  away_team_id: string;
  home_moneyline: number;
  away_moneyline: number;
  home_spread_value?: number | null;
  ou_value?: number | null;
  start_date: string;
}

interface EventCardProps {
  event: Event;
  selections: Record<string, BetSelection>;
  onCardClick: () => void;
  disabled?: boolean;
}

export const EventCard = ({ event, selections, onCardClick, disabled = false }: EventCardProps) => {
  // Get selections for this event
  const mlKey = `${event.event_id}-moneyline`;
  const spreadKey = `${event.event_id}-spread`;
  const ouKey = `${event.event_id}-over_under`;

  const mlSelection = selections[mlKey];
  const spreadSelection = selections[spreadKey];
  const ouSelection = selections[ouKey];

  const hasSelections = mlSelection || spreadSelection || ouSelection;
  const selectionCount = [mlSelection, spreadSelection, ouSelection].filter(Boolean).length;

  // Determine favorite for display
  const homeFavorite = event.home_moneyline < event.away_moneyline;
  const favoriteTeam = homeFavorite ? event.home_team_id : event.away_team_id;
  const favoriteOdds = homeFavorite ? event.home_moneyline : event.away_moneyline;

  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${hasSelections ? 'border-primary/30 bg-primary/5' : ''}`}
      onClick={() => !disabled && onCardClick()}
    >
      <CardContent className="p-0">
        <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {format(new Date(event.start_date), "EEE, MMM d • h:mm a")}
          </span>
          <div className="flex items-center gap-2">
            {disabled && <Lock className="h-3 w-3 text-muted-foreground" />}
            <Badge variant="outline" className="text-xs">NFL</Badge>
          </div>
        </div>
        
        <div className="p-4">
          {/* Matchup */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                  {getTeamAbbreviation(event.away_team_id)}
                </div>
                <span className="text-muted-foreground text-xs sm:text-sm">@</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                  {getTeamAbbreviation(event.home_team_id)}
                </div>
              </div>
              <div className="text-xs sm:text-sm truncate">
                <span className="font-medium">{formatTeamName(event.away_team_id)}</span>
                <span className="text-muted-foreground"> @ </span>
                <span className="font-medium">{formatTeamName(event.home_team_id)}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </div>

          {/* Odds Summary */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <div>
              <span className="uppercase">Fav: </span>
              <span className="font-mono font-medium text-foreground">
                {getTeamAbbreviation(favoriteTeam)} {formatMoneyline(favoriteOdds)}
              </span>
            </div>
            {event.home_spread_value != null && (
              <div>
                <span className="uppercase">Spread: </span>
                <span className="font-mono font-medium text-foreground">
                  {formatSpread(event.home_spread_value)}
                </span>
              </div>
            )}
            {event.ou_value != null && (
              <div>
                <span className="uppercase">O/U: </span>
                <span className="font-mono font-medium text-foreground">
                  {formatTotal(event.ou_value)}
                </span>
              </div>
            )}
          </div>

          {/* User Selections */}
          {hasSelections && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Your picks:</span>
              {mlSelection && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {formatBetTypeBadge('moneyline')} {getTeamAbbreviation(mlSelection.selection)}
                </Badge>
              )}
              {spreadSelection && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {formatBetTypeBadge('spread')} {getTeamAbbreviation(spreadSelection.selection)}
                </Badge>
              )}
              {ouSelection && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {formatBetTypeBadge('over_under')} {ouSelection.selection.toUpperCase()}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
