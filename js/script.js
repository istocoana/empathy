(() => {
  const stateKey = 'empathy_state_v1';
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const mqlMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqlTheme = window.matchMedia('(prefers-color-scheme: dark)');

  const defaults = {
    settings: { theme: 'auto', reducedMotion: mqlMotion.matches },
    practice: {
      sliderFeelUnderstand: 50,
      sliderBoundary: 50,
      tasksByDate: {},
      log: [],
      successShown: false
    }
  };

  const taskPool = [
    'Do a 1-minute perspective-take on a headline.',
    "Mirror someone's wording, then ask one clarifying question.",
    'Write a 2-sentence compassion plan (who/what/when).',
    'Name three sensations in your body before replying.',
    'Ask: "Would advice or listening help right now?"',
    'Summarize what you heard, then ask if it landed.',
    'Take three breaths before sending a heated message.',
    "List the person's constraints before judging.",
    'Notice an in-group bias and name it privately.',
    'Offer two options instead of assuming help.',
    'Write one sentence of appreciation you can share.',
    'Set a 10-minute timer to just listen, no fixes.'
  ];

  const dom = {
    themeToggles: document.querySelectorAll('.theme-toggle'),
    motionToggle: document.getElementById('motionToggle') || document.getElementById('reduced-motion-toggle'),
    sliderFeel: document.getElementById('slider-feel'),
    sliderBoundary: document.getElementById('slider-boundary'),
    tipFeel: document.querySelector('[data-slider="feel"] .range-tip'),
    tipBoundary: document.querySelector('[data-slider="boundary"] .range-tip'),
    taskList: document.getElementById('task-list'),
    taskProgress: document.getElementById('task-progress'),
    resetTasks: document.getElementById('reset-tasks'),
    saveTasks: document.getElementById('save-tasks'),
    successBadge: document.getElementById('success-badge'),
    logRows: document.getElementById('log-rows'),
    openLogModal: document.getElementById('open-log-modal'),
    logModal: document.getElementById('log-modal'),
    closeLogModal: document.getElementById('close-log-modal'),
    cancelLog: document.getElementById('cancel-log'),
    logForm: document.getElementById('log-form'),
    logDate: document.getElementById('log-date'),
    logMode: document.getElementById('log-mode'),
    logBoundary: document.getElementById('log-boundary'),
    logNote: document.getElementById('log-note'),
    logError: document.getElementById('log-error'),
    downloadLog: document.getElementById('download-log'),
    clearLog: document.getElementById('clear-log'),
    confetti: document.getElementById('confetti-container'),
    practiceNudges: document.querySelectorAll('.practice-nudge')
  };

  document.body.classList.remove('no-js');
  document.body.classList.add('js-enhanced');

  let state = loadState();
  hydrateTaskFromLegacy();
  applyTheme(state.settings.theme, false);
  applyReducedMotion(state.settings.reducedMotion);

  setupSlider('feel');
  setupSlider('boundary');
  initTasks();
  initLog();
  bindButtons();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.logModal.hidden) {
      closeModal();
    }
  });
  checkSuccess();

  function loadState() {
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          settings: { ...defaults.settings, ...parsed.settings },
          practice: { ...defaults.practice, ...parsed.practice }
        };
      }
    } catch (err) {
      console.warn('State load failed, using defaults', err);
    }
    return JSON.parse(JSON.stringify(defaults));
  }

  function saveState() {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch (err) {
      console.warn('State save failed', err);
    }
  }

  function applyTheme(next, persist = true) {
    const resolved = next === 'auto' ? (mqlTheme.matches ? 'dark' : 'light') : next;
    document.body.dataset.theme = resolved;
    const label = next === 'auto' ? `Auto (${resolved})` : resolved.charAt(0).toUpperCase() + resolved.slice(1);
    dom.themeToggles.forEach((btn) => {
      btn.textContent = label;
      btn.setAttribute('aria-label', `Theme ${label}`);
    });
    if (persist) {
      state.settings.theme = next;
      saveState();
    }
  }

  function applyReducedMotion(enabled) {
    state.settings.reducedMotion = enabled;
    document.body.classList.toggle('reduce-motion', enabled);
    if (dom.motionToggle) {
      dom.motionToggle.textContent = enabled ? 'Motion: reduced' : 'Motion: normal';
      dom.motionToggle.setAttribute('aria-pressed', String(enabled));
    }
    saveState();
  }

  function setupSlider(kind) {
    const input = kind === 'feel' ? dom.sliderFeel : dom.sliderBoundary;
    const tip = kind === 'feel' ? dom.tipFeel : dom.tipBoundary;
    input.dataset.kind = kind;
    const initial =
      kind === 'feel' ? state.practice.sliderFeelUnderstand : state.practice.sliderBoundary;
    input.value = initial;
    updateSliderVisual(kind, initial);
    input.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      storeSlider(kind, val);
      updateSliderVisual(kind, val);
      checkSuccess();
    });
    input.addEventListener('keydown', (e) => handleSliderKeys(e, input));

    function updateSliderVisual(type, value) {
      const label = sliderLabel(type, value);
      const tipText = sliderTip(type, value);
      input.setAttribute('aria-valuetext', label);
      tip.textContent = tipText;
      const baseGradient =
        type === 'feel'
          ? 'linear-gradient(90deg, var(--affect) 0%, var(--affect) 50%, var(--cog) 50%, var(--cog) 100%)'
          : 'linear-gradient(90deg, var(--comp) 0%, var(--comp) 100%)';
      input.style.backgroundImage = baseGradient;
      input.style.backgroundSize = `${value}% 100%`;
      input.style.backgroundRepeat = 'no-repeat';
      const track = getComputedStyle(document.body).getPropertyValue('--track') || '#e5e7eb';
      input.style.backgroundColor = track;
    }
  }

  function storeSlider(kind, value) {
    if (kind === 'feel') {
      state.practice.sliderFeelUnderstand = value;
    } else {
      state.practice.sliderBoundary = value;
    }
    saveState();
  }

  function sliderLabel(kind, value) {
    if (kind === 'feel') {
      if (value <= 30) return 'Feel';
      if (value <= 60) return 'Blend';
      return 'Understand';
    }
    if (value <= 30) return 'Porous';
    if (value <= 60) return 'Attuned';
    return 'Firm';
  }

  function sliderTip(kind, value) {
    if (kind === 'feel') {
      if (value <= 30) return 'Name the feeling out loud.';
      if (value <= 60) return 'Reflect back what you heard.';
      return 'Summarize intent + propose one next step.';
    }
    if (value <= 30) return 'Empathize, then breathe 3x before responding.';
    if (value <= 60) return 'Ask: "What would be helpful from me?"';
    return 'Offer 2 options; avoid over-identifying.';
  }

  function handleSliderKeys(event, input) {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      input.value = Math.max(0, Number(input.value) - step);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      input.value = Math.min(100, Number(input.value) + step);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function initTasks() {
    const existing = state.practice.tasksByDate[todayISO];
    if (!existing) {
      const tasks = pickTasks();
      state.practice.tasksByDate[todayISO] = tasks;
      saveState();
    }
    renderTasks();
    dom.resetTasks.addEventListener('click', () => {
      state.practice.tasksByDate[todayISO] = pickTasks();
      saveState();
      renderTasks();
    });
    dom.saveTasks.addEventListener('click', () => {
      saveState();
      dom.saveTasks.textContent = 'Saved';
      setTimeout(() => (dom.saveTasks.textContent = 'Save today'), 1200);
    });
    dom.practiceNudges?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.task || 'Pause 10s + ask one clarifying question';
        prefillTask(label);
        document.getElementById('practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function pickTasks() {
    const pool = [...taskPool];
    const picks = [];
    while (picks.length < 3 && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      const [label] = pool.splice(idx, 1);
      picks.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${idx}-${picks.length}`, label, done: false });
    }
    return picks;
  }

  function renderTasks() {
    const tasks = state.practice.tasksByDate[todayISO] || [];
    dom.taskList.innerHTML = '';
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = task.done;
      input.id = `task-${index}`;
      input.addEventListener('change', (e) => {
        task.done = e.target.checked;
        saveState();
        updateTaskProgress(tasks);
        checkSuccess();
      });
      const text = document.createElement('span');
      text.textContent = task.label;
      label.append(input, text);
      li.append(label);
      dom.taskList.append(li);
    });
    try {
      localStorage.setItem(`empathy_tasks_${todayISO}`, JSON.stringify(tasks));
    } catch (err) {
      console.warn('Task cache failed', err);
    }
    updateTaskProgress(tasks);
  }

  function prefillTask(label) {
    const tasks = state.practice.tasksByDate[todayISO] || pickTasks();
    const exists = tasks.some((t) => t.label === label);
    if (!exists) tasks.unshift({ id: `prefill-${Date.now()}`, label, done: false });
    state.practice.tasksByDate[todayISO] = tasks.slice(0, 3);
    saveState();
    renderTasks();
    dom.taskProgress.textContent = 'Added to today';
    setTimeout(() => updateTaskProgress(state.practice.tasksByDate[todayISO]), 1500);
  }

  function hydrateTaskFromLegacy() {
    if (state.practice.tasksByDate[todayISO]) return;
    try {
      const legacy = localStorage.getItem(`empathy_tasks_${todayISO}`);
      if (legacy) {
        state.practice.tasksByDate[todayISO] = JSON.parse(legacy);
      }
    } catch (err) {
      console.warn('Legacy task import failed', err);
    }
  }

  function updateTaskProgress(tasks) {
    const done = tasks.filter((t) => t.done).length;
    dom.taskProgress.textContent = `${done}/${tasks.length || 3} done today`;
  }

  function initLog() {
    renderLog();
    dom.openLogModal.addEventListener('click', openModal);
    dom.closeLogModal.addEventListener('click', closeModal);
    dom.cancelLog.addEventListener('click', closeModal);
    dom.logModal.addEventListener('click', (e) => {
      if (e.target === dom.logModal) closeModal();
    });
    dom.downloadLog.addEventListener('click', downloadLog);
    dom.clearLog.addEventListener('click', () => {
      state.practice.log = [];
      saveState();
      renderLog();
    });
    dom.logForm.addEventListener('submit', (e) => {
      e.preventDefault();
      dom.logError.textContent = '';
      const date = dom.logDate.value;
      const mode = dom.logMode.value;
      const boundary = Number(dom.logBoundary.value);
      const note = dom.logNote.value.trim();
      if (!date || !mode || Number.isNaN(boundary) || boundary < 0 || boundary > 100 || !note) {
        dom.logError.textContent = 'Please add a date, mode, boundary 0-100, and a short note.';
        return;
      }
      state.practice.log.push({ isoDate: date, mode, boundary, note });
      saveState();
      renderLog();
      closeModal();
      checkSuccess();
      dom.logForm.reset();
    });
  }

  function renderLog() {
    dom.logRows.innerHTML = '';
    const entries = [...state.practice.log].sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1)).slice(0, 7);
    if (!entries.length) {
      dom.logRows.innerHTML = '<div class="log-row" role="row"><span role="cell">-</span><span role="cell">-</span><span role="cell">-</span><span role="cell">No entries yet</span></div>';
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'log-row';
      row.setAttribute('role', 'row');
      row.innerHTML = `
        <span role="cell">${formatDate(entry.isoDate)}</span>
        <span role="cell">${entry.mode}</span>
        <span role="cell">${entry.boundary}</span>
        <span role="cell">${entry.note}</span>
      `;
      dom.logRows.append(row);
    });
  }

  function openModal() {
    dom.logModal.hidden = false;
    dom.logDate.value = dom.logDate.value || todayISO;
    dom.logDate.focus();
  }

  function closeModal() {
    dom.logModal.hidden = true;
    dom.openLogModal.focus();
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }

  function downloadLog() {
    const blob = new Blob([JSON.stringify(state.practice.log, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'empathy_log.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function checkSuccess() {
    const tasks = state.practice.tasksByDate[todayISO] || [];
    const tasksDone = tasks.length && tasks.every((t) => t.done);
    const recent = state.practice.log.filter((entry) => {
      const entryDate = new Date(entry.isoDate);
      const diff = (today - entryDate) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
    const logGoal = recent.length >= 4;
    if ((tasksDone || logGoal) && !state.practice.successShown) {
      revealSuccess();
      state.practice.successShown = true;
      saveState();
    }
    dom.successBadge.hidden = !(tasksDone || logGoal);
  }

  function revealSuccess() {
    dom.successBadge.hidden = false;
    if (state.settings.reducedMotion) return;
    const colors = ['var(--affect)', 'var(--cog)', 'var(--comp)', 'var(--accent)'];
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = `${1 + Math.random()}s`;
      dom.confetti.append(piece);
      setTimeout(() => piece.remove(), 1400);
    }
  }

  function bindButtons() {
    dom.themeToggles.forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = state.settings.theme;
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
        applyTheme(next);
      });
    });

    dom.motionToggle.addEventListener('click', () => {
      applyReducedMotion(!state.settings.reducedMotion);
    });

    mqlTheme.addEventListener('change', () => {
      if (state.settings.theme === 'auto') applyTheme('auto', false);
    });

    mqlMotion.addEventListener('change', (e) => applyReducedMotion(e.matches));
  }
})();
