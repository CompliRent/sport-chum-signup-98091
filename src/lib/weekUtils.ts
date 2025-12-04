import { format, startOfDay, differenceInDays, addDays } from "date-fns";

/**
 * Get the Tuesday-based week boundary date for a given date.
 * NFL-style weeks: Tuesday to Monday (games are Sun/Mon, new week starts Tue)
 */
export function getTuesdayWeekStart(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 2 = Tuesday
  // Days since last Tuesday: (day + 7 - 2) % 7
  const daysSinceTuesday = (day + 5) % 7;
  const tuesdayStart = startOfDay(new Date(date));
  tuesdayStart.setDate(tuesdayStart.getDate() - daysSinceTuesday);
  return tuesdayStart;
}

/**
 * Calculate the league-relative week number based on league creation date.
 * Week 1 starts on the first Tuesday on or after the league was created.
 * Uses Tuesday as week boundary to align with NFL-style weeks.
 */
export function getLeagueWeekNumber(leagueCreatedAt: string | Date): number {
  const now = new Date();
  const leagueCreated = new Date(leagueCreatedAt);
  
  // Find the first Tuesday on or after league creation
  const leagueCreatedDay = leagueCreated.getDay();
  const daysUntilTuesday = (2 - leagueCreatedDay + 7) % 7;
  const firstTuesday = startOfDay(new Date(leagueCreated));
  firstTuesday.setDate(firstTuesday.getDate() + daysUntilTuesday);
  
  // Get current week's Tuesday
  const currentWeekTuesday = getTuesdayWeekStart(now);
  
  // Calculate weeks elapsed
  const daysDiff = differenceInDays(currentWeekTuesday, firstTuesday);
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  
  // Ensure minimum of week 1
  return Math.max(1, weekNumber);
}

/**
 * Get the date range for a specific league week.
 * Returns the Tuesday-Monday date range for display.
 */
export function getLeagueWeekDateRange(leagueCreatedAt: string | Date, weekNumber: number): { start: Date; end: Date } {
  const leagueCreated = new Date(leagueCreatedAt);
  
  // Find the first Tuesday on or after league creation
  const leagueCreatedDay = leagueCreated.getDay();
  const daysUntilTuesday = (2 - leagueCreatedDay + 7) % 7;
  const firstTuesday = startOfDay(new Date(leagueCreated));
  firstTuesday.setDate(firstTuesday.getDate() + daysUntilTuesday);
  
  // Calculate start of requested week (weeks are 0-indexed internally)
  const weekStart = addDays(firstTuesday, (weekNumber - 1) * 7);
  const weekEnd = addDays(weekStart, 6); // Monday
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Format the week date range for display.
 * Example: "Dec 3 - Dec 9"
 */
export function formatWeekDateRange(leagueCreatedAt: string | Date, weekNumber: number): string {
  const { start, end } = getLeagueWeekDateRange(leagueCreatedAt, weekNumber);
  const startMonth = format(start, "MMM d");
  const endMonth = format(end, "MMM d");
  return `${startMonth} - ${endMonth}`;
}

/**
 * Get season year based on league week.
 * For simplicity, uses the year of the week's Tuesday.
 */
export function getLeagueSeasonYear(leagueCreatedAt: string | Date, weekNumber: number): number {
  const { start } = getLeagueWeekDateRange(leagueCreatedAt, weekNumber);
  return start.getFullYear();
}
