/* Clock - a game for kids learning to read an analog clock.
   Minimal text: icons only. Enter the shown time as 4 digits (HHMM), tap the check. */

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var MINUTE_SETS = [[0], [0, 30], [0, 15, 30, 45], null]; // level 3 = any 5 minutes

  var state = {
    level: clampLevel(parseInt(localStorage.getItem('clock.level') || '0', 10)),
    stars: parseInt(localStorage.getItem('clock.stars') || '0', 10) || 0,
    streak: parseInt(localStorage.getItem('clock.streak') || '0', 10) || 0,
    sound: localStorage.getItem('clock.sound') !== 'off',
    target: null, // {h: 1-12, m: 0-59}
    entry: '',
    locked: false
  };

  var el = {
    clock: document.getElementById('clock'),
    wrap: document.getElementById('clock-wrap'),
    stars: document.getElementById('stars'),
    streak: document.getElementById('streak'),
    feedback: document.getElementById('feedback'),
    confetti: document.getElementById('confetti'),
    sound: document.getElementById('sound'),
    digits: [0, 1, 2, 3].map(function (i) { return document.getElementById('d' + i); })
  };

  function clampLevel(n) {
    return (isNaN(n) || n < 0 || n > 3) ? 0 : n;
  }

  function save() {
    localStorage.setItem('clock.level', String(state.level));
    localStorage.setItem('clock.stars', String(state.stars));
    localStorage.setItem('clock.streak', String(state.streak));
    localStorage.setItem('clock.sound', state.sound ? 'on' : 'off');
  }

  // ---------- clock face ----------

  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function buildClock() {
    var s = el.clock;
    s.innerHTML = '';
    var cx = 150, cy = 150, r = 140;

    s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: '#ffffff', stroke: '#123324', 'stroke-width': 8 }));

    for (var i = 0; i < 60; i++) {
      var hourTick = i % 5 === 0;
      var a = i * 6 * Math.PI / 180;
      var r1 = hourTick ? r - 18 : r - 10;
      s.appendChild(svgEl('line', {
        x1: cx + r1 * Math.sin(a), y1: cy - r1 * Math.cos(a),
        x2: cx + (r - 4) * Math.sin(a), y2: cy - (r - 4) * Math.cos(a),
        stroke: '#123324', 'stroke-width': hourTick ? 5 : 2, 'stroke-linecap': 'round'
      }));
    }

    for (var n = 1; n <= 12; n++) {
      var ang = n * 30 * Math.PI / 180;
      var t = svgEl('text', {
        x: cx + (r - 36) * Math.sin(ang), y: cy - (r - 36) * Math.cos(ang),
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 30, 'font-weight': 800, fill: '#123324',
        'font-family': "'Nunito','Segoe UI',sans-serif"
      });
      t.textContent = String(n);
      s.appendChild(t);
    }

    var hourHand = svgEl('line', { id: 'hour-hand', x1: cx, y1: cy + 14, x2: cx, y2: cy - 66, stroke: '#123324', 'stroke-width': 10, 'stroke-linecap': 'round' });
    var minHand = svgEl('line', { id: 'min-hand', x1: cx, y1: cy + 14, x2: cx, y2: cy - 108, stroke: '#e2543e', 'stroke-width': 7, 'stroke-linecap': 'round' });
    s.appendChild(hourHand);
    s.appendChild(minHand);
    s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 9, fill: '#123324' }));
    s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 4, fill: '#ffffff' }));
  }

  function setHands(h, m) {
    var hd = el.clock.querySelector('#hour-hand');
    var md = el.clock.querySelector('#min-hand');
    var hDeg = ((h % 12) + m / 60) * 30;
    var mDeg = m * 6;
    hd.setAttribute('transform', 'rotate(' + hDeg + ' 150 150)');
    md.setAttribute('transform', 'rotate(' + mDeg + ' 150 150)');
  }

  // ---------- game logic ----------

  function newTarget() {
    var mins = MINUTE_SETS[state.level];
    var h, m, tries = 0;
    do {
      h = 1 + Math.floor(Math.random() * 12);
      m = mins ? mins[Math.floor(Math.random() * mins.length)]
               : 5 * Math.floor(Math.random() * 12);
      tries++;
    } while (state.target && h === state.target.h && m === state.target.m && tries < 20);
    state.target = { h: h, m: m };
    setHands(h, m);
    clearEntry();
  }

  function clearEntry() {
    state.entry = '';
    renderEntry();
  }

  function renderEntry(reveal) {
    var padded = state.entry;
    for (var i = 0; i < 4; i++) {
      var d = el.digits[i];
      d.textContent = i < padded.length ? padded[i] : '_';
      d.classList.toggle('next', !reveal && i === padded.length);
      d.classList.toggle('reveal', !!reveal);
    }
  }

  function pressDigit(k) {
    if (state.locked || state.entry.length >= 4) return;
    // keep hour 01..12: first digit can only be 0 or 1
    if (state.entry.length === 0 && !/[01]/.test(k)) {
      state.entry = '0' + k; // a lone 2-9 hour means 02..09
    } else if (state.entry.length === 1 && state.entry[0] === '1' && !/[0-2]/.test(k)) {
      state.entry = '0' + state.entry + k; // 1x only allows x<=2; treat as 01 then x starts minutes... shift: 01x
    } else {
      state.entry += k;
    }
    if (state.entry.length > 4) state.entry = state.entry.slice(-4);
    renderEntry();
  }

  function backspace() {
    if (state.locked) return;
    state.entry = state.entry.slice(0, -1);
    renderEntry();
  }

  function check() {
    if (state.locked) return;
    if (state.entry.length < 4) { shake(); playSound('bad'); return; }
    var h = parseInt(state.entry.slice(0, 2), 10);
    var m = parseInt(state.entry.slice(2, 4), 10);
    if (h < 1 || h > 12 || m > 59) { shake(); playSound('bad'); clearEntry(); return; }
    if (h === state.target.h && m === state.target.m) {
      state.locked = true;
      state.stars++;
      state.streak++;
      save();
      updateScore();
      showFeedback('good');
      confettiBurst();
      playSound('good');
      setTimeout(function () {
        state.locked = false;
        newTarget();
      }, 1400);
    } else {
      state.streak = 0;
      save();
      updateScore();
      shake();
      showFeedback('bad');
      playSound('bad');
      setTimeout(clearEntry, 650);
    }
  }

  function hint() {
    if (state.locked) return;
    state.streak = 0;
    save();
    updateScore();
    var t = state.target;
    state.entry = (t.h < 10 ? '0' : '') + t.h + (t.m < 10 ? '0' : '') + t.m;
    renderEntry(true);
    playSound('hint');
    setTimeout(function () { clearEntry(); renderEntry(); }, 1800);
  }

  function updateScore() {
    el.stars.textContent = state.stars;
    el.streak.textContent = state.streak;
  }

  function shake() {
    el.wrap.classList.remove('shake');
    void el.wrap.offsetWidth;
    el.wrap.classList.add('shake');
  }

  var SVG_GOOD = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#2e8b57"/><path d="M6.5 12.5l3.8 3.8L17.8 8.5" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SVG_BAD = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e2543e"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2.8" stroke-linecap="round" fill="none"/></svg>';
  var SVG_SOUND_ON = '<svg viewBox="0 0 24 24" class="ic"><path d="M4 9v6h4l5 4V5L8 9z" fill="#e8f5e9"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" fill="none" stroke="#e8f5e9" stroke-width="2" stroke-linecap="round"/></svg>';
  var SVG_SOUND_OFF = '<svg viewBox="0 0 24 24" class="ic"><path d="M4 9v6h4l5 4V5L8 9z" fill="#e8f5e9"/><path d="M16 9.5l5.5 5.5M21.5 9.5L16 15" stroke="#e8f5e9" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  function showFeedback(kind) {
    el.feedback.innerHTML = kind === 'good' ? SVG_GOOD : SVG_BAD;
    el.feedback.classList.remove('show');
    void el.feedback.offsetWidth;
    el.feedback.classList.add('show');
  }

  function confettiBurst() {
    var colors = ['#7ee081', '#7ee0c2', '#f2b8c6', '#ffb703', '#2e8b57', '#e8f5e9'];
    for (var i = 0; i < 26; i++) {
      var c = document.createElement('div');
      c.className = 'confetto';
      var ang = Math.random() * Math.PI * 2;
      var dist = 90 + Math.random() * 110;
      c.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      c.style.setProperty('--dy', Math.sin(ang) * dist - 60 + 'px');
      c.style.setProperty('--rot', Math.floor(Math.random() * 540 - 270) + 'deg');
      c.style.background = colors[i % colors.length];
      el.confetti.appendChild(c);
      (function (node) { setTimeout(function () { node.remove(); }, 1200); })(c);
    }
  }

  // ---------- sound (Web Audio, no assets) ----------

  var audioCtx = null;
  function tone(freq, start, dur, type, vol) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.18, audioCtx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + start);
      o.stop(audioCtx.currentTime + start + dur);
    } catch (e) { /* audio not available */ }
  }

  function playSound(kind) {
    if (kind === 'good') {
      tone(523, 0, 0.15); tone(659, 0.12, 0.15); tone(784, 0.24, 0.25);
    } else if (kind === 'bad') {
      tone(180, 0, 0.25, 'triangle', 0.12);
    } else if (kind === 'hint') {
      tone(880, 0, 0.12); tone(880, 0.18, 0.12);
    }
  }

  // ---------- wiring ----------

  Array.prototype.forEach.call(document.querySelectorAll('.key[data-k]'), function (b) {
    b.addEventListener('click', function () { pressDigit(b.getAttribute('data-k')); });
  });
  document.getElementById('back').addEventListener('click', backspace);
  document.getElementById('check').addEventListener('click', check);
  document.getElementById('hint').addEventListener('click', hint);

  Array.prototype.forEach.call(document.querySelectorAll('.level'), function (b) {
    b.addEventListener('click', function () {
      state.level = parseInt(b.getAttribute('data-level'), 10);
      save();
      markLevel();
      newTarget();
    });
  });

  function markLevel() {
    Array.prototype.forEach.call(document.querySelectorAll('.level'), function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-level'), 10) === state.level);
    });
  }

  el.sound.addEventListener('click', function () {
    state.sound = !state.sound;
    save();
    el.sound.innerHTML = state.sound ? SVG_SOUND_ON : SVG_SOUND_OFF;
    if (state.sound) playSound('hint');
  });

  document.addEventListener('keydown', function (e) {
    if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Enter') check();
  });

  // ---------- init ----------

  buildClock();
  markLevel();
  updateScore();
  el.sound.innerHTML = state.sound ? SVG_SOUND_ON : SVG_SOUND_OFF;
  newTarget();
})();
