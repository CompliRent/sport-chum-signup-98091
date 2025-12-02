import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTeamName, formatMoneyline, getTeamAbbreviation } from "@/lib/teamUtils";
import { format } from "date-fns";
import { Check, Lock } from "lucide-react";

interface Event {
  id: number;
  event_id: string;
  home_team_id: string;
  away_team_id: string;
  home_moneyline: number;
  away_moneyline: number;
  start_date: string;
}

interface EventCardProps {
  event: Event;
  selectedTeam: string | null;
  onSelectTeam: (eventId: string, teamId: string, line: number) => void;
  disabled?: boolean;
}

export const EventCard = ({ event, selectedTeam, onSelectTeam, disabled = false }: EventCardProps) => {
  const isHomeSelected = selectedTeam === event.home_team_id;
  const isAwaySelected = selectedTeam === event.away_team_id;
  const isLocked = disabled && !selectedTeam;

  return (
    <Card className={`overflow-hidden ${isLocked ? 'opacity-50' : ''}`}>
      <CardContent className="p-0">
        <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {format(new Date(event.start_date), "EEE, MMM d • h:mm a")}
          </span>
          <div className="flex items-center gap-2">
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
            <Badge variant="outline" className="text-xs">NFL</Badge>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Away Team */}
          <Button
            variant={isAwaySelected ? "default" : "outline"}
            className="w-full justify-between h-auto py-3"
            onClick={() => !disabled && onSelectTeam(event.event_id, event.away_team_id, event.away_moneyline)}
            disabled={isLocked}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                {getTeamAbbreviation(event.away_team_id)}
              </div>
              <span className="font-medium">{formatTeamName(event.away_team_id)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${event.away_moneyline > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatMoneyline(event.away_moneyline)}
              </span>
              {isAwaySelected && <Check className="h-4 w-4" />}
            </div>
          </Button>

          <div className="text-center text-xs text-muted-foreground">@</div>

          {/* Home Team */}
          <Button
            variant={isHomeSelected ? "default" : "outline"}
            className="w-full justify-between h-auto py-3"
            onClick={() => !disabled && onSelectTeam(event.event_id, event.home_team_id, event.home_moneyline)}
            disabled={isLocked}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                {getTeamAbbreviation(event.home_team_id)}
              </div>
              <span className="font-medium">{formatTeamName(event.home_team_id)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${event.home_moneyline > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatMoneyline(event.home_moneyline)}
              </span>
              {isHomeSelected && <Check className="h-4 w-4" />}
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
