/**
 * PROGRESS — Personal Habit & Growth Tracker
 * app.js — Main Application Orchestrator, Router & View Controllers
 */

import {
  initDB,
  getAllHabits,
  saveHabit,
  deleteHabit,
  reorderHabits,
  toggleHabitLog,
  getLogsForDate,
  getAllHabitLogs,
  getLogsForMonth,
  getSetting,
  setSetting,
  resetAllData
} from './db.js';

import {
  WEEKDAYS_LONG,
  MONTH_NAMES,
  getTodayString,
  parseDateString,
  formatDateToString,
  isHabitScheduledOnDate,
  calculateHabitStreak,
  getDailyStats,
  getMonthlyStats,
  getWeeklyStats,
  getCurrentWeekProgress,
  calculateOverallInsights
} from './stats.js';

import {
  renderProgressRing,
  renderDailyTrendChart,
  renderWeeklyBarChart,
  renderHabitComparisonChart,
  renderMonthlyTrendChart,
  renderConsistencyHeatmap
} from './charts.js';

import {
  openHabitModal,
  closeHabitModal,
  handleHabitFormSubmit,
  openHabitDetail,
  closeHabitDetail
} from './habits.js';

import {
  renderGoalsSection,
  openGoalModal,
  closeGoalModal,
  handleGoalFormSubmit,
  handleDeleteCurrentGoal
} from './goals.js';

import {
  initMonthNavigator,
  renderMonthlyTracker,
  getSelectedYearMonth,
  setSelectedYearMonth
} from './tracker.js';

import {
  initTheme,
  setTheme,
  showSaving,
  showSaved,
  showToast,
  confirmAction
} from './settings.js';

import {
  exportBackup,
  handleFileImport,
  promptResetData
} from './backup.js';

// Motivational quotes pool
const MOTIVATIONAL_QUOTES = [
  "Small daily disciplines compound into massive life transformations.",
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  "Consistency is the true foundation of greatness.",
  "Focus on the process, not just the prize.",
  "One day at a time. Every checkmark builds your future.",
  "You don't have to be extreme, just consistent."
];

let currentView = 'dashboard';
let deferredInstallPrompt = null;

/**
 * App Entry Point
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initDB();
    await initTheme();
    setupNavigation();
    setupGlobalModals();
    setupPWA();
    initMonthNavigator(() => {
      refreshActiveView();
    });

    // Check onboarding
    await checkOnboarding();

    // Render initial view
    await switchView(currentView);

    // Initial resize listener for responsive charts
    window.addEventListener('resize', debounce(() => {
      if (currentView === 'dashboard' || currentView === 'insights') {
        refreshActiveView();
      }
    }, 250));

  } catch (err) {
    console.error('Fatal initialization error:', err);
    showToast('Failed to initialize application: ' + err.message, 'error');
  }
});

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Onboarding Check
 */
async function checkOnboarding() {
  const hasSeen = await getSetting('hasSeenWelcomeModal');
  if (!hasSeen) {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
      welcomeModal.classList.add('active');

      const btnSample = document.getElementById('welcome-btn-sample');
      const btnFresh = document.getElementById('welcome-btn-fresh');

      if (btnSample) {
        btnSample.onclick = async () => {
          welcomeModal.classList.remove('active');
          await setSetting('hasSeenWelcomeModal', true);
          showToast('Sample habits loaded! Feel free to customize them anytime.', 'success');
          refreshActiveView();
        };
      }

      if (btnFresh) {
        btnFresh.onclick = async () => {
          welcomeModal.classList.remove('active');
          await setSetting('hasSeenWelcomeModal', true);
          // Clear starter habits
          await resetAllData();
          await setSetting('hasSeenWelcomeModal', true);
          showToast('Ready for your custom habits!', 'info');
          refreshActiveView();
          openHabitModal();
        };
      }
    }
  }
}

/**
 * Navigation and View Switcher
 */
