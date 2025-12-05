import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekNavigationProps {
  currentWeek: number;
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  weekDateRange?: string;
}

export const WeekNavigation = ({
  currentWeek,
  selectedWeek,
  onWeekChange,
  weekDateRange,
}: WeekNavigationProps) => {
  const canGoPrev = selectedWeek > 1;
  const canGoNext = selectedWeek < currentWeek;

  const handlePrev = () => {
    if (canGoPrev) {
      onWeekChange(selectedWeek - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onWeekChange(selectedWeek + 1);
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrev}
        disabled={!canGoPrev}
        className="h-8 w-8 shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-center min-w-[100px] sm:min-w-[140px]">
        <p className="font-medium text-sm sm:text-base">Week {selectedWeek}</p>
        {weekDateRange && (
          <p className="text-xs text-muted-foreground">{weekDateRange}</p>
        )}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={!canGoNext}
        className="h-8 w-8 shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
