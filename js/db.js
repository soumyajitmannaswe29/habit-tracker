/**
 * PROGRESS — Personal Habit & Growth Tracker
 * db.js — Robust IndexedDB Persistence Layer
 */

const DB_NAME = 'ProgressHabitTrackerDB';
const DB_VERSION = 1;

let dbInstance = null;

export const DEFAULT_HABITS = [
  {
    id: 'habit-wake-up',
    name: 'Wake Up Early',
    emoji: '🌅',
    category: 'Health',
    weeklyGoal: 7,
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 0,
    description: 'Rise by 6:00 AM refreshed and ready for the day.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-drink-water',
    name: 'Drink Water',
    emoji: '💧',
    category: 'Health',
    weeklyGoal: 7,
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 1,
    description: 'Stay hydrated with at least 2.5L of water daily.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-exercise',
    name: 'Exercise & Workout',
    emoji: '🏃',
    category: 'Fitness',
    weeklyGoal: 5,
    targetDays: [1, 2, 3, 4, 5], // Mon-Fri
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 2,
    description: '30-45 minutes workout, gym, or running.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-study',
    name: 'Deep Study',
    emoji: '📚',
    category: 'Study',
    weeklyGoal: 6,
    targetDays: [1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 3,
    description: 'Focused academic learning or conceptual deep dive.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-coding',
    name: 'Coding & Projects',
    emoji: '💻',
    category: 'Coding',
    weeklyGoal: 5,
    targetDays: [1, 2, 3, 4, 5],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 4,
    description: 'Build projects, practice algorithms, or push GitHub commits.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-read',
    name: 'Read Books',
    emoji: '📖',
    category: 'Mind',
    weeklyGoal: 7,
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 5,
    description: 'Read at least 15-20 pages of non-fiction or literature.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'habit-sleep-early',
    name: 'Sleep Early',
    emoji: '🌙',
    category: 'Health',
    weeklyGoal: 7,
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: '2026-01-01',
    archived: false,
    paused: false,
    order: 6,
    description: 'Wind down and sleep before 11:00 PM for 7+ hours rest.',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const DEFAULT_GOALS = [
  {
    id: 'goal-study-hours',
    title: 'Study 100 Hours',
    category: 'Study',
    current: 42,
    target: 100,
    unit: 'hours',
    deadline: '2026-12-31',
    notes: 'Focus on advanced algorithms and system design.',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'goal-finish-dsa',
    title: 'Finish DSA Course',
    category: 'Coding',
    current: 68,
    target: 100,
    unit: '%',
    deadline: '2026-10-31',
    notes: 'Complete trees, graphs, and dynamic programming.',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'goal-read-books',
    title: 'Read 12 Books',
    category: 'Mind',
    current: 7,
    target: 12,
    unit: 'books',
    deadline: '2026-12-31',
    notes: 'Biographies, psychology, and personal finance.',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. habits store
      if (!db.objectStoreNames.contains('habits')) {
        const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
        habitStore.createIndex('order', 'order', { unique: false });
        habitStore.createIndex('category', 'category', { unique: false });
        habitStore.createIndex('archived', 'archived', { unique: false });
      }

      // 2. habitLogs store
      if (!db.objectStoreNames.contains('habitLogs')) {
        const logStore = db.createObjectStore('habitLogs', { keyPath: 'key' });
        logStore.createIndex('habitId', 'habitId', { unique: false });
        logStore.createIndex('date', 'date', { unique: false });
        logStore.createIndex('completed', 'completed', { unique: false });
        logStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
      }

      // 3. goals store
      if (!db.objectStoreNames.contains('goals')) {
        const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
        goalStore.createIndex('category', 'category', { unique: false });
        goalStore.createIndex('completed', 'completed', { unique: false });
      }

      // 4. monthlyNotes store
      if (!db.objectStoreNames.contains('monthlyNotes')) {
        db.createObjectStore('monthlyNotes', { keyPath: 'yearMonth' });
      }

      // 5. settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = async (event) => {
      dbInstance = event.target.result;
      await seedInitialDataIfNeeded();
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function seedInitialDataIfNeeded() {
  try {
    const initialized = await getSetting('hasInitialized');
    if (!initialized) {
      const habitsCount = await countStore('habits');
      if (habitsCount === 0) {
        // Seed default habits
        const tx = dbInstance.transaction(['habits', 'goals', 'settings'], 'readwrite');
        const habitStore = tx.objectStore('habits');
        for (const habit of DEFAULT_HABITS) {
          habitStore.put(habit);
        }

        const goalStore = tx.objectStore('goals');
        for (const goal of DEFAULT_GOALS) {
          goalStore.put(goal);
        }

        const settingsStore = tx.objectStore('settings');
        settingsStore.put({ key: 'hasInitialized', value: true });
        settingsStore.put({ key: 'theme', value: 'system' });
        settingsStore.put({ key: 'sampleDataLoaded', value: true });

        await new Promise((res, rej) => {
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        });
      }
    }
  } catch (err) {
    console.warn('Seeding initial data skipped or failed:', err);
  }
}

function countStore(storeName) {
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ======================================================
   HABITS CRUD
====================================================== */
export async function getAllHabits(includeArchived = false) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const req = store.getAll();
    req.onsuccess = () => {
      let habits = req.result || [];
      if (!includeArchived) {
        habits = habits.filter(h => !h.archived);
      }
      habits.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      resolve(habits);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getHabitById(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHabit(habit) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    const habitToSave = {
      ...habit,
      id: habit.id || 'habit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      createdAt: habit.createdAt || new Date().toISOString()
    };
    const req = store.put(habitToSave);
    req.onsuccess = () => resolve(habitToSave);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteHabit(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'habitLogs'], 'readwrite');
    const habitStore = tx.objectStore('habits');
    const logStore = tx.objectStore('habitLogs');

    habitStore.delete(id);

    // Delete associated logs
    const index = logStore.index('habitId');
    const req = index.openKeyCursor(IDBKeyRange.only(id));
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        logStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function reorderHabits(orderedIds) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');

    orderedIds.forEach((id, index) => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          const habit = req.result;
          habit.order = index;
          store.put(habit);
        }
      };
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* ======================================================
   HABIT LOGS
====================================================== */
export function getLogKey(habitId, dateStr) {
  return `${habitId}_${dateStr}`;
}

export async function getHabitLog(habitId, dateStr) {
  const db = await initDB();
  const key = getLogKey(habitId, dateStr);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readonly');
    const store = tx.objectStore('habitLogs');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function setHabitLog(habitId, dateStr, completed) {
  const db = await initDB();
  const key = getLogKey(habitId, dateStr);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readwrite');
    const store = tx.objectStore('habitLogs');
    const logEntry = {
      key,
      habitId,
      date: dateStr,
      completed: Boolean(completed),
      updatedAt: new Date().toISOString()
    };
    const req = store.put(logEntry);
    req.onsuccess = () => resolve(logEntry);
    req.onerror = () => reject(req.error);
  });
}

export async function toggleHabitLog(habitId, dateStr) {
  const current = await getHabitLog(habitId, dateStr);
  const nextCompleted = current ? !current.completed : true;
  return await setHabitLog(habitId, dateStr, nextCompleted);
}

export async function getLogsForMonth(year, month) {
  // month is 1-12
  const db = await initDB();
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readonly');
    const store = tx.objectStore('habitLogs');
    const index = store.index('date');
    const range = IDBKeyRange.bound(startDate, endDate);
    const req = index.getAll(range);

    req.onsuccess = () => {
      // Map logs to a convenient dictionary: { "habitId_date": true/false }
      const map = {};
      (req.result || []).forEach(log => {
        if (log.completed) {
          map[log.key] = true;
        }
      });
      resolve({ list: req.result || [], map });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLogsForDate(dateStr) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readonly');
    const store = tx.objectStore('habitLogs');
    const index = store.index('date');
    const req = index.getAll(IDBKeyRange.only(dateStr));
    req.onsuccess = () => {
      const map = {};
      (req.result || []).forEach(log => {
        if (log.completed) map[log.habitId] = true;
      });
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLogsForHabit(habitId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readonly');
    const store = tx.objectStore('habitLogs');
    const index = store.index('habitId');
    const req = index.getAll(IDBKeyRange.only(habitId));
    req.onsuccess = () => {
      const list = (req.result || []).filter(l => l.completed);
      list.sort((a, b) => a.date.localeCompare(b.date));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllHabitLogs() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('habitLogs', 'readonly');
    const store = tx.objectStore('habitLogs');
    const req = store.getAll();
    req.onsuccess = () => {
      resolve(req.result || []);
    };
    req.onerror = () => reject(req.error);
  });
}

/* ======================================================
   GOALS CRUD
====================================================== */
export async function getAllGoals() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readonly');
    const store = tx.objectStore('goals');
    const req = store.getAll();
    req.onsuccess = () => {
      const goals = req.result || [];
      goals.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
      resolve(goals);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveGoal(goal) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite');
    const store = tx.objectStore('goals');
    const goalToSave = {
      ...goal,
      id: goal.id || 'goal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      current: Number(goal.current) || 0,
      target: Number(goal.target) || 1,
      createdAt: goal.createdAt || new Date().toISOString()
    };
    goalToSave.completed = goalToSave.current >= goalToSave.target;
    const req = store.put(goalToSave);
    req.onsuccess = () => resolve(goalToSave);
    req.onerror = () => reject(req.error);
  });
}

export async function updateGoalProgress(id, deltaOrValue, isDelta = false) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite');
    const store = tx.objectStore('goals');
    const req = store.get(id);
    req.onsuccess = () => {
      const goal = req.result;
      if (!goal) return resolve(null);
      if (isDelta) {
        goal.current = Math.max(0, (Number(goal.current) || 0) + Number(deltaOrValue));
      } else {
        goal.current = Math.max(0, Number(deltaOrValue));
      }
      goal.completed = goal.current >= goal.target;
      store.put(goal);
      resolve(goal);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGoal(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite');
    const store = tx.objectStore('goals');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/* ======================================================
   MONTHLY NOTES / REFLECTION
====================================================== */
export async function getMonthlyNote(yearMonth) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('monthlyNotes', 'readonly');
    const store = tx.objectStore('monthlyNotes');
    const req = store.get(yearMonth);
    req.onsuccess = () => resolve(req.result || {
      yearMonth,
      wentWell: '',
      needsImprovement: '',
      biggestWin: '',
      nextFocus: '',
      generalNotes: ''
    });
    req.onerror = () => reject(req.error);
  });
}

export async function saveMonthlyNote(yearMonth, data) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('monthlyNotes', 'readwrite');
    const store = tx.objectStore('monthlyNotes');
    const noteEntry = {
      yearMonth,
      wentWell: data.wentWell || '',
      needsImprovement: data.needsImprovement || '',
      biggestWin: data.biggestWin || '',
      nextFocus: data.nextFocus || '',
      generalNotes: data.generalNotes || '',
      updatedAt: new Date().toISOString()
    };
    const req = store.put(noteEntry);
    req.onsuccess = () => resolve(noteEntry);
    req.onerror = () => reject(req.error);
  });
}

/* ======================================================
   SETTINGS
====================================================== */
export async function getSetting(key, defaultValue = null) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get(key);
    req.onsuccess = () => {
      if (req.result !== undefined && req.result !== null) {
        resolve(req.result.value);
      } else {
        resolve(defaultValue);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setSetting(key, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

/* ======================================================
   EXPORT, IMPORT & RESET
====================================================== */
export async function exportFullDatabase() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'habitLogs', 'goals', 'monthlyNotes', 'settings'], 'readonly');

    const result = {
      app: 'PROGRESS',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {}
    };

    const stores = ['habits', 'habitLogs', 'goals', 'monthlyNotes', 'settings'];
    let remaining = stores.length;

    stores.forEach(storeName => {
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        result.data[storeName] = req.result || [];
        remaining--;
        if (remaining === 0) resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function importFullDatabase(importedJson) {
  if (!importedJson || !importedJson.data) {
    throw new Error('Invalid backup file format: missing data payload.');
  }

  const { habits = [], habitLogs = [], goals = [], monthlyNotes = [], settings = [] } = importedJson.data;

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'habitLogs', 'goals', 'monthlyNotes', 'settings'], 'readwrite');

    const clearAndInsert = (storeName, items) => {
      const store = tx.objectStore(storeName);
      store.clear();
      items.forEach(item => store.put(item));
    };

    clearAndInsert('habits', habits);
    clearAndInsert('habitLogs', habitLogs);
    clearAndInsert('goals', goals);
    clearAndInsert('monthlyNotes', monthlyNotes);
    clearAndInsert('settings', settings);

    tx.oncomplete = () => resolve({
      habitsCount: habits.length,
      logsCount: habitLogs.length,
      goalsCount: goals.length,
      notesCount: monthlyNotes.length
    });
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetAllData() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['habits', 'habitLogs', 'goals', 'monthlyNotes', 'settings'], 'readwrite');
    tx.objectStore('habits').clear();
    tx.objectStore('habitLogs').clear();
    tx.objectStore('goals').clear();
    tx.objectStore('monthlyNotes').clear();
    tx.objectStore('settings').clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
