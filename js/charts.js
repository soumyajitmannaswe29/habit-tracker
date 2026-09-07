/**
 * PROGRESS — Personal Habit & Growth Tracker
 * charts.js — Lightweight, High-DPI Canvas & SVG Data Visualizations
 */

import { WEEKDAYS_SHORT, MONTH_NAMES, getDaysInMonth, parseDateString, formatDateToString } from './stats.js';

/**
 * Renders an SVG Circular Donut Progress Ring
 */
export function renderProgressRing(container, percent, options = {}) {
  if (!container) return;
  const size = options.size || 140;
  const strokeWidth = options.strokeWidth || 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clampedPercent / 100) * circumference;
  const color = options.color || 'var(--accent-primary)';
  const label = options.label || `${Math.round(clampedPercent)}%`;
  const sublabel = options.sublabel || '';

  container.innerHTML = `
    <div class="progress-ring-wrapper" style="width: ${size}px; height: ${size}px; position: relative;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="transparent"
          stroke="var(--ring-track)"
          stroke-width="${strokeWidth}"
        />
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="transparent"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"
          style="transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);"
        />
      </svg>
      <div class="progress-ring-content" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
        <span class="progress-ring-percent" style="font-size: ${size > 120 ? '1.75rem' : '1.25rem'}; font-weight: 700; color: var(--text-primary); line-height: 1;">${label}</span>
        ${sublabel ? `<span class="progress-ring-sublabel" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${sublabel}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Setup High-DPI canvas
 */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width: rect.width, height: rect.height };
}

/**
 * A. Daily Completion Trend (Line / Area chart for days 1–31)
 */
export function renderDailyTrendChart(canvas, dailyData) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  if (width === 0 || height === 0) return;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Draw grid lines
  const gridLevels = [0, 25, 50, 75, 100];
  ctx.lineWidth = 1;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#e2e8f0';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';

  gridLevels.forEach(val => {
    const y = padding.top + chartH - (val / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}%`, padding.left - 8, y + 4);
  });

  if (!dailyData || dailyData.length === 0) return;

  const count = dailyData.length;
  const stepX = chartW / Math.max(1, count - 1);

  // Points
  const points = dailyData.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - ((d.rate || 0) / 100) * chartH;
    return { x, y, day: d.day, rate: d.rate };
  });

  // Area gradient
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  grad.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
  grad.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

  // Draw Area
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  points.forEach((p, idx) => {
    if (idx === 0) {
      ctx.lineTo(p.x, p.y);
    } else {
      const prev = points[idx - 1];
      const cx = (prev.x + p.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
    }
  });
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.beginPath();
  points.forEach((p, idx) => {
    if (idx === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      const prev = points[idx - 1];
      const cx = (prev.x + p.x) / 2;
      ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
    }
  });
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#4f46e5';
  ctx.stroke();

  // Draw Points & X-Labels
  ctx.textAlign = 'center';
  points.forEach((p, idx) => {
    // Show label every 3-5 days
    if (p.day === 1 || p.day % 5 === 0 || p.day === count) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
      ctx.fillText(p.day, p.x, padding.top + chartH + 18);
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4f46e5';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });
}

/**
 * B. Weekly Progress Bar Chart (Week 1–5)
 */
export function renderWeeklyBarChart(canvas, weeksData) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  if (width === 0 || height === 0) return;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 25, right: 20, bottom: 35, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#e2e8f0';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';

  [0, 50, 100].forEach(val => {
    const y = padding.top + chartH - (val / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}%`, padding.left - 6, y + 4);
  });

  const activeWeeks = (weeksData || []).filter(w => w.active);
  if (activeWeeks.length === 0) return;

  const slotW = chartW / activeWeeks.length;
  const barW = Math.min(36, slotW * 0.55);

  activeWeeks.forEach((w, i) => {
    const xCenter = padding.left + i * slotW + slotW / 2;
    const x = xCenter - barW / 2;
    const rate = Math.min(100, Math.max(0, w.rate || 0));
    const barH = (rate / 100) * chartH;
    const y = padding.top + chartH - barH;

    // Bar background
    ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
    ctx.beginPath();
    ctx.roundRect(x, padding.top, barW, chartH, 6);
    ctx.fill();

    // Actual bar
    const barGrad = ctx.createLinearGradient(0, y, 0, y + barH);
    barGrad.addColorStop(0, '#4f46e5');
    barGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
    ctx.fill();

    // Percentage on top of bar
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${rate}%`, xCenter, Math.max(14, y - 6));

    // Week label
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(w.label, xCenter, padding.top + chartH + 18);
  });
}

/**
 * C. Habit Performance Comparison (Horizontal Bars)
 */
export function renderHabitComparisonChart(container, habitStats) {
  if (!container) return;
  if (!habitStats || habitStats.length === 0) {
    container.innerHTML = `<div class="empty-state-card">No habits scheduled for this period.</div>`;
    return;
  }

  const sorted = [...habitStats].sort((a, b) => b.rate - a.rate);

  container.innerHTML = sorted.map(item => {
    const habit = item.habit;
    const rate = item.rate;
    const color = rate >= 80 ? 'var(--accent-green)' : rate >= 50 ? 'var(--accent-primary)' : 'var(--accent-amber)';

    return `
      <div class="habit-bar-item" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.1rem;">${habit.emoji || '🎯'}</span>
            <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-primary);">${habit.name}</span>
            <span class="badge" style="font-size: 0.7rem; padding: 2px 6px;">${habit.category}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">${item.completed} / ${item.scheduled}</span>
            <span style="font-weight: 700; font-size: 0.9rem; color: ${color}; min-width: 40px; text-align: right;">${rate}%</span>
          </div>
        </div>
        <div class="progress-bar-track" style="height: 8px; background: var(--bg-track); border-radius: 4px; overflow: hidden;">
          <div class="progress-bar-fill" style="width: ${rate}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * D. Monthly History Trend (Past months completion trajectory)
 */
export function renderMonthlyTrendChart(canvas, monthlyHistory) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  if (width === 0 || height === 0) return;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 25, right: 25, bottom: 35, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid
  ctx.lineWidth = 1;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#e2e8f0';
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';

  [0, 50, 100].forEach(val => {
    const y = padding.top + chartH - (val / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${val}%`, padding.left - 8, y + 4);
  });

  if (!monthlyHistory || monthlyHistory.length === 0) return;

  const count = monthlyHistory.length;
  const stepX = count > 1 ? chartW / (count - 1) : chartW / 2;

  const points = monthlyHistory.map((m, i) => {
    const x = count > 1 ? padding.left + i * stepX : padding.left + chartW / 2;
    const y = padding.top + chartH - ((m.rate || 0) / 100) * chartH;
    return { x, y, label: m.label, rate: m.rate };
  });

  // Gradient area
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  grad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#10b981';
  ctx.stroke();

  // Points & Labels
  ctx.textAlign = 'center';
  points.forEach(p => {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
    ctx.fillText(p.label, p.x, padding.top + chartH + 18);

    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#0f172a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${p.rate}%`, p.x, p.y - 8);
  });
}

