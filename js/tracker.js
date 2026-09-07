/**
 * PROGRESS — Personal Habit & Growth Tracker
 * tracker.js — Spreadsheet-Style Monthly Habit Tracker, Sticky UX, Week Groupings & Reflections
 */

import { toggleHabitLog, getLogsForMonth, getMonthlyNote, saveMonthlyNote } from './db.js';
import {
  WEEKDAYS_SHORT,
  MONTH_NAMES,
  getDaysInMonth,
  getTodayString,
  parseDateString,
  formatDateToString,
  isHabitScheduledOnDate,
  getMonthlyStats,
  getWeeklyStats
} from './stats.js';
import { openHabitDetail } from './habits.js';
import { showSaving, showSaved, showToast } from './settings.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1-12
let reflectionDebounceTimer = null;

export function getSelectedYearMonth() {
  return { year: currentYear, month: currentMonth };
}

export function setSelectedYearMonth(year, month) {
  currentYear = year;
  currentMonth = month;
}

/**
 * Initializes Month Navigation controls
 */
export function initMonthNavigator(onMonthChangeCallback) {
  const prevBtn = document.getElementById('btn-prev-month');
  const nextBtn = document.getElementById('btn-next-month');
  const todayBtn = document.getElementById('btn-month-today');
  const monthSelect = document.getElementById('select-month');
  const yearSelect = document.getElementById('select-year');

  if (monthSelect) {
    monthSelect.innerHTML = MONTH_NAMES.map((name, idx) => `
      <option value="${idx + 1}">${name}</option>
    `).join('');
    monthSelect.value = currentMonth;
  }

  if (yearSelect) {
    const startYear = 2023;
    const endYear = 2030;
    let options = '';
    for (let y = startYear; y <= endYear; y++) {
      options += `<option value="${y}">${y}</option>`;
    }
    yearSelect.innerHTML = options;
    yearSelect.value = currentYear;
  }

  const update = () => {
    if (monthSelect) monthSelect.value = currentMonth;
    if (yearSelect) yearSelect.value = currentYear;
    if (onMonthChangeCallback) onMonthChangeCallback();
  };

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      update();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      update();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth() + 1;
      update();
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      currentMonth = Number(monthSelect.value);
      if (onMonthChangeCallback) onMonthChangeCallback();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      currentYear = Number(yearSelect.value);
      if (onMonthChangeCallback) onMonthChangeCallback();
    });
  }
}

/**
 * Main Render Function for Monthly Tracker Table
 */