function setupNavigation() {
  // Sidebar links
  document.querySelectorAll('[data-view-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.viewTarget;
      switchView(target);
    });
  });

  // Sidebar toggle
  const sidebar = document.getElementById('app-sidebar');
  const sidebarToggle = document.getElementById('btn-toggle-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });

    // Close on backdrop click
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }

  // Quick Action Buttons
  const addHabitBtn = document.getElementById('btn-header-add-habit');
  if (addHabitBtn) {
    addHabitBtn.addEventListener('click', () => openHabitModal());
  }

  // Backup Quick Buttons in Sidebar
  const btnExport = document.getElementById('btn-sidebar-export');
  const btnImport = document.getElementById('btn-sidebar-import');
  const importFileInput = document.getElementById('import-file-input');

  if (btnExport) {
    btnExport.addEventListener('click', () => exportBackup());
  }

  if (btnImport && importFileInput) {
    btnImport.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileImport(e.target.files[0], () => refreshActiveView());
        importFileInput.value = '';
      }
    });
  }
}

export async function switchView(viewName) {
  currentView = viewName;

  // Update nav UI
  document.querySelectorAll('[data-view-target]').forEach(el => {
    if (el.dataset.viewTarget === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Hide all views, show active
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.add('active');
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) sidebar.classList.remove('mobile-open');

  await refreshActiveView();
}

/**
 * Refreshes currently visible view
 */
export async function refreshActiveView() {
  const habits = await getAllHabits();
  const allLogs = await getAllHabitLogs();

  const logsMap = {};
  allLogs.forEach(l => {
    if (l.completed) logsMap[l.key] = true;
  });

  switch (currentView) {
    case 'dashboard':
      await renderDashboardView(habits, logsMap, allLogs);
      break;
    case 'today':
      await renderTodayView(habits, logsMap);
      break;
    case 'tracker':
      await renderTrackerView(habits);
      break;
    case 'goals':
      await renderGoalsView();
      break;
    case 'insights':
      await renderInsightsView(habits, logsMap, allLogs);
      break;
    case 'history':
      await renderHistoryView(habits, allLogs);
      break;
    case 'settings':
      await renderSettingsView();
      break;
  }
}

/* ======================================================
   1. DASHBOARD VIEW
====================================================== */
async function renderDashboardView(habits, logsMap, allLogs) {
  const todayStr = getTodayString();
  const today = parseDateString(todayStr);

  // Dynamic Greeting based on hour
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  const greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) greetingEl.textContent = `${greeting}!`;

  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = today.toLocaleDateString(undefined, options);
  }

  const quoteEl = document.getElementById('dashboard-quote');
  if (quoteEl) {
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    quoteEl.textContent = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }

  // Daily, Weekly, Monthly Stats
  const dailyStats = getDailyStats(todayStr, habits, logsMap);
  const weekProgress = getCurrentWeekProgress(habits, logsMap, todayStr);
  const monthlyStats = getMonthlyStats(today.getFullYear(), today.getMonth() + 1, habits, logsMap, todayStr);
  const insights = calculateOverallInsights(habits, allLogs, todayStr);

  // 1. Progress Rings
  renderProgressRing(document.getElementById('ring-today-progress'), dailyStats.rate, {
    size: 130,
    strokeWidth: 10,
    label: `${dailyStats.rate}%`,
    sublabel: `${dailyStats.completedCount} of ${dailyStats.scheduledCount} done`
  });

  renderProgressRing(document.getElementById('ring-week-progress'), weekProgress.rate, {
    size: 90,
    strokeWidth: 8,
    color: '#06b6d4',
    label: `${weekProgress.rate}%`
  });

  renderProgressRing(document.getElementById('ring-month-progress'), monthlyStats.overallRate, {
    size: 90,
    strokeWidth: 8,
    color: '#10b981',
    label: `${monthlyStats.overallRate}%`
  });

  // 2. Summary Metric Cards
  const streakEl = document.getElementById('dash-stat-streak');
  if (streakEl) streakEl.innerHTML = `🔥 ${insights.currentBestStreak} <small style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">Days (${insights.bestStreakHabitName})</small>`;

  const bestHabitEl = document.getElementById('dash-stat-best-habit');
  if (bestHabitEl) {
    if (monthlyStats.bestHabit) {
      bestHabitEl.innerHTML = `${monthlyStats.bestHabit.habit.emoji || '🎯'} ${monthlyStats.bestHabit.habit.name} <span class="badge" style="font-size: 0.75rem;">${monthlyStats.bestHabit.rate}%</span>`;
    } else {
      bestHabitEl.textContent = 'None yet';
    }
  }

  const totalCompletionsEl = document.getElementById('dash-stat-total-completions');
  if (totalCompletionsEl) totalCompletionsEl.textContent = insights.totalLifetimeCompletions;

  const activeHabitsEl = document.getElementById('dash-stat-active-habits');
  if (activeHabitsEl) activeHabitsEl.textContent = habits.filter(h => !h.archived).length;

  // 3. Today's Habits Quick Checklist on Dashboard
  const todayContainer = document.getElementById('dashboard-today-list');
  if (todayContainer) {
    const todayHabits = habits.filter(h => !h.archived && isHabitScheduledOnDate(h, todayStr));
    if (todayHabits.length === 0) {
      todayContainer.innerHTML = `
        <div class="empty-state-card" style="padding: 20px; text-align: center;">
          No habits scheduled for today. Take a restful break or add one!
        </div>
      `;
    } else {
      todayContainer.innerHTML = todayHabits.map(habit => {
        const isDone = Boolean(logsMap[`${habit.id}_${todayStr}`]);
        return `
          <div class="today-habit-row ${isDone ? 'completed' : ''}" data-id="${habit.id}">
            <button class="today-checkbox ${isDone ? 'checked' : ''}" aria-label="Toggle ${habit.name}">
              ${isDone ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ` : ''}
            </button>
            <span class="today-emoji">${habit.emoji || '🎯'}</span>
            <div class="today-habit-info">
              <span class="today-habit-title">${habit.name}</span>
              <span class="badge" style="font-size: 0.7rem; padding: 1px 6px;">${habit.category}</span>
            </div>
            <span class="today-streak-badge">
              🔥 ${calculateHabitStreak(habit, logsMap, todayStr).currentStreak}d
            </span>
          </div>
        `;
      }).join('');

      // Toggle listener
      todayContainer.querySelectorAll('.today-habit-row').forEach(row => {
        const habitId = row.dataset.id;
        row.querySelector('.today-checkbox').addEventListener('click', async (e) => {
          e.stopPropagation();
          showSaving();
          await toggleHabitLog(habitId, todayStr);
          showSaved();
          refreshActiveView();
        });

        row.addEventListener('click', () => {
          const habit = habits.find(h => h.id === habitId);
          if (habit) openHabitDetail(habit, () => refreshActiveView());
        });
      });
    }
  }
}

/* ======================================================
   2. TODAY VIEW
====================================================== */
let selectedCategoryFilter = 'All';

async function renderTodayView(habits, logsMap) {
  const todayStr = getTodayString();
  const dailyStats = getDailyStats(todayStr, habits, logsMap);

  // Top header numbers
  const todayRateEl = document.getElementById('today-progress-percent');
  if (todayRateEl) todayRateEl.textContent = `${dailyStats.rate}%`;

  const todayCountEl = document.getElementById('today-progress-count');
  if (todayCountEl) todayCountEl.textContent = `${dailyStats.completedCount} of ${dailyStats.scheduledCount} completed`;

  const todayRemainingEl = document.getElementById('today-remaining-count');
  if (todayRemainingEl) todayRemainingEl.textContent = `${dailyStats.remainingCount} remaining`;

  // Render Category Filter Chips
  const filterContainer = document.getElementById('today-category-filters');
  if (filterContainer) {
    const categories = ['All', ...new Set(habits.filter(h => !h.archived).map(h => h.category))];
    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-chip ${cat === selectedCategoryFilter ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('');

    filterContainer.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedCategoryFilter = chip.dataset.cat;
        renderTodayView(habits, logsMap);
      });
    });
  }

  // Habits scheduled today
  let scheduledHabits = habits.filter(h => !h.archived && isHabitScheduledOnDate(h, todayStr));
  if (selectedCategoryFilter !== 'All') {
    scheduledHabits = scheduledHabits.filter(h => h.category === selectedCategoryFilter);
  }

  const listContainer = document.getElementById('today-habits-cards-list');
  if (!listContainer) return;

  if (scheduledHabits.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state-card" style="padding: 40px 20px; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🎉</div>
        <h3>No Habits Scheduled</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">
          ${selectedCategoryFilter !== 'All' ? `No habits in "${selectedCategoryFilter}" scheduled today.` : 'You have no habits scheduled for today.'}
        </p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = scheduledHabits.map((habit, index) => {
    const isDone = Boolean(logsMap[`${habit.id}_${todayStr}`]);
    const streak = calculateHabitStreak(habit, logsMap, todayStr);

    return `
      <div class="card today-interactive-card ${isDone ? 'is-completed' : ''}" data-id="${habit.id}">
        <div class="today-card-left">
          <button class="today-card-checkbox ${isDone ? 'checked' : ''}" aria-label="Check ${habit.name}">
            ${isDone ? `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : ''}
          </button>
          <div class="today-card-content">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="today-card-emoji">${habit.emoji || '🎯'}</span>
              <h3 class="today-card-title">${habit.name}</h3>
              <span class="badge" style="font-size: 0.7rem;">${habit.category}</span>
            </div>
            ${habit.description ? `<p class="today-card-desc">${habit.description}</p>` : ''}
          </div>
        </div>

        <div class="today-card-right">
          <div class="today-card-streak" title="Current streak">
            🔥 <strong>${streak.currentStreak}</strong> days
          </div>
          <button class="btn-icon btn-habit-info" title="Habit details" data-id="${habit.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach handlers
  listContainer.querySelectorAll('.today-card-checkbox').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = btn.closest('.today-interactive-card');
      const habitId = card.dataset.id;
      showSaving();
      await toggleHabitLog(habitId, todayStr);
      showSaved();
      showToast('Progress updated ✓', 'success');
      refreshActiveView();
    });
  });

  listContainer.querySelectorAll('.btn-habit-info').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const habit = habits.find(h => h.id === btn.dataset.id);
      if (habit) openHabitDetail(habit, () => refreshActiveView());
    });
  });

  listContainer.querySelectorAll('.today-interactive-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const habit = habits.find(h => h.id === card.dataset.id);
      if (habit) openHabitDetail(habit, () => refreshActiveView());
    });
  });
}

/* ======================================================
   3. MONTHLY TRACKER VIEW
====================================================== */
async function renderTrackerView(habits) {
  const container = document.getElementById('monthly-tracker-container');
  await renderMonthlyTracker(container, habits, () => {
    refreshActiveView();
  });
}

/* ======================================================
   4. GOALS VIEW
====================================================== */
async function renderGoalsView() {
  const container = document.getElementById('goals-container');
  await renderGoalsSection(container, () => {
    refreshActiveView();
  });

  const addGoalBtn = document.getElementById('btn-add-goal');
  if (addGoalBtn) {
    addGoalBtn.onclick = () => openGoalModal();
  }
}

/* ======================================================
   5. INSIGHTS & ANALYTICS VIEW
====================================================== */
async function renderInsightsView(habits, logsMap, allLogs) {
  const { year, month } = getSelectedYearMonth();
  const monthlyStats = getMonthlyStats(year, month, habits, logsMap);
  const weeklyStats = getWeeklyStats(year, month, habits, logsMap);
  const overallInsights = calculateOverallInsights(habits, allLogs);

  // Month selector label on insights
  const titleEl = document.getElementById('insights-period-title');
  if (titleEl) {
    titleEl.textContent = `${MONTH_NAMES[month - 1]} ${year} Analytics`;
  }

  // Stats Grid Elements
  const elOverallRate = document.getElementById('insight-overall-rate');
  if (elOverallRate) elOverallRate.textContent = `${monthlyStats.overallRate}%`;

  const elTotalCompleted = document.getElementById('insight-total-completed');
  if (elTotalCompleted) elTotalCompleted.textContent = monthlyStats.totalCompletions;

  const elTotalMissed = document.getElementById('insight-total-missed');
  if (elTotalMissed) elTotalMissed.textContent = monthlyStats.totalMissedInstances;

  const elBestHabit = document.getElementById('insight-best-habit');
  if (elBestHabit) {
    if (monthlyStats.bestHabit) {
      elBestHabit.innerHTML = `${monthlyStats.bestHabit.habit.emoji || '🎯'} ${monthlyStats.bestHabit.habit.name} (${monthlyStats.bestHabit.rate}%)`;
    } else {
      elBestHabit.textContent = 'None';
    }
  }

  const elNeedingAttention = document.getElementById('insight-needing-attention');
  if (elNeedingAttention) {
    if (monthlyStats.needingAttention) {
      elNeedingAttention.innerHTML = `${monthlyStats.needingAttention.habit.emoji || '🎯'} ${monthlyStats.needingAttention.habit.name} (${monthlyStats.needingAttention.rate}%)`;
    } else {
      elNeedingAttention.textContent = 'None';
    }
  }

  const elBestDay = document.getElementById('insight-best-day');
  if (elBestDay) elBestDay.textContent = `${overallInsights.bestDayOfWeek.fullName} (${overallInsights.bestDayOfWeek.rate}%)`;

  const elCurrentBestStreak = document.getElementById('insight-best-streak');
  if (elCurrentBestStreak) elCurrentBestStreak.textContent = `${overallInsights.currentBestStreak} days`;

  const elLongestStreak = document.getElementById('insight-longest-streak');
  if (elLongestStreak) elLongestStreak.textContent = `${overallInsights.lifetimeLongestStreak} days`;

  // Charts
  // 1. Daily Completion Trend (days 1-31 of selected month)
  const dailyChartCanvas = document.getElementById('chart-daily-trend');
  if (dailyChartCanvas) {
    const dailyData = [];
    for (let d = 1; d <= monthlyStats.daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const stats = getDailyStats(dateStr, habits, logsMap);
      dailyData.push({ day: d, rate: stats.rate, dateStr });
    }
    renderDailyTrendChart(dailyChartCanvas, dailyData);
  }

  // 2. Weekly Bar Chart
  const weeklyCanvas = document.getElementById('chart-weekly-bars');
  if (weeklyCanvas) {
    renderWeeklyBarChart(weeklyCanvas, weeklyStats);
  }

  // 3. Habit Comparison Bars
  const compContainer = document.getElementById('chart-habit-comparison');
  if (compContainer) {
    renderHabitComparisonChart(compContainer, monthlyStats.habitStats);
  }

  // 4. Heatmap
  const heatmapContainer = document.getElementById('yearly-heatmap-container');
  const heatmapTooltip = document.getElementById('heatmap-tooltip');
  if (heatmapContainer) {
    renderConsistencyHeatmap(heatmapContainer, heatmapTooltip, habits, allLogs);
  }
}

/* ======================================================
   6. HISTORY VIEW
====================================================== */
async function renderHistoryView(habits, allLogs) {
  const container = document.getElementById('history-months-list');
  if (!container) return;

  const logsMap = {};
  allLogs.forEach(l => {
    if (l.completed) logsMap[l.key] = true;
  });

  // Calculate past 12 months
  const now = new Date();
  const pastMonths = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const stats = getMonthlyStats(y, m, habits, logsMap);
    pastMonths.push({
      year: y,
      month: m,
      name: MONTH_NAMES[m - 1],
      rate: stats.overallRate,
      completed: stats.totalCompletions,
      scheduled: stats.totalScheduledInstances
    });
  }

  // Personal Records
  const insights = calculateOverallInsights(habits, allLogs);
  const bestMonthObj = [...pastMonths].sort((a, b) => b.rate - a.rate)[0];

  const recLongestStreak = document.getElementById('record-longest-streak');
  if (recLongestStreak) recLongestStreak.textContent = `${insights.lifetimeLongestStreak} days`;

  const recBestMonth = document.getElementById('record-best-month');
  if (recBestMonth && bestMonthObj) recBestMonth.textContent = `${bestMonthObj.name} ${bestMonthObj.year} (${bestMonthObj.rate}%)`;

  const recHighestDaily = document.getElementById('record-highest-daily');
  if (recHighestDaily) recHighestDaily.textContent = `${insights.highestDailyCompletions} completions`;

  const recLifetime = document.getElementById('record-total-lifetime');
  if (recLifetime) recLifetime.textContent = `${insights.totalLifetimeCompletions}`;

  // Month Cards
  container.innerHTML = pastMonths.map(m => {
    const color = m.rate >= 80 ? 'var(--accent-green)' : m.rate >= 50 ? 'var(--accent-primary)' : 'var(--accent-amber)';
    return `
      <div class="card history-month-card" data-year="${m.year}" data-month="${m.month}">
        <div class="history-month-header">
          <div>
            <h3 class="history-month-title">${m.name} ${m.year}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${m.completed} / ${m.scheduled} completed</span>
          </div>
          <div class="history-month-badge" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">
            ${m.rate}%
          </div>
        </div>
        <div class="progress-bar-track" style="margin: 14px 0 16px 0;">
          <div class="progress-bar-fill" style="width: ${m.rate}%; background: ${color};"></div>
        </div>
        <button class="btn btn-outline btn-block btn-open-history-month" data-year="${m.year}" data-month="${m.month}">
          View Full Tracker →
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-open-history-month').forEach(btn => {
    btn.addEventListener('click', () => {
      const y = Number(btn.dataset.year);
      const m = Number(btn.dataset.month);
      setSelectedYearMonth(y, m);
      switchView('tracker');
    });
  });

  // Monthly trend chart in History
  const historyTrendCanvas = document.getElementById('chart-history-monthly-trend');
  if (historyTrendCanvas) {
    const trendData = [...pastMonths].reverse().map(m => ({
      label: `${m.name.slice(0, 3)}`,
      rate: m.rate
    }));
    renderMonthlyTrendChart(historyTrendCanvas, trendData);
  }
}

/* ======================================================
   7. SETTINGS VIEW
====================================================== */
async function renderSettingsView() {
  const currentTheme = (await getSetting('theme')) || 'system';
  const themeRadios = document.querySelectorAll('input[name="theme-choice"]');
  themeRadios.forEach(r => {
    r.checked = (r.value === currentTheme);
    r.onchange = async () => {
      await setTheme(r.value);
      showToast(`Theme changed to ${r.value}`, 'info');
    };
  });

  const exportBtn = document.getElementById('btn-settings-export');
  if (exportBtn) {
    exportBtn.onclick = () => exportBackup();
  }

  const importInput = document.getElementById('settings-import-file');
  const importBtn = document.getElementById('btn-settings-import');
  if (importBtn && importInput) {
    importBtn.onclick = () => importInput.click();
    importInput.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileImport(e.target.files[0], () => refreshActiveView());
        importInput.value = '';
      }
    };
  }

  const resetBtn = document.getElementById('btn-settings-reset');
  if (resetBtn) {
    resetBtn.onclick = () => promptResetData(() => refreshActiveView());
  }
}

