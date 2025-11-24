(() => {
  const accordions = document.querySelectorAll('.accordion-trigger');
  const segments = document.querySelectorAll('.tablist .segment[role="tab"]');
  const audioButtons = document.querySelectorAll('.audio-trigger');
  const copyButtons = document.querySelectorAll('.copy-btn');
  const copyStatus = document.getElementById('copy-status');
  const tooltips = document.querySelectorAll('.tooltip-trigger');

  accordions.forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    panel.hidden = true;
    btn.addEventListener('click', () => toggleAccordion(btn, panel));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAccordion(btn, panel);
      }
    });
  });

  segments.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusSibling(btn, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        focusSibling(btn, -1);
      }
    });
  });

  function focusSibling(current, delta) {
    const tabs = Array.from(segments);
    const idx = tabs.indexOf(current);
    const next = tabs[(idx + delta + tabs.length) % tabs.length];
    next.focus();
    activateTab(next);
  }

  function activateTab(btn) {
    segments.forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', String(isActive));
      const panelId = b.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (panel) panel.hidden = !isActive;
    });
  }

  let audioCtx;
  const playing = new Map();
  audioButtons.forEach((btn, index) => {
    btn.dataset.audioId = String(index);
    btn.addEventListener('click', () => {
      const id = btn.dataset.audioId;
      if (playing.has(id)) {
        stopTone(id, btn);
        return;
      }
      playTone(id, btn);
    });
  });

  function playTone(id, btn) {
    const duration = Number(btn.dataset.duration || 18);
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 174;
    gain.gain.value = 0.04;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    btn.textContent = 'Pause audio';
    btn.setAttribute('aria-pressed', 'true');
    const timeout = setTimeout(() => stopTone(id, btn), duration * 1000);
    playing.set(id, { osc, gain, timeout });
  }

  function stopTone(id, btn) {
    const item = playing.get(id);
    if (!item) return;
    item.gain.gain.exponentialRampToValueAtTime(0.0001, item.gain.context.currentTime + 0.1);
    setTimeout(() => {
      item.osc.stop();
      item.osc.disconnect();
      item.gain.disconnect();
    }, 120);
    clearTimeout(item.timeout);
    playing.delete(id);
    btn.textContent = `Play ${btn.dataset.duration || 18}s audio`;
    btn.setAttribute('aria-pressed', 'false');
  }

  copyButtons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const panel = document.getElementById(targetId);
      if (!panel) return;
      try {
        await navigator.clipboard.writeText(panel.innerText.trim());
        announceCopy('Citations copied.');
      } catch {
        announceCopy('Copy failed. Select and copy manually.');
      }
    });
  });

  function announceCopy(message) {
    if (copyStatus) copyStatus.textContent = message;
  }

  function toggleAccordion(btn, panel) {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    const next = !isOpen;
    btn.setAttribute('aria-expanded', String(next));
    panel.hidden = !next;
    panel.classList.toggle('open', next);
    panel.style.maxHeight = next ? panel.scrollHeight + 'px' : '0';
  }

  tooltips.forEach((btn) => {
    btn.addEventListener('click', () => toggleTip(btn));
    btn.addEventListener('focus', () => openTip(btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTip(btn);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tooltips.forEach(closeTip);
  });

  function toggleTip(btn) {
    const isOpen = btn.dataset.open === 'true';
    tooltips.forEach(closeTip);
    btn.dataset.open = String(!isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  }

  function openTip(btn) {
    tooltips.forEach(closeTip);
    btn.dataset.open = 'true';
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeTip(btn) {
    btn.dataset.open = 'false';
    btn.setAttribute('aria-expanded', 'false');
  }
})();