export async function renderMonthlyTracker(tableContainer, habits, onDataChangeCallback) {
  if (!tableContainer) return;

  const todayStr = getTodayString();
  const today = parseDateString(todayStr);
  const isCurrentMonth = (currentYear === today.getFullYear() && currentMonth === (today.getMonth() + 1));
  const currentDayNum = today.getDate();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  // Fetch logs for this month
  const { map: logsMap } = await getLogsForMonth(currentYear, currentMonth);

  const activeHabits = habits.filter(h => !h.archived);

  if (activeHabits.length === 0) {
    tableContainer.innerHTML = `
      <div class="empty-state-card" style="padding: 40px 20px; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 12px;">No active habits found.</p>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Add a habit using the "+ Add Habit" button above to start tracking.</p>
      </div>
    `;
    return;
  }

  // Calculate weeks groupings for header:
  // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22-28, Week 5: 29-daysInMonth
  const weekSpans = [
    { label: 'Week 1', start: 1, end: 7, colorClass: 'week-1-header' },
    { label: 'Week 2', start: 8, end: 14, colorClass: 'week-2-header' },
    { label: 'Week 3', start: 15, end: 21, colorClass: 'week-3-header' },
    { label: 'Week 4', start: 22, end: 28, colorClass: 'week-4-header' }
  ];
  if (daysInMonth >= 29) {
    weekSpans.push({ label: 'Week 5', start: 29, end: daysInMonth, colorClass: 'week-5-header' });
  }

  // Build the spreadsheet HTML
  let tableHtml = `
    <div class="tracker-table-wrapper">
      <table class="tracker-table">
        <thead>
          <!-- Top Row: Habit Header + Week Grouping Banners -->
          <tr class="header-weeks-row">
            <th class="sticky-col header-habit-meta" rowspan="2">
              <div class="habit-meta-th">
                <span>HABIT</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">GOAL</span>
              </div>
            </th>
            ${weekSpans.map(w => {
              const spanLen = Math.min(w.end, daysInMonth) - w.start + 1;
              return `<th class="header-week-group ${w.colorClass}" colspan="${spanLen}">${w.label}</th>`;
            }).join('')}
            <th class="sticky-col-right header-progress-col" rowspan="2">
              <span>PROGRESS</span>
            </th>
          </tr>

          <!-- Bottom Row: Day Numbers (1-31) + Weekday Names -->
          <tr class="header-days-row">
  `;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth - 1, d);
    const dayOfWeek = dateObj.getDay();
    const weekdayStr = WEEKDAYS_SHORT[dayOfWeek];
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isToday = isCurrentMonth && (d === currentDayNum);
    const isFuture = isCurrentMonth ? (d > currentDayNum) : (currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > (today.getMonth() + 1)));

    let cellClasses = ['tracker-th-day'];
    if (isToday) cellClasses.push('is-today');
    if (isWeekend) cellClasses.push('is-weekend');
    if (isFuture) cellClasses.push('is-future');

    tableHtml += `
      <th class="${cellClasses.join(' ')}" title="${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')} (${weekdayStr})">
        <div class="day-header-content">
          <span class="day-num">${d}</span>
          <span class="day-weekday">${weekdayStr}</span>
        </div>
      </th>
    `;
  }

  tableHtml += `
          </tr>
        </thead>
        <tbody>
  `;

  // Rows for each habit
  activeHabits.forEach(habit => {
    let habitScheduledCount = 0;
    let habitCompletedCount = 0;

    tableHtml += `
      <tr class="tracker-habit-row" data-habit-id="${habit.id}">
        <!-- Sticky Habit Name Column -->
        <td class="sticky-col tracker-habit-name-cell" title="Click to view details">
          <div class="habit-cell-wrapper" data-habit-id="${habit.id}">
            <span class="habit-cell-emoji">${habit.emoji || '🎯'}</span>
            <div class="habit-cell-info">
              <span class="habit-cell-name">${habit.name}</span>
              <span class="habit-cell-category">${habit.category}</span>
            </div>
            <span class="habit-cell-goal">${habit.weeklyGoal || 7}/w</span>
          </div>
        </td>
    `;

    // 1 to daysInMonth cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isScheduled = isHabitScheduledOnDate(habit, dateStr);
      const isDone = Boolean(logsMap[`${habit.id}_${dateStr}`]);
      const isToday = isCurrentMonth && (d === currentDayNum);
      const isFuture = isCurrentMonth ? (d > currentDayNum) : (currentYear > today.getFullYear() || (currentYear === today.getFullYear() && currentMonth > (today.getMonth() + 1)));
      const isPastOrToday = !isFuture;

      if (isScheduled) {
        if (isPastOrToday) habitScheduledCount++;
        if (isDone) habitCompletedCount++;
      }

      let cellClass = ['tracker-day-cell'];
      if (!isScheduled) cellClass.push('cell-unscheduled');
      if (isToday) cellClass.push('cell-today');
      if (isFuture) cellClass.push('cell-future');
      if (isDone) cellClass.push('cell-completed');

      tableHtml += `
        <td
          class="${cellClass.join(' ')}"
          data-habit-id="${habit.id}"
          data-date="${dateStr}"
          data-scheduled="${isScheduled}"
          title="${habit.name} - ${dateStr}${!isScheduled ? ' (Not scheduled)' : isDone ? ' (Completed)' : ''}"
        >
          ${isScheduled ? `
            <button
              type="button"
              class="tracker-check-btn ${isDone ? 'checked' : ''}"
              aria-label="${habit.name} on ${dateStr}"
            >
              ${isDone ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ` : ''}
            </button>
          ` : `
            <span class="unscheduled-dot">•</span>
          `}
        </td>
      `;
    }

    // Right Column: Progress %
    const habitPercent = habitScheduledCount > 0 
      ? Math.round((habitCompletedCount / habitScheduledCount) * 100) 
      : 0;
    const color = habitPercent >= 80 ? 'var(--accent-green)' : habitPercent >= 50 ? 'var(--accent-primary)' : 'var(--accent-amber)';

    tableHtml += `
        <td class="sticky-col-right tracker-progress-cell">
          <div class="row-progress-wrapper">
            <div class="row-progress-bar">
              <div class="row-progress-fill" style="width: ${habitPercent}%; background: ${color};"></div>
            </div>
            <span class="row-progress-text" style="color: ${color}; font-weight: 700;">${habitPercent}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  tableHtml += `
        </tbody>
      </table>
    </div>
  `;

  tableContainer.innerHTML = tableHtml;

  // Add event listeners for Habit cell clicks -> Open Detail Modal
  tableContainer.querySelectorAll('.habit-cell-wrapper').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const habitId = el.dataset.habitId;
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        openHabitDetail(habit, onDataChangeCallback);
      }
    });
  });

  // Add event listeners for Checkbox cell toggle
  tableContainer.querySelectorAll('.tracker-day-cell').forEach(td => {
    const btn = td.querySelector('.tracker-check-btn');
    if (!btn) return;

    td.addEventListener('click', async (e) => {
      const habitId = td.dataset.habitId;
      const dateStr = td.dataset.date;
      if (!habitId || !dateStr) return;

      // Optimistic UI toggle
      const wasChecked = btn.classList.contains('checked');
      if (wasChecked) {
        btn.classList.remove('checked');
        btn.innerHTML = '';
        td.classList.remove('cell-completed');
      } else {
        btn.classList.add('checked');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        td.classList.add('cell-completed');
      }

      showSaving();
      try {
        await toggleHabitLog(habitId, dateStr);
        showSaved();
        if (onDataChangeCallback) onDataChangeCallback();
      } catch (err) {
        console.error('Error toggling habit:', err);
        showToast('Could not save check: ' + err.message, 'error');
        // Rollback
        if (wasChecked) {
          btn.classList.add('checked');
          td.classList.add('cell-completed');
        } else {
          btn.classList.remove('checked');
          td.classList.remove('cell-completed');
        }
      }
    });
  });

  // Render Weekly Progress & Monthly Reflection
  await renderWeeklyProgressSection(habits, logsMap);
  await renderMonthlyReflectionSection();
}

