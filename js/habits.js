/**
 * PROGRESS — Personal Habit & Growth Tracker
 * habits.js — Habit Creation, Editing, Detail Drawer, and Management
 */

import { saveHabit, deleteHabit, getAllHabitLogs, getLogsForHabit } from './db.js';
import { calculateHabitStreak, parseDateString, formatDateToString, isHabitScheduledOnDate, getTodayString } from './stats.js';
import { showToast, confirmAction, showSaving, showSaved } from './settings.js';

let activeHabitModalMode = 'add'; // 'add' | 'edit'
let currentEditingHabitId = null;

export const CATEGORIES = ['Study', 'Health', 'Fitness', 'Coding', 'Mind', 'Finance', 'Personal', 'Other'];
export const EMOJI_PRESETS = ['🌅', '💧', '🏃', '📚', '💻', '📖', '🌙', '🧘', '🥦', '🎨', '✍️', '💰', '⚡', '🎯', '🌿'];

/**
 * Open Modal to Add or Edit Habit
 */
export function openHabitModal(habit = null) {
  const modal = document.getElementById('habit-modal');
  if (!modal) return;

  const form = document.getElementById('habit-form');
  form.reset();

  const titleEl = modal.querySelector('.modal-title');
  const targetDaysContainer = document.getElementById('habit-target-days');
  const emojiInput = document.getElementById('habit-emoji');
  const emojiPresetsContainer = document.getElementById('emoji-presets');

  // Populate emoji presets if empty
  if (emojiPresetsContainer && emojiPresetsContainer.children.length === 0) {
    emojiPresetsContainer.innerHTML = EMOJI_PRESETS.map(em => `
      <button type="button" class="emoji-chip" data-emoji="${em}">${em}</button>
    `).join('');

    emojiPresetsContainer.querySelectorAll('.emoji-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        emojiInput.value = chip.dataset.emoji;
      });
    });
  }

  // Populate target days selector (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0)
  const days = [
    { label: 'M', day: 1 },
    { label: 'T', day: 2 },
    { label: 'W', day: 3 },
    { label: 'T', day: 4 },
    { label: 'F', day: 5 },
    { label: 'S', day: 6 },
    { label: 'S', day: 0 }
  ];

  if (targetDaysContainer) {
    targetDaysContainer.innerHTML = days.map(d => `
      <label class="day-select-pill">
        <input type="checkbox" name="targetDays" value="${d.day}" checked />
        <span>${d.label}</span>
      </label>
    `).join('');
  }

  if (habit) {
    activeHabitModalMode = 'edit';
    currentEditingHabitId = habit.id;
    if (titleEl) titleEl.textContent = 'Edit Habit';

    document.getElementById('habit-name').value = habit.name || '';
    document.getElementById('habit-emoji').value = habit.emoji || '🎯';
    document.getElementById('habit-category').value = habit.category || 'Personal';
    document.getElementById('habit-weekly-goal').value = habit.weeklyGoal || 7;
    document.getElementById('habit-start-date').value = habit.startDate || getTodayString();
    document.getElementById('habit-description').value = habit.description || '';

    // Set target days
    const checkedDays = habit.targetDays || [0, 1, 2, 3, 4, 5, 6];
    targetDaysContainer.querySelectorAll('input[name="targetDays"]').forEach(input => {
      input.checked = checkedDays.includes(Number(input.value));
    });
  } else {
    activeHabitModalMode = 'add';
    currentEditingHabitId = null;
    if (titleEl) titleEl.textContent = 'Add New Habit';

    document.getElementById('habit-emoji').value = '🎯';
    document.getElementById('habit-start-date').value = getTodayString();
    document.getElementById('habit-weekly-goal').value = 7;
  }

  modal.classList.add('active');
}

