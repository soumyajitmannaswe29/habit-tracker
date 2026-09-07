/**
 * PROGRESS — Personal Habit & Growth Tracker
 * goals.js — Goal Tracking & Milestones
 */

import { getAllGoals, saveGoal, deleteGoal, updateGoalProgress } from './db.js';
import { showToast, confirmAction, showSaving, showSaved } from './settings.js';

let activeGoalModalMode = 'add';
let currentEditingGoalId = null;

export async function renderGoalsSection(container, onUpdateCallback) {
  if (!container) return;
  const goals = await getAllGoals();

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-icon">🎯</div>
        <h3>No Goals Yet</h3>
        <p>Set targets for study hours, reading, fitness milestones, or projects.</p>
        <button class="btn btn-primary" id="btn-add-first-goal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Your First Goal
        </button>
      </div>
    `;

    const addFirstBtn = container.querySelector('#btn-add-first-goal');
    if (addFirstBtn) {
      addFirstBtn.addEventListener('click', () => openGoalModal());
    }
    return;
  }

  container.innerHTML = `
    <div class="goals-grid">
      ${goals.map(g => {
        const percent = Math.min(100, Math.round((g.current / g.target) * 100)) || 0;
        const isComplete = g.current >= g.target;
        const color = isComplete ? 'var(--accent-green)' : 'var(--accent-primary)';

        let deadlineBadge = '';
        if (g.deadline) {
          const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) {
            deadlineBadge = `<span class="badge badge-expired">Expired</span>`;
          } else if (daysLeft === 0) {
            deadlineBadge = `<span class="badge badge-warning">Due today</span>`;
          } else {
            deadlineBadge = `<span class="badge">${daysLeft}d remaining</span>`;
          }
        }

        return `
          <div class="goal-card card ${isComplete ? 'goal-card-completed' : ''}" data-id="${g.id}">
            <div class="goal-card-header">
              <div>
                <div class="goal-category-badge">${g.category || 'General'}</div>
                <h3 class="goal-title">${g.title}</h3>
              </div>
              <div class="goal-header-actions">
                ${isComplete ? '<span class="goal-check-badge">✓ Completed</span>' : ''}
                <button class="btn-icon btn-goal-menu" title="Goal Options" data-id="${g.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                </button>
              </div>
            </div>

            <div class="goal-progress-stats">
              <span class="goal-current-val">${g.current} <small style="font-weight: normal; color: var(--text-muted);">${g.unit}</small></span>
              <span class="goal-target-val">/ ${g.target} ${g.unit}</span>
              <span class="goal-percent" style="margin-left: auto; font-weight: 700; color: ${color};">${percent}%</span>
            </div>

            <div class="progress-bar-track" style="margin: 10px 0 16px 0;">
              <div class="progress-bar-fill" style="width: ${percent}%; background: ${color};"></div>
            </div>

            <div class="goal-card-footer">
              <div class="goal-deadline-info">${deadlineBadge}</div>
              <div class="goal-quick-actions">
                <button class="btn-chip btn-step-progress" data-id="${g.id}" data-delta="1">+1</button>
                <button class="btn-chip btn-step-progress" data-id="${g.id}" data-delta="5">+5</button>
                <button class="btn-chip btn-edit-progress" data-id="${g.id}">Edit</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach event handlers
  container.querySelectorAll('.btn-step-progress').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const delta = Number(btn.dataset.delta);
      showSaving();
      await updateGoalProgress(id, delta, true);
      showSaved();
      renderGoalsSection(container, onUpdateCallback);
      if (onUpdateCallback) onUpdateCallback();
    });
  });

  container.querySelectorAll('.btn-edit-progress').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const goal = goals.find(g => g.id === id);
      if (goal) openGoalModal(goal);
    });
  });

  container.querySelectorAll('.btn-goal-menu').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const goal = goals.find(g => g.id === id);
      if (goal) openGoalModal(goal);
    });
  });
}

export function openGoalModal(goal = null) {
  const modal = document.getElementById('goal-modal');
  if (!modal) return;

  const form = document.getElementById('goal-form');
  form.reset();

  const titleEl = modal.querySelector('.modal-title');
  const deleteBtn = modal.querySelector('#goal-modal-delete');

  if (goal) {
    activeGoalModalMode = 'edit';
    currentEditingGoalId = goal.id;
    if (titleEl) titleEl.textContent = 'Edit Goal';
    if (deleteBtn) deleteBtn.style.display = 'inline-flex';

    document.getElementById('goal-title').value = goal.title || '';
    document.getElementById('goal-category').value = goal.category || 'Study';
    document.getElementById('goal-target').value = goal.target || 10;
    document.getElementById('goal-current').value = goal.current || 0;
    document.getElementById('goal-unit').value = goal.unit || 'hours';
    document.getElementById('goal-deadline').value = goal.deadline || '';
    document.getElementById('goal-notes').value = goal.notes || '';
  } else {
    activeGoalModalMode = 'add';
    currentEditingGoalId = null;
    if (titleEl) titleEl.textContent = 'Add New Goal';
    if (deleteBtn) deleteBtn.style.display = 'none';

    document.getElementById('goal-current').value = 0;
    document.getElementById('goal-target').value = 100;
    document.getElementById('goal-unit').value = 'hours';
  }

  modal.classList.add('active');
}

export function closeGoalModal() {
  const modal = document.getElementById('goal-modal');
  if (modal) modal.classList.remove('active');
}

export async function handleGoalFormSubmit(e, onSaveCallback) {
  e.preventDefault();

  const title = document.getElementById('goal-title').value.trim();
  if (!title) {
    showToast('Please enter a goal title', 'warning');
    return;
  }

  const category = document.getElementById('goal-category').value;
  const current = Number(document.getElementById('goal-current').value) || 0;
  const target = Number(document.getElementById('goal-target').value) || 1;
  const unit = document.getElementById('goal-unit').value.trim() || 'units';
  const deadline = document.getElementById('goal-deadline').value;
  const notes = document.getElementById('goal-notes').value.trim();

  try {
    showSaving();
    const goalData = {
      title,
      category,
      current,
      target,
      unit,
      deadline,
      notes
    };

    if (activeGoalModalMode === 'edit' && currentEditingGoalId) {
      goalData.id = currentEditingGoalId;
    }

    await saveGoal(goalData);
    closeGoalModal();
    showSaved();
    showToast(activeGoalModalMode === 'edit' ? 'Goal updated ✓' : 'Goal added ✓', 'success');

    if (onSaveCallback) onSaveCallback();
  } catch (err) {
    showToast('Failed to save goal: ' + err.message, 'error');
  }
}

export async function handleDeleteCurrentGoal(onDeleteCallback) {
  if (!currentEditingGoalId) return;

  const confirmed = await confirmAction({
    title: 'Delete Goal',
    message: 'Are you sure you want to delete this goal?',
    confirmText: 'Delete',
    isDanger: true
  });

  if (confirmed) {
    showSaving();
    await deleteGoal(currentEditingGoalId);
    closeGoalModal();
    showSaved();
    showToast('Goal deleted', 'info');
    if (onDeleteCallback) onDeleteCallback();
  }
}
