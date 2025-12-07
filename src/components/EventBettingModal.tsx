import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check } from "lucide-react";
import { formatTeamName, formatMoneyline, getTeamAbbreviation, formatSpread, formatTotal } from "@/lib/teamUtils";
import { format } from "date-fns";

interface Event {
  id: number;
  event_id: string;
  home_team_id: string;
  away_team_id: string;
  home_moneyline: number;
  away_moneyline: number;
  home_spread_value: number | null;
  home_spread_odds: number | null;
  away_spread_odds: number | null;
  ou_value: number | null;
  ou_over_odds: number | null;
  ou_under_odds: number | null;
  start_date: string;
}

export interface BetSelection {
  eventId: string;
  betType: 'moneyline' | 'spread' | 'over_under';
  selection: string; // team_id for ML/spread, 'over'/'under' for O/U
  line: number;
  homeTeamId: string;
  awayTeamId: string;
  spreadValue?: number;
  totalValue?: number;
}

interface EventBettingModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selections: Record<string, BetSelection>;
  onSelectBet: (selection: BetSelection) => void;
  onRemoveBet: (key: string) => void;
  totalPickCount: number;
  maxPicks: number;
}

export const EventBettingModal = ({
  event,
  open,
  onOpenChange,
  selections,
  onSelectBet,
  onRemoveBet,
  totalPickCount,
  maxPicks,
}: EventBettingModalProps) => {
  if (!event) return null;

  const getSelectionKey = (eventId: string, betType: string) => `${eventId}-${betType}`;

  const mlKey = getSelectionKey(event.event_id, 'moneyline');
  const spreadKey = getSelectionKey(event.event_id, 'spread');
  const ouKey = getSelectionKey(event.event_id, 'over_under');

  const mlSelection = selections[mlKey];
  const spreadSelection = selections[spreadKey];
  const ouSelection = selections[ouKey];

  // Count selections for this event
  const eventSelectionCount = [mlSelection, spreadSelection, ouSelection].filter(Boolean).length;
  const canAddMore = totalPickCount < maxPicks || eventSelectionCount > 0;

  const handleMoneylineSelect = (teamId: string, line: number) => {
    if (mlSelection?.selection === teamId) {
      onRemoveBet(mlKey);
    } else if (totalPickCount < maxPicks || mlSelection) {
      onSelectBet({
        eventId: event.event_id,
        betType: 'moneyline',
        selection: teamId,
        line,
        homeTeamId: event.home_team_id,
        awayTeamId: event.away_team_id,
      });
    }
  };

  const handleSpreadSelect = (teamId: string, spreadValue: number, odds: number) => {
    if (spreadSelection?.selection === teamId) {
      onRemoveBet(spreadKey);
    } else if (totalPickCount < maxPicks || spreadSelection) {
      onSelectBet({
        eventId: event.event_id,
        betType: 'spread',
        selection: teamId,
        line: odds,
        homeTeamId: event.home_team_id,
        awayTeamId: event.away_team_id,
        spreadValue,
      });
    }
  };

  const handleOUSelect = (isOver: boolean, odds: number) => {
    const selection = isOver ? 'over' : 'under';
    if (ouSelection?.selection === selection) {
      onRemoveBet(ouKey);
    } else if (totalPickCount < maxPicks || ouSelection) {
      onSelectBet({
        eventId: event.event_id,
        betType: 'over_under',
        selection,
        line: odds,
        homeTeamId: event.home_team_id,
        awayTeamId: event.away_team_id,
        totalValue: event.ou_value || 0,
      });
    }
  };

  const hasSpreadData = event.home_spread_value !== null && event.home_spread_odds !== null;
  const hasOUData = event.ou_value !== null && event.ou_over_odds !== null;

  // Calculate away spread (inverse of home spread)
  const awaySpreadValue = event.home_spread_value !== null ? -event.home_spread_value : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-3 text-lg">
              <span>{getTeamAbbreviation(event.away_team_id)}</span>
              <span className="text-muted-foreground">@</span>
              <span>{getTeamAbbreviation(event.home_team_id)}</span>
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              {format(new Date(event.start_date), "EEE, MMM d • h:mm a")}
            </p>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Moneyline Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold">Moneyline</h3>
              <Badge variant="outline" className="text-xs">ML</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={mlSelection?.selection === event.away_team_id ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => handleMoneylineSelect(event.away_team_id, event.away_moneyline)}
                disabled={!canAddMore && !mlSelection}
              >
                <span className="font-medium">{getTeamAbbreviation(event.away_team_id)}</span>
                <span className={`font-mono text-sm ${event.away_moneyline > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatMoneyline(event.away_moneyline)}
                </span>
                {mlSelection?.selection === event.away_team_id && <Check className="h-4 w-4 mt-1" />}
              </Button>
              <Button
                variant={mlSelection?.selection === event.home_team_id ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => handleMoneylineSelect(event.home_team_id, event.home_moneyline)}
                disabled={!canAddMore && !mlSelection}
              >
                <span className="font-medium">{getTeamAbbreviation(event.home_team_id)}</span>
                <span className={`font-mono text-sm ${event.home_moneyline > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatMoneyline(event.home_moneyline)}
                </span>
                {mlSelection?.selection === event.home_team_id && <Check className="h-4 w-4 mt-1" />}
              </Button>
            </div>
          </div>

          {/* Spread Section */}
          {hasSpreadData && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Spread</h3>
                  <Badge variant="outline" className="text-xs">SPR</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={spreadSelection?.selection === event.away_team_id ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleSpreadSelect(event.away_team_id, awaySpreadValue!, event.away_spread_odds!)}
                    disabled={!canAddMore && !spreadSelection}
                  >
                    <span className="font-medium">{getTeamAbbreviation(event.away_team_id)}</span>
                    <span className="font-mono text-sm">{formatSpread(awaySpreadValue!)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({formatMoneyline(event.away_spread_odds!)})
                    </span>
                    {spreadSelection?.selection === event.away_team_id && <Check className="h-4 w-4 mt-1" />}
                  </Button>
                  <Button
                    variant={spreadSelection?.selection === event.home_team_id ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleSpreadSelect(event.home_team_id, event.home_spread_value!, event.home_spread_odds!)}
                    disabled={!canAddMore && !spreadSelection}
                  >
                    <span className="font-medium">{getTeamAbbreviation(event.home_team_id)}</span>
                    <span className="font-mono text-sm">{formatSpread(event.home_spread_value!)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({formatMoneyline(event.home_spread_odds!)})
                    </span>
                    {spreadSelection?.selection === event.home_team_id && <Check className="h-4 w-4 mt-1" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Over/Under Section */}
          {hasOUData && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Total</h3>
                  <Badge variant="outline" className="text-xs">O/U {formatTotal(event.ou_value!)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={ouSelection?.selection === 'over' ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleOUSelect(true, event.ou_over_odds!)}
                    disabled={!canAddMore && !ouSelection}
                  >
                    <span className="font-medium">OVER</span>
                    <span className="font-mono text-sm">{formatTotal(event.ou_value!)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({formatMoneyline(event.ou_over_odds!)})
                    </span>
                    {ouSelection?.selection === 'over' && <Check className="h-4 w-4 mt-1" />}
                  </Button>
                  <Button
                    variant={ouSelection?.selection === 'under' ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handleOUSelect(false, event.ou_under_odds!)}
                    disabled={!canAddMore && !ouSelection}
                  >
                    <span className="font-medium">UNDER</span>
                    <span className="font-mono text-sm">{formatTotal(event.ou_value!)}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({formatMoneyline(event.ou_under_odds!)})
                    </span>
                    {ouSelection?.selection === 'under' && <Check className="h-4 w-4 mt-1" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with selection summary */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Picks from this game: </span>
              <span className="font-medium">{eventSelectionCount}</span>
            </div>
            <Badge variant={totalPickCount >= maxPicks ? "destructive" : "secondary"}>
              {totalPickCount}/{maxPicks} total
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