/**
 * E. GitHub-Style Consistency Heatmap
 * Generates an interactive 52-week grid of daily completion intensities
 */
export function renderConsistencyHeatmap(container, tooltipEl, habits, allLogs) {
  if (!container) return;

  const logsMap = {};
  allLogs.forEach(l => {
    if (l.completed) logsMap[l.key] = true;
  });

  const activeHabits = habits.filter(h => !h.archived);

  // Generate last 52 weeks (364 days ending today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = 52 * 7;
  // Start from (today - totalDays + 1) adjusted to Sunday/Monday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - totalDays + 1);

  const weeks = [];
  let currentWeek = [];

  let curDate = new Date(startDate);
  while (curDate <= today) {
    const dateStr = formatDateToString(curDate);
    const dayOfWeek = curDate.getDay();

    // Calculate scheduled & completed for this day
    let scheduled = 0;
    let completed = 0;

    activeHabits.forEach(h => {
      if (h.startDate && dateStr >= h.startDate) {
        const targetDays = h.targetDays || [0, 1, 2, 3, 4, 5, 6];
        if (targetDays.includes(dayOfWeek)) {
          scheduled++;
          if (logsMap[`${h.id}_${dateStr}`]) {
            completed++;
          }
        }
      }
    });

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    let level = 0;
    if (completed > 0) {
      if (rate >= 85) level = 4;
      else if (rate >= 60) level = 3;
      else if (rate >= 35) level = 2;
      else level = 1;
    }

    currentWeek.push({
      dateStr,
      dayOfWeek,
      scheduled,
      completed,
      rate,
      level,
      displayDate: curDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    curDate.setDate(curDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Render SVG or HTML Grid
  let html = `
    <div class="heatmap-scroll-container">
      <div class="heatmap-grid" style="display: flex; gap: 4px; padding: 6px 0;">
  `;

  weeks.forEach(week => {
    html += `<div class="heatmap-col" style="display: flex; flex-direction: column; gap: 4px;">`;
    week.forEach(day => {
      html += `
        <div
          class="heatmap-cell level-${day.level}"
          data-date="${day.displayDate}"
          data-completed="${day.completed}"
          data-scheduled="${day.scheduled}"
          data-rate="${day.rate}"
          style="width: 13px; height: 13px; border-radius: 3px; cursor: pointer; transition: transform 0.15s ease;"
        ></div>
      `;
    });
    html += `</div>`;
  });

  html += `
      </div>
      <div class="heatmap-legend" style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 10px; font-size: 0.75rem; color: var(--text-muted);">
        <span>Less</span>
        <div class="heatmap-cell level-0" style="width: 11px; height: 11px; border-radius: 2px;"></div>
        <div class="heatmap-cell level-1" style="width: 11px; height: 11px; border-radius: 2px;"></div>
        <div class="heatmap-cell level-2" style="width: 11px; height: 11px; border-radius: 2px;"></div>
        <div class="heatmap-cell level-3" style="width: 11px; height: 11px; border-radius: 2px;"></div>
        <div class="heatmap-cell level-4" style="width: 11px; height: 11px; border-radius: 2px;"></div>
        <span>More</span>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add Hover Tooltip
  if (tooltipEl) {
    const cells = container.querySelectorAll('.heatmap-cell[data-date]');
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', (e) => {
        const date = cell.getAttribute('data-date');
        const completed = cell.getAttribute('data-completed');
        const scheduled = cell.getAttribute('data-scheduled');
        const rate = cell.getAttribute('data-rate');

        tooltipEl.innerHTML = `
          <strong>${date}</strong><br/>
          ${completed} / ${scheduled} habits completed (${rate}%)
        `;
        tooltipEl.style.display = 'block';
        const rect = cell.getBoundingClientRect();
        tooltipEl.style.left = `${rect.left + window.scrollX - tooltipEl.offsetWidth / 2 + rect.width / 2}px`;
        tooltipEl.style.top = `${rect.top + window.scrollY - tooltipEl.offsetHeight - 8}px`;
      });

      cell.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none';
      });
    });
  }
}