/* ======================================================
   GLOBAL MODALS SETUP
====================================================== */
function setupGlobalModals() {
  // 1. Habit Modal
  const habitForm = document.getElementById('habit-form');
  const habitModalClose = document.getElementById('habit-modal-close');
  const habitModalCancel = document.getElementById('habit-modal-cancel');

  if (habitForm) {
    habitForm.addEventListener('submit', (e) => {
      handleHabitFormSubmit(e, () => refreshActiveView());
    });
  }
  if (habitModalClose) habitModalClose.addEventListener('click', closeHabitModal);
  if (habitModalCancel) habitModalCancel.addEventListener('click', closeHabitModal);

  // 2. Habit Detail Modal Close
  const habitDetailClose = document.getElementById('habit-detail-close');
  if (habitDetailClose) habitDetailClose.addEventListener('click', closeHabitDetail);

  // 3. Goal Modal
  const goalForm = document.getElementById('goal-form');
  const goalModalClose = document.getElementById('goal-modal-close');
  const goalModalCancel = document.getElementById('goal-modal-cancel');
  const goalModalDelete = document.getElementById('goal-modal-delete');

  if (goalForm) {
    goalForm.addEventListener('submit', (e) => {
      handleGoalFormSubmit(e, () => refreshActiveView());
    });
  }
  if (goalModalClose) goalModalClose.addEventListener('click', closeGoalModal);
  if (goalModalCancel) goalModalCancel.addEventListener('click', closeGoalModal);
  if (goalModalDelete) {
    goalModalDelete.addEventListener('click', () => {
      handleDeleteCurrentGoal(() => refreshActiveView());
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

/**
 * PWA & Service Worker Setup
 */
function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            showToast('PROGRESS installed successfully!', 'success');
          }
          deferredInstallPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  });
}