/**
 * Renders the 5-Week Progress Cards directly underneath the monthly tracker
 */
export async function renderWeeklyProgressSection(habits, logsMap) {
  const container = document.getElementById('weekly-progress-cards');
  if (!container) return;

  const weeklyStats = getWeeklyStats(currentYear, currentMonth, habits, logsMap);

  container.innerHTML = weeklyStats.map(w => {
    if (!w.active) {
      return `
        <div class="card week-progress-card inactive">
          <div class="week-card-title">${w.label}</div>
          <div class="week-card-range">Days ${w.dateRange}</div>
          <div class="week-card-empty">—</div>
        </div>
      `;
    }

    const color = w.rate >= 80 ? 'var(--accent-green)' : w.rate >= 50 ? 'var(--accent-primary)' : 'var(--accent-amber)';

    return `
      <div class="card week-progress-card">
        <div class="week-card-header">
          <span class="week-card-title">${w.label}</span>
          <span class="week-card-range">Days ${w.dateRange}</span>
        </div>
        <div class="week-card-body">
          <div class="week-card-rate" style="color: ${color};">${w.rate}%</div>
          <div class="week-card-count">${w.completed} / ${w.scheduled} done</div>
        </div>
        <div class="progress-bar-track" style="margin-top: 10px; height: 6px;">
          <div class="progress-bar-fill" style="width: ${w.rate}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders Monthly Reflection Section with 5 auto-saving fields
 */
export async function renderMonthlyReflectionSection() {
  const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const noteData = await getMonthlyNote(yearMonth);

  const wentWellInput = document.getElementById('reflection-went-well');
  const needsImprovementInput = document.getElementById('reflection-needs-improvement');
  const biggestWinInput = document.getElementById('reflection-biggest-win');
  const nextFocusInput = document.getElementById('reflection-next-focus');
  const generalNotesInput = document.getElementById('reflection-general-notes');
  const monthTitle = document.getElementById('reflection-month-title');

  if (monthTitle) {
    monthTitle.textContent = `${MONTH_NAMES[currentMonth - 1]} ${currentYear} Reflection`;
  }

  if (wentWellInput) wentWellInput.value = noteData.wentWell || '';
  if (needsImprovementInput) needsImprovementInput.value = noteData.needsImprovement || '';
  if (biggestWinInput) biggestWinInput.value = noteData.biggestWin || '';
  if (nextFocusInput) nextFocusInput.value = noteData.nextFocus || '';
  if (generalNotesInput) generalNotesInput.value = noteData.generalNotes || '';

  const saveReflections = () => {
    if (reflectionDebounceTimer) clearTimeout(reflectionDebounceTimer);
    showSaving();

    reflectionDebounceTimer = setTimeout(async () => {
      const data = {
        wentWell: wentWellInput ? wentWellInput.value : '',
        needsImprovement: needsImprovementInput ? needsImprovementInput.value : '',
        biggestWin: biggestWinInput ? biggestWinInput.value : '',
        nextFocus: nextFocusInput ? nextFocusInput.value : '',
        generalNotes: generalNotesInput ? generalNotesInput.value : ''
      };
      await saveMonthlyNote(yearMonth, data);
      showSaved();
    }, 400);
  };

  [wentWellInput, needsImprovementInput, biggestWinInput, nextFocusInput, generalNotesInput].forEach(el => {
    if (el) {
      el.removeEventListener('input', saveReflections);
      el.addEventListener('input', saveReflections);
    }
  });
}
