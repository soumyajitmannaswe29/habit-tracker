/**
 * PROGRESS — Personal Habit & Growth Tracker
 * backup.js — JSON Export, Import with Validation & Reset
 */

import { exportFullDatabase, importFullDatabase, resetAllData } from './db.js';
import { showToast, confirmAction, showSaving, showSaved } from './settings.js';

export async function exportBackup() {
  try {
    showSaving();
    const data = await exportFullDatabase();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSaved();
    showToast('Backup exported successfully ✓', 'success');
  } catch (err) {
    console.error('Export error:', err);
    showToast('Failed to export backup: ' + err.message, 'error');
  }
}

export async function handleFileImport(file, onRestoreComplete) {
  if (!file) return;

  try {
    const text = await file.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON file format.');
    }

    if (!json || !json.data) {
      throw new Error('Unrecognized backup structure. Missing "data" payload.');
    }

    const habitsCount = (json.data.habits || []).length;
    const logsCount = (json.data.habitLogs || []).length;
    const goalsCount = (json.data.goals || []).length;
    const notesCount = (json.data.monthlyNotes || []).length;

    const confirmed = await confirmAction({
      title: 'Restore Backup Data',
      message: `
        <p>This backup contains:</p>
        <ul style="margin: 8px 0 8px 20px; line-height: 1.6;">
          <li><strong>${habitsCount}</strong> Habits</li>
          <li><strong>${logsCount}</strong> Completed Checks</li>
          <li><strong>${goalsCount}</strong> Goals</li>
          <li><strong>${notesCount}</strong> Monthly Reflections</li>
        </ul>
        <p style="color: var(--accent-rose); margin-top: 8px;">
          <strong>Warning:</strong> Restoring will replace your current habits and logs with this backup.
        </p>
      `,
      confirmText: 'Restore Backup',
      cancelText: 'Cancel',
      isDanger: true
    });

    if (!confirmed) return;

    showSaving();
    await importFullDatabase(json);
    showSaved();
    showToast('Data restored successfully! ✓', 'success');

    if (onRestoreComplete) {
      onRestoreComplete();
    }
  } catch (err) {
    console.error('Import error:', err);
    showToast('Import failed: ' + err.message, 'error');
  }
}

export async function promptResetData(onResetComplete) {
  const modal = document.getElementById('reset-confirm-modal');
  if (!modal) return;

  const input = modal.querySelector('#reset-confirm-input');
  const confirmBtn = modal.querySelector('#reset-confirm-submit');
  const cancelBtn = modal.querySelector('#reset-confirm-cancel');

  input.value = '';
  confirmBtn.disabled = true;

  const onInput = () => {
    confirmBtn.disabled = (input.value.trim().toUpperCase() !== 'RESET');
  };

  input.addEventListener('input', onInput);
  modal.classList.add('active');

  return new Promise((resolve) => {
    const cleanup = () => {
      modal.classList.remove('active');
      input.removeEventListener('input', onInput);
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onConfirm = async () => {
      cleanup();
      try {
        showSaving();
        await resetAllData();
        showSaved();
        showToast('All progress data has been reset.', 'warning');
        if (onResetComplete) onResetComplete();
        resolve(true);
      } catch (err) {
        showToast('Failed to reset: ' + err.message, 'error');
        resolve(false);
      }
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}