export function closeHabitModal() {
  const modal = document.getElementById('habit-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Handle Add/Edit Habit Form Submission
 */
export async function handleHabitFormSubmit(e, onSaveCallback) {
  e.preventDefault();

  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    showToast('Please enter a habit name', 'warning');
    return;
  }

  const emoji = document.getElementById('habit-emoji').value.trim() || '🎯';
  const category = document.getElementById('habit-category').value;
  const weeklyGoal = Number(document.getElementById('habit-weekly-goal').value) || 7;
  const startDate = document.getElementById('habit-start-date').value || getTodayString();
  const description = document.getElementById('habit-description').value.trim();

  // Selected target days
  const checkedDays = Array.from(
    document.querySelectorAll('#habit-target-days input[name="targetDays"]:checked')
  ).map(input => Number(input.value));

  if (checkedDays.length === 0) {
    showToast('Please select at least one scheduled day', 'warning');
    return;
  }

  try {
    showSaving();
    const habitData = {
      name,
      emoji,
      category,
      weeklyGoal,
      targetDays: checkedDays,
      startDate,
      description,
      archived: false,
      paused: false
    };

    if (activeHabitModalMode === 'edit' && currentEditingHabitId) {
      habitData.id = currentEditingHabitId;
    }

    await saveHabit(habitData);
    closeHabitModal();
    showSaved();
    showToast(activeHabitModalMode === 'edit' ? 'Habit updated ✓' : 'Habit added ✓', 'success');

    if (onSaveCallback) onSaveCallback();
  } catch (err) {
    console.error('Error saving habit:', err);
    showToast('Failed to save habit: ' + err.message, 'error');
  }
}

/**
 * Open Habit Detail Drawer / Modal with Comprehensive Stats
 */
export async function openHabitDetail(habit, onUpdateCallback) {
  if (!habit) return;
  const modal = document.getElementById('habit-detail-modal');
  if (!modal) return;

  const logs = await getLogsForHabit(habit.id);
  const logsMap = {};
  logs.forEach(l => { logsMap[`${habit.id}_${l.date}`] = true; });

  const streak = calculateHabitStreak(habit, logsMap);
  const totalCompleted = logs.length;

  // Calculate 30-day completion rate
  const todayStr = getTodayString();
  const today = parseDateString(todayStr);
  let thirtyDayScheduled = 0;
  let thirtyDayCompleted = 0;

  const sparklineDays = [];
  for (let i = 29; i >= 0; i--) {
    const curDate = new Date(today);
    curDate.setDate(today.getDate() - i);
    const dateStr = formatDateToString(curDate);
    const isScheduled = isHabitScheduledOnDate(habit, dateStr);
    const isDone = Boolean(logsMap[`${habit.id}_${dateStr}`]);

    if (isScheduled) {
      thirtyDayScheduled++;
      if (isDone) thirtyDayCompleted++;
    }

    sparklineDays.push({
      dateStr,
      isScheduled,
      isDone,
      dayNum: curDate.getDate()
    });
  }

  const thirtyDayRate = thirtyDayScheduled > 0 
    ? Math.round((thirtyDayCompleted / thirtyDayScheduled) * 100) 
    : 0;

  // Render modal content
  modal.querySelector('#habit-detail-emoji').textContent = habit.emoji || '🎯';
  modal.querySelector('#habit-detail-name').textContent = habit.name;
  modal.querySelector('#habit-detail-category').textContent = habit.category;
  modal.querySelector('#habit-detail-desc').textContent = habit.description || 'No description provided.';
  modal.querySelector('#habit-detail-current-streak').textContent = `${streak.currentStreak} days`;
  modal.querySelector('#habit-detail-longest-streak').textContent = `${streak.longestStreak} days`;
  modal.querySelector('#habit-detail-total-completed').textContent = `${totalCompleted} times`;
  modal.querySelector('#habit-detail-rate').textContent = `${thirtyDayRate}%`;

  // Render 30-day sparkline grid
  const sparklineEl = modal.querySelector('#habit-detail-sparkline');
  if (sparklineEl) {
    sparklineEl.innerHTML = sparklineDays.map(d => {
      let statusClass = 'off';
      let title = `${d.dateStr}: Not scheduled`;
      if (d.isScheduled) {
        if (d.isDone) {
          statusClass = 'completed';
          title = `${d.dateStr}: Completed ✓`;
        } else {
          statusClass = 'missed';
          title = `${d.dateStr}: Missed`;
        }
      }
      return `
        <div class="sparkline-dot ${statusClass}" title="${title}" style="width: 8px; height: 24px; border-radius: 2px;"></div>
      `;
    }).join('');
  }

  // Setup action buttons
  const editBtn = modal.querySelector('#habit-detail-btn-edit');
  const archiveBtn = modal.querySelector('#habit-detail-btn-archive');
  const deleteBtn = modal.querySelector('#habit-detail-btn-delete');

  editBtn.onclick = () => {
    modal.classList.remove('active');
    openHabitModal(habit);
  };

  archiveBtn.textContent = habit.archived ? 'Unarchive Habit' : 'Archive Habit';
  archiveBtn.onclick = async () => {
    habit.archived = !habit.archived;
    await saveHabit(habit);
    modal.classList.remove('active');
    showToast(habit.archived ? 'Habit archived' : 'Habit restored', 'info');
    if (onUpdateCallback) onUpdateCallback();
  };

  deleteBtn.onclick = async () => {
    const confirmed = await confirmAction({
      title: 'Delete Habit',
      message: `Are you sure you want to delete <strong>${habit.name}</strong>? All past completions for this habit will be permanently deleted.`,
      confirmText: 'Delete Permanently',
      isDanger: true
    });

    if (confirmed) {
      showSaving();
      await deleteHabit(habit.id);
      modal.classList.remove('active');
      showSaved();
      showToast('Habit deleted', 'info');
      if (onUpdateCallback) onUpdateCallback();
    }
  };

  modal.classList.add('active');
}

export function closeHabitDetail() {
  const modal = document.getElementById('habit-detail-modal');
  if (modal) modal.classList.remove('active');
}
