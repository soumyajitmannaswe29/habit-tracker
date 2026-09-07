/**
 * PROGRESS — Personal Habit & Growth Tracker
 * stats.js — Accurate Streak Engine & Statistical Calculations
 */

import { getLogKey } from './db.js';

export const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Helper to get days in month (handling leap years)
 */
export function getDaysInMonth(year, month) {
  // month is 1-12
  return new Date(year, month, 0).getDate();
}

/**
 * Parses YYYY-MM-DD string to local Date object (midnight)
 */
export function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD string in local time
 */
export function formatDateToString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Checks if a habit is scheduled on a given date
 */
export function isHabitScheduledOnDate(habit, dateStr) {
  if (!habit) return false;
  // If habit has a start date and dateStr is before start date, not scheduled
  if (habit.startDate && dateStr < habit.startDate) return false;

  const targetDays = habit.targetDays || [0, 1, 2, 3, 4, 5, 6];
  const date = parseDateString(dateStr);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  return targetDays.includes(dayOfWeek);
}

/**
 * Calculate streak for a specific habit
 * Accurately handles:
 * - Unscheduled days (does not break streak)
 * - Future days (never counts as failure)
 * - Today (if today is scheduled & not done, streak is maintained from last scheduled day)
 */
export function calculateHabitStreak(habit, logsMap, todayStr = getTodayString()) {
  if (!habit || habit.archived) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const startDateStr = habit.startDate || '2020-01-01';
  const targetDays = habit.targetDays || [0, 1, 2, 3, 4, 5, 6];

  // 1. Calculate Current Streak
  let currentStreak = 0;
  const today = parseDateString(todayStr);
  const isTodayScheduled = isHabitScheduledOnDate(habit, todayStr);
  const todayKey = getLogKey(habit.id, todayStr);
  const isTodayCompleted = Boolean(logsMap[todayKey]);

  let checkDate = new Date(today);

  if (isTodayScheduled) {
    if (isTodayCompleted) {
      currentStreak = 1;
      // move checkDate back by 1 day to check preceding days
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Today is scheduled but not yet completed. Streak is not broken yet!
      // Check from yesterday backwards
      checkDate.setDate(checkDate.getDate() - 1);
    }
  } else {
    // Today is not scheduled, start checking backwards from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Walk backwards day by day until start date or max limit (3650 days)
  const minDate = parseDateString(startDateStr);
  let daysWalked = 0;

  while (checkDate >= minDate && daysWalked < 3650) {
    daysWalked++;
    const curStr = formatDateToString(checkDate);
    const dayOfWeek = checkDate.getDay();

    if (targetDays.includes(dayOfWeek)) {
      const key = getLogKey(habit.id, curStr);
      if (logsMap[key]) {
        currentStreak++;
      } else {
        // Scheduled day was missed -> current streak ends here
        break;
      }
    }
    // If not scheduled, continue walking back without breaking streak
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 2. Calculate Longest Streak historically
  // To calculate longest streak accurately, walk from startDate up to today
  let longestStreak = 0;
  let runningStreak = 0;

  let walkDate = new Date(minDate);
  const endDate = new Date(today);

  while (walkDate <= endDate) {
    const curStr = formatDateToString(walkDate);
    const dayOfWeek = walkDate.getDay();

    if (targetDays.includes(dayOfWeek)) {
      const key = getLogKey(habit.id, curStr);
      if (logsMap[key]) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        // Only break if this is in the past (before today), or today if not completed
        // For today, if today is not completed, runningStreak doesn't become 0 unless today is completed or not checked
        if (curStr < todayStr) {
          runningStreak = 0;
        }
      }
    }

    walkDate.setDate(walkDate.getDate() + 1);
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculates daily stats for a specific date
 */
export function getDailyStats(dateStr, habits, logsMap) {
  const activeHabits = habits.filter(h => !h.archived);
  let scheduledCount = 0;
  let completedCount = 0;

  activeHabits.forEach(habit => {
    if (isHabitScheduledOnDate(habit, dateStr)) {
      scheduledCount++;
      const key = getLogKey(habit.id, dateStr);
      if (logsMap[key]) {
        completedCount++;
      }
    }
  });

  const rate = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;

  return {
    dateStr,
    scheduledCount,
    completedCount,
    remainingCount: Math.max(0, scheduledCount - completedCount),
    rate
  };
}

/**
 * Calculates monthly statistics for the given year and month (1-12)
 * Handles future days so they do not artificially depress completion %!
 */
export function getMonthlyStats(year, month, habits, logsMap, todayStr = getTodayString()) {
  const daysInMonth = getDaysInMonth(year, month);
  const activeHabits = habits.filter(h => !h.archived);
  const today = parseDateString(todayStr);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // Determine which days in this month are evaluated:
  // Past months: all days 1..daysInMonth
  // Current month: days 1..currentDay
  // Future months: 0 days
  let evaluatedDays = daysInMonth;
  const isCurrentMonth = (year === currentYear && month === currentMonth);
  const isFutureMonth = (year > currentYear || (year === currentYear && month > currentMonth));

  if (isFutureMonth) {
    evaluatedDays = 0;
  } else if (isCurrentMonth) {
    evaluatedDays = Math.min(currentDay, daysInMonth);
  }

  let totalScheduledInstances = 0;
  let totalCompletions = 0;
  let totalMissedInstances = 0;

  // Per habit performance in this month
  const habitStats = activeHabits.map(habit => {
    let habitScheduled = 0;
    let habitCompleted = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isScheduled = isHabitScheduledOnDate(habit, dateStr);
      const isDone = Boolean(logsMap[getLogKey(habit.id, dateStr)]);

      if (isScheduled) {
        // Count for completion regardless
        if (isDone) habitCompleted++;

        // Only count towards denominator if within evaluated range
        if (d <= evaluatedDays) {
          habitScheduled++;
        }
      }
    }

    const habitRate = habitScheduled > 0 ? Math.round((habitCompleted / habitScheduled) * 100) : 0;
    totalScheduledInstances += habitScheduled;
    totalCompletions += habitCompleted;
    totalMissedInstances += Math.max(0, habitScheduled - habitCompleted);

    return {
      habit,
      scheduled: habitScheduled,
      completed: habitCompleted,
      rate: habitRate
    };
  });

  const overallRate = totalScheduledInstances > 0 
    ? Math.round((totalCompletions / totalScheduledInstances) * 100) 
    : 0;

  // Sort to find best habit and habit needing attention
  const habitsWithScheduled = habitStats.filter(hs => hs.scheduled > 0);
  habitsWithScheduled.sort((a, b) => b.rate - a.rate);

  const bestHabit = habitsWithScheduled.length > 0 ? habitsWithScheduled[0] : null;
  const needingAttention = habitsWithScheduled.length > 1 ? habitsWithScheduled[habitsWithScheduled.length - 1] : null;

  return {
    year,
    month,
    daysInMonth,
    evaluatedDays,
    totalScheduledInstances,
    totalCompletions,
    totalMissedInstances,
    overallRate,
    habitStats,
    bestHabit,
    needingAttention
  };
}

/**
 * Calculates 5-week breakdown for the given month
 */
export function getWeeklyStats(year, month, habits, logsMap, todayStr = getTodayString()) {
  const daysInMonth = getDaysInMonth(year, month);
  const activeHabits = habits.filter(h => !h.archived);
  const today = parseDateString(todayStr);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const isCurrentMonth = (year === currentYear && month === currentMonth);
  const isFutureMonth = (year > currentYear || (year === currentYear && month > currentMonth));

  const weekRanges = [
    { weekIndex: 1, start: 1, end: 7, label: 'Week 1' },
    { weekIndex: 2, start: 8, end: 14, label: 'Week 2' },
    { weekIndex: 3, start: 15, end: 21, label: 'Week 3' },
    { weekIndex: 4, start: 22, end: 28, label: 'Week 4' },
    { weekIndex: 5, start: 29, end: daysInMonth, label: 'Week 5' }
  ];

  return weekRanges.map(w => {
    // If month has fewer than 29 days (e.g. Feb 28), Week 5 has 0 days
    if (w.start > daysInMonth) {
      return {
        ...w,
        dateRange: 'N/A',
        scheduled: 0,
        completed: 0,
        rate: 0,
        active: false
      };
    }

    const actualEnd = Math.min(w.end, daysInMonth);
    let scheduled = 0;
    let completed = 0;

    for (let d = w.start; d <= actualEnd; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPastOrToday = !isFutureMonth && (!isCurrentMonth || d <= currentDay);

      activeHabits.forEach(habit => {
        if (isHabitScheduledOnDate(habit, dateStr)) {
          if (isPastOrToday) {
            scheduled++;
          }
          if (logsMap[getLogKey(habit.id, dateStr)]) {
            completed++;
          }
        }
      });
    }

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

    return {
      ...w,
      dateRange: `${w.start}–${actualEnd}`,
      scheduled,
      completed,
      rate,
      active: true
    };
  });
}

/**
 * Calculates current calendar week (Monday to Sunday) progress
 */
export function getCurrentWeekProgress(habits, logsMap, todayStr = getTodayString()) {
  const today = parseDateString(todayStr);
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
  // Calculate distance to Monday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  let scheduled = 0;
  let completed = 0;

  for (let i = 0; i <= distanceToMonday; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = formatDateToString(curDate);

    habits.filter(h => !h.archived).forEach(habit => {
      if (isHabitScheduledOnDate(habit, dateStr)) {
        scheduled++;
        if (logsMap[getLogKey(habit.id, dateStr)]) {
          completed++;
        }
      }
    });
  }

  const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  return { scheduled, completed, rate };
}

/**
 * Calculates overall insights, day-of-week trends, and personal records
 */
export function calculateOverallInsights(habits, allLogs, todayStr = getTodayString()) {
  const activeHabits = habits.filter(h => !h.archived);

  // Map of completed logs
  const logsMap = {};
  allLogs.forEach(l => {
    if (l.completed) logsMap[l.key] = true;
  });

  // 1. Calculate streaks for each habit
  let currentBestStreak = 0;
  let bestStreakHabitName = 'None';
  let lifetimeLongestStreak = 0;

  activeHabits.forEach(habit => {
    const streak = calculateHabitStreak(habit, logsMap, todayStr);
    if (streak.currentStreak > currentBestStreak) {
      currentBestStreak = streak.currentStreak;
      bestStreakHabitName = habit.name;
    }
    if (streak.longestStreak > lifetimeLongestStreak) {
      lifetimeLongestStreak = streak.longestStreak;
    }
  });

  // 2. Day of Week distribution
  const weekdayStats = [0, 1, 2, 3, 4, 5, 6].map(dayIdx => ({
    dayIdx,
    name: WEEKDAYS_SHORT[dayIdx],
    fullName: WEEKDAYS_LONG[dayIdx],
    scheduled: 0,
    completed: 0,
    rate: 0
  }));

  // Analyze last 60 days for weekday consistency
  const today = parseDateString(todayStr);
  const scanLimit = 60;

  for (let i = 0; i < scanLimit; i++) {
    const scanDate = new Date(today);
    scanDate.setDate(today.getDate() - i);
    const dateStr = formatDateToString(scanDate);
    const dayIdx = scanDate.getDay();

    activeHabits.forEach(habit => {
      if (isHabitScheduledOnDate(habit, dateStr)) {
        weekdayStats[dayIdx].scheduled++;
        if (logsMap[getLogKey(habit.id, dateStr)]) {
          weekdayStats[dayIdx].completed++;
        }
      }
    });
  }

  weekdayStats.forEach(ws => {
    ws.rate = ws.scheduled > 0 ? Math.round((ws.completed / ws.scheduled) * 100) : 0;
  });

  const sortedWeekdays = [...weekdayStats].sort((a, b) => b.rate - a.rate);
  const bestDayOfWeek = sortedWeekdays.length > 0 && sortedWeekdays[0].scheduled > 0 
    ? sortedWeekdays[0] 
    : { fullName: 'Every day', rate: 0 };

  // 3. Lifetime completions
  const totalLifetimeCompletions = allLogs.filter(l => l.completed).length;

  // 4. Highest completions in a single day
  const dailyCompletionCounts = {};
  allLogs.filter(l => l.completed).forEach(l => {
    dailyCompletionCounts[l.date] = (dailyCompletionCounts[l.date] || 0) + 1;
  });

  let highestDailyCompletions = 0;
  let highestDate = null;
  Object.entries(dailyCompletionCounts).forEach(([date, count]) => {
    if (count > highestDailyCompletions) {
      highestDailyCompletions = count;
      highestDate = date;
    }
  });

  return {
    currentBestStreak,
    bestStreakHabitName,
    lifetimeLongestStreak,
    totalLifetimeCompletions,
    highestDailyCompletions,
    highestDate,
    weekdayStats,
    bestDayOfWeek
  };
}
