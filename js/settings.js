/**
 * PROGRESS — Personal Habit & Growth Tracker
 * settings.js — Theme Management, Auto-Save Status, Toasts & Confirmation Dialogs
 */

import { getSetting, setSetting } from './db.js';

let saveTimer = null;

/**
 * Initialize theme based on preference or system
 */
export async function initTheme() {
  const savedTheme = (await getSetting('theme')) || localStorage.getItem('progress_theme') || 'system';
  applyTheme(savedTheme);

  // Listen to OS theme changes if on system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    getSetting('theme').then(theme => {
      if (theme === 'system' || !theme) {
        applyTheme('system');
      }
    });
  });
}

export async function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem('progress_theme', theme);
  await setSetting('theme', theme);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }

  // Update theme radio buttons or UI if present
  const radios = document.querySelectorAll('input[name="theme-choice"]');
  radios.forEach(r => {
    r.checked = (r.value === theme);
  });
}

/**
 * Auto-Save Status Pill UI
 */
export function showSaving() {
  const el = document.getElementById('auto-save-indicator');
  if (!el) return;
  if (saveTimer) clearTimeout(saveTimer);

  el.className = 'save-status saving';
  el.innerHTML = `
    <span class="save-spinner"></span>
    <span>Saving...</span>
  `;
  el.style.opacity = '1';
}

export function showSaved() {
  const el = document.getElementById('auto-save-indicator');
  if (!el) return;
  if (saveTimer) clearTimeout(saveTimer);

  el.className = 'save-status saved';
  el.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Saved ✓</span>
  `;
  el.style.opacity = '1';

  saveTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 1800);
}

/**
 * Toast Notifications
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-msg">${message}</div>
  `;

  container.appendChild(toast);

  // Trigger entry animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, duration);
}

/**
 * Standard confirmation modal
 */
export function confirmAction({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
  return new Promise((resolve) => {
    const modalOverlay = document.getElementById('confirm-modal');
    if (!modalOverlay) {
      resolve(false);
      return;
    }

    const titleEl = modalOverlay.querySelector('.modal-title');
    const msgEl = modalOverlay.querySelector('.modal-body-text');
    const confirmBtn = modalOverlay.querySelector('.modal-btn-confirm');
    const cancelBtn = modalOverlay.querySelector('.modal-btn-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      if (isDanger) {
        confirmBtn.className = 'btn btn-danger modal-btn-confirm';
      } else {
        confirmBtn.className = 'btn btn-primary modal-btn-confirm';
      }
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;

    const cleanup = () => {
      modalOverlay.classList.remove('active');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);

    modalOverlay.classList.add('active');
  });
}
