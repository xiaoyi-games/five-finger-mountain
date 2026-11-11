/**
 * game.js —— 手势试炼 · 五关闯关
 */

const $ = (id) => document.getElementById(id);

const G = {
  rock:     { emoji: '✊', name: '石头' },
  paper:    { emoji: '✋', name: '布' },
  scissors: { emoji: '✌', name: '剪刀' },
  unknown:  { emoji: '🤔', name: '识别中' },
  none:     { emoji: '🙋', name: '无手势' },
};

const el = {
  track: $('levelTrack'),
  video: $('video'), overlay: $('overlay'),
  handStatus: $('handStatus'), videoHint: $('videoHint'),
  holdFill: $('holdFill'), holdLabel: $('holdLabel'),
  playerGesture: $('playerGesture'), playerScore: $('playerScore'),
  cpuHand: $('cpuHand'), cpuGesture: $('cpuGesture'),
  cpuScore: $('cpuScore'), cpuStatus: $('cpuStatus'),
  levelName: $('levelName'), levelGoal: $('levelGoal'),
  bigState: $('bigState'), result: $('result'), seqBar: $('seqBar'),
  retryBtn: $('retryBtn'), menuBtn: $('menuBtn'),
  modalMask: $('modalMask'), modalIcon: $('modalIcon'), modalTitle: $('modalTitle'),
  modalDesc: $('modalDesc'), modalBody: $('modalBody'), modalActions: $('modalActions'),
};

const S = {
  phase: 'menu',        // menu | intro | countdown | input | show | wait | resolve | clear | fail
  levelIndex: 0,
  playerScore: 0,
  cpuScore: 0,
  tutTargets: ['rock', 'paper', 'scissors'],
  tutIndex: 0,
  seq: [],
  seqIndex: 0,
  seqMistakes: 0,
  lastPlayer: null,
  timers: [],
  rafId: 0,
  deadline: 0,
  cleared: 0,
};

/* ===================== 工具 ===================== */
function later(fn, ms) {
  const id = setTimeout(fn, ms);
  S.timers.push(id);
  return id;
}

function clearTimers() {
  S.timers.forEach(clearTimeout);
  S.timers = [];
}

function cancelLoop() {
  cancelAnimationFrame(S.rafId);
  S.rafId = 0;
}

const lv = () => LEVELS[S.levelIndex];

function judge(player, cpu) {
  if (player === cpu) return 'draw';
  return COUNTER[cpu] === player ? 'player' : 'cpu';
}

/* ===================== 渲染 ===================== */
function renderTrack() {
  el.track.innerHTML = LEVELS.map((level, i) => {
    let cls = 'node';
    if (i < S.cleared) cls += ' done';
    else if (i === S.cleared) cls += ' next';

    const playing = S.phase !== 'menu' && i === S.levelIndex;
    if (playing) cls += ' current';

    const mark = i < S.cleared ? '✓' : (i + 1);
    return `<div class="${cls}"><span>${mark}</span><em>${level.name}</em></div>`;
  }).join('');
}

function updateScore() {
  el.playerScore.textContent = S.playerScore;
  el.cpuScore.textContent = S.cpuScore;
}

function renderSeq(reveal) {
  el.seqBar.innerHTML = S.seq.map((g, i) => {
    let cls = 'seq-item';
    let txt = '·';
    if (reveal) {
      txt = G[g].emoji;
      cls += ' revealed';
    } else if (i < S.seqIndex) {
      txt = G[g].emoji;
      cls += ' done';
    } else if (i === S.seqIndex) {
      txt = '?';
      cls += ' current';
    }
    return `<div class="${cls}">${txt}</div>`;
  }).join('');
}

function clearSeqBar() {
  el.seqBar.innerHTML = '';
}

/* ===================== 弹窗 ===================== */
function openModal({ icon = '', title = '', desc = '', body = '', actions = [] }) {
  el.modalIcon.textContent = icon;
  el.modalTitle.textContent = title;
  el.modalDesc.textContent = desc;
  el.modalBody.innerHTML = body;
  el.modalActions.innerHTML = '';

  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-ghost');
    btn.textContent = a.label;
    btn.addEventListener('click', () => {
      Sound.unlock();
      a.onClick();
    });
    el.modalActions.appendChild(btn);
  });

  el.modalMask.classList.add('show');
}

function closeModal() {
  el.modalMask.classList.remove('show');
}

/* ===================== 关卡选择 ===================== */
function showMenu() {
  clearTimers();
  cancelLoop();
  S.phase = 'menu';
  renderTrack();

  el.levelName.textContent = '手势试炼';
  el.levelGoal.textContent = '选择一关开始挑战';
  el.bigState.textContent = '—';
  el.bigState.className = 'big-state';
  el.result.textContent = '';
  el.result.className = 'result';
  el.playerScore.textContent = '0';
  el.cpuScore.textContent = '0';
  el.cpuHand.textContent = '❓';
  el.cpuGesture.textContent = '—';
  el.cpuGesture.dataset.gesture = '';
  clearSeqBar();

  const rows = LEVELS.map((level, i) => {
    const unlocked = i <= S.cleared;
    const cleared = i < S.cleared;
    const cls = `level-row ${unlocked ? 'unlocked' : 'locked'} ${cleared ? 'cleared' : ''}`;
    const state = cleared ? '✓ 已通过' : (unlocked ? '▶ 可挑战' : '🔒 未解锁');
    return `<div class="${cls}" data-index="${i}">
      <span class="ln">${String(i + 1).padStart(2, '0')}</span>
      <span class="lname">${level.name}</span>
      <span class="lstate">${state}</span>
    </div>`;
  }).join('');

  openModal({
    icon: '🎮',
    title: '手势试炼',
    desc: '五道关卡，从认识手势到对决读心者。做出手势后保持约 1 秒即可锁定出拳。',
    body: `<div class="level-list">${rows}</div>`,
    actions: [],
  });

  el.modalBody.querySelectorAll('.level-row.unlocked').forEach((row) => {
    row.addEventListener('click', () => {
      Sound.unlock();
      startLevel(parseInt(row.dataset.index, 10));
    });
  });
}

/* ===================== 关卡流程 ===================== */
function startLevel(index) {
  clearTimers();
  cancelLoop();
  closeModal();

  S.levelIndex = index;
  S.playerScore = 0;
  S.cpuScore = 0;
  S.tutIndex = 0;
  S.seqIndex = 0;
  S.seqMistakes = 0;
  S.lastPlayer = null;
  S.seq = [];

  const level = lv();

  el.levelName.textContent = `第 ${index + 1} 关 · ${level.name}`;
  el.levelGoal.textContent = level.goal;
  el.bigState.textContent = '—';
  el.bigState.className = 'big-state';
  el.result.textContent = '';
  el.result.className = 'result';
  el.cpuHand.textContent = '❓';
  el.cpuHand.classList.remove('reveal');
  el.cpuGesture.textContent = '—';
  el.cpuGesture.dataset.gesture = '';
  el.cpuStatus.textContent = '待命';
  clearSeqBar();
  updateScore();
  renderTrack();

  S.phase = 'intro';
  showIntro(level);
}

function showIntro(level) {
  const icons = { tutorial: '👋', sequence: '🧠' };
  const icon = icons[level.type] || (level.boss ? '👁️' : '⚔️');

  openModal({
    icon,
    title: `第 ${S.levelIndex + 1} 关 · ${level.name}`,
    desc: level.intro,
    body: `<div class="goal-chip">目标：${level.goal}</div>`,
    actions: [
      {
        label: '开始',
        primary: true,
        onClick: () => {
          closeModal();
          if (level.type === 'sequence') {
            prepareSequence();
            showSequence(level.viewTime, enterInput);
          } else {
            beginCountdown();
          }
        },
      },
      { label: '返回选关', onClick: showMenu },
    ],
  });
}

function beginCountdown() {
  S.phase = 'countdown';
  resetRoundUI();
  Gesture.resetHold();

  let n = 3;
  el.bigState.textContent = n;
  el.bigState.classList.remove('danger');
  el.bigState.classList.add('pop');
  Sound.tick();

  const step = () => {
    n -= 1;
    if (n > 0) {
      el.bigState.textContent = n;
      el.bigState.classList.remove('pop');
      void el.bigState.offsetWidth;
      el.bigState.classList.add('pop');
      Sound.tick();
      later(step, 750);
    } else {
      Sound.go();
      later(() => {
        if (S.phase === 'countdown') enterInput();
      }, 320);
    }
  };

  later(step, 750);
}

function enterInput() {
  S.phase = 'input';
  Gesture.resetHold();
  el.result.textContent = '';
  el.result.className = 'result';
  el.bigState.classList.remove('danger');

  const level = lv();

  if (level.type === 'tutorial') {
    el.bigState.textContent = G[S.tutTargets[S.tutIndex]].emoji;
  } else if (level.type === 'sequence') {
    el.bigState.textContent = `${S.seqIndex + 1}/${S.seq.length}`;
    renderSeq(false);
  } else {
    el.bigState.textContent = '出拳';
  }

  if (level.type === 'rps' && level.limit) {
    S.deadline = performance.now() + level.limit * 1000;
    startLimitLoop();
  }
}

function startLimitLoop() {
  cancelLoop();
  const tick = () => {
    if (S.phase !== 'input') return;
    const left = (S.deadline - performance.now()) / 1000;
    if (left <= 0) {
      onTimeout();
      return;
    }
    el.bigState.textContent = left.toFixed(1);
    el.bigState.classList.toggle('danger', left < 1.5);
    el.bigState.classList.remove('pop');
    S.rafId = requestAnimationFrame(tick);
  };
  S.rafId = requestAnimationFrame(tick);
}

function onTimeout() {
  cancelLoop();
  S.phase = 'resolve';
  Sound.lose();

  el.bigState.textContent = '超时';
  el.bigState.classList.add('danger');
  el.result.textContent = '超时未出拳，判负一局';
  el.result.className = 'result lose';

  S.cpuScore += 1;
  S.lastPlayer = null;
  updateScore();

  const level = lv();
  if (S.cpuScore >= level.target) {
    later(() => levelFail('多次超时，对手先拿到了目标分'), 1200);
  } else {
    later(() => beginCountdown(), 1500);
  }
}

function resetRoundUI() {
  el.cpuHand.textContent = '❓';
  el.cpuHand.classList.remove('reveal');
  el.cpuGesture.textContent = '—';
  el.cpuGesture.dataset.gesture = '';
  el.result.textContent = '';
  el.result.className = 'result';
}

/* ===================== 出拳判定 ===================== */
function onConfirm(gesture) {
  if (gesture === 'none' || gesture === 'unknown') return;

  const level = lv();
  Sound.lock();

  if (level.type === 'tutorial') return tutorialConfirm(gesture);
  if (level.type === 'sequence') return sequenceConfirm(gesture);
  return rpsResolve(gesture);
}

function tutorialConfirm(gesture) {
  const target = S.tutTargets[S.tutIndex];

  if (gesture === target) {
    S.tutIndex += 1;
    Sound.win();
    el.bigState.textContent = '✓';
    el.bigState.classList.remove('pop');
    void el.bigState.offsetWidth;
    el.bigState.classList.add('pop');
    el.result.textContent = `正确！${G[target].emoji} ${G[target].name}`;
    el.result.className = 'result win';

    if (S.tutIndex >= S.tutTargets.length) {
      S.phase = 'resolve';
      later(levelClear, 700);
      return;
    }

    S.phase = 'wait';
    later(() => {
      if (S.phase !== 'wait') return;
      enterInput();
    }, 850);
  } else {
    Sound.error();
    el.result.textContent = `需要比出 ${G[target].emoji} ${G[target].name}`;
    el.result.className = 'result warn';

    S.phase = 'wait';
    later(() => {
      if (S.phase !== 'wait') return;
      enterInput();
    }, 750);
  }
}

/* ---- 记忆序列 ---- */
function prepareSequence() {
  const len = lv().length;
  S.seq = [];
  let prev = null;
  for (let i = 0; i < len; i += 1) {
    let g;
    do {
      g = POOL[Math.floor(Math.random() * 3)];
    } while (g === prev && Math.random() < 0.65);
    S.seq.push(g);
    prev = g;
  }
  S.seqIndex = 0;
  S.seqMistakes = 0;
  renderSeq(false);
}

function showSequence(duration, done) {
  S.phase = 'show';
  S.bigState.textContent = '记住';
  S.bigState.classList.remove('danger');
  el.result.textContent = '记住顺序…';
  el.result.className = 'result warn';
  renderSeq(true);

  later(() => {
    if (S.phase !== 'show') return;
    renderSeq(false);
    el.result.textContent = '';
    el.result.className = 'result';
    if (done) done();
  }, duration);
}

function sequenceConfirm(gesture) {
  const target = S.seq[S.seqIndex];

  if (gesture === target) {
    S.seqIndex += 1;
    Sound.win();
    el.result.textContent = `✓ ${G[gesture].emoji}`;
    el.result.className = 'result win';
    renderSeq(false);

    if (S.seqIndex >= S.seq.length) {
      S.phase = 'resolve';
      later(levelClear, 650);
      return;
    }

    S.phase = 'wait';
    later(() => {
      if (S.phase !== 'wait') return;
      enterInput();
    }, 600);
  } else {
    S.seqMistakes += 1;
    Sound.error();

    if (S.seqMistakes >= 2) {
      S.phase = 'resolve';
      levelFail('连续两次比错顺序');
      return;
    }

    el.result.textContent = '顺序不对，再看一遍序列';
    el.result.className = 'result warn';
    S.phase = 'wait';

    later(() => {
      if (S.phase !== 'wait') return;
      showSequence(2200, () => {
        S.seqIndex = 0;
        renderSeq(false);
        enterInput();
      });
    }, 600);
  }
}

/* ---- 猜拳对决 ---- */
function rpsResolve(player) {
  cancelLoop();
  S.phase = 'resolve';

  const level = lv();
  let cpu = POOL[Math.floor(Math.random() * 3)];

  // BOSS 读心：有 45% 概率出克制你上一局手势的拳
  if (level.boss && S.lastPlayer && Math.random() < 0.45) {
    cpu = COUNTER[S.lastPlayer];
  }

  el.result.textContent = '出拳中…';
  el.result.className = 'result';
  el.bigState.textContent = 'VS';
  el.bigState.classList.remove('danger');

  const frames = ['✊', '✋', '✌'];
  let i = 0;

  const cycle = () => {
    if (i >= 9) {
      revealResolution(player, cpu);
      return;
    }
    el.cpuHand.textContent = frames[i % 3];
    i += 1;
    later(cycle, 85);
  };

  cycle();
}

function revealResolution(player, cpu) {
  const level = lv();

  el.cpuHand.textContent = G[cpu].emoji;
  el.cpuHand.classList.remove('reveal');
  void el.cpuHand.offsetWidth;
  el.cpuHand.classList.add('reveal');
  el.cpuGesture.textContent = `${G[cpu].emoji} ${G[cpu].name}`;
  el.cpuGesture.dataset.gesture = cpu;

  const outcome = judge(player, cpu);
  S.lastPlayer = player;

  if (outcome === 'player') {
    S.playerScore += 1;
    el.result.textContent = `你赢了！${G[player].emoji} 胜 ${G[cpu].emoji}`;
    el.result.className = 'result win';
    el.bigState.textContent = '+1';
    Sound.win();
  } else if (outcome === 'cpu') {
    S.cpuScore += 1;
    el.result.textContent = `电脑赢了　${G[cpu].emoji} 胜 ${G[player].emoji}`;
    el.result.className = 'result lose';
    el.bigState.textContent = '-1';
    Sound.lose();
  } else {
    el.result.textContent = `平局　都是 ${G[player].emoji}`;
    el.result.className = 'result draw';
    el.bigState.textContent = '平';
    Sound.draw();
  }

  updateScore();

  if (S.playerScore >= level.target) {
    later(levelClear, 1300);
    return;
  }
  if (S.cpuScore >= level.target) {
    later(() => levelFail('对手先拿到了目标分'), 1300);
    return;
  }

  later(() => beginCountdown(), 1600);
}

/* ===================== 关卡结算 ===================== */
function levelClear() {
  clearTimers();
  cancelLoop();
  S.phase = 'clear';
  Sound.levelUp();

  const cleared = S.levelIndex + 1;
  if (cleared > S.cleared) {
    S.cleared = Math.min(cleared, LEVELS.length);
    saveProgress();
  }
  renderTrack();

  el.result.textContent = '';
  el.result.className = 'result';

  if (S.levelIndex >= LEVELS.length - 1) {
    showFinish();
    return;
  }

  openModal({
    icon: '🏅',
    title: `第 ${S.levelIndex + 1} 关通过`,
    desc: lv().clearText,
    body: `<div class="goal-chip">已完成 ${S.cleared} / ${LEVELS.length} 关</div>`,
    actions: [
      {
        label: '下一关',
        primary: true,
        onClick: () => startLevel(S.levelIndex + 1),
      },
      { label: '返回选关', onClick: showMenu },
    ],
  });
}

function levelFail(reason) {
  clearTimers();
  cancelLoop();
  S.phase = 'fail';
  Sound.fail();

  el.result.textContent = reason;
  el.result.className = 'result lose';

  openModal({
    icon: '😵',
    title: '挑战失败',
    desc: reason,
    actions: [
      { label: '重来一次', primary: true, onClick: () => startLevel(S.levelIndex) },
      { label: '返回选关', onClick: showMenu },
    ],
  });
}

function showFinish() {
  el.result.textContent = '全部关卡通关！';
  el.result.className = 'result win';

  openModal({
    icon: '🏆',
    title: '全部通关！',
    desc: '你用手势闯过了五道关卡，还战胜了会读心的 BOSS。手速与心态都是满分。',
    body: `<div class="goal-chip">通关进度 ${S.cleared} / ${LEVELS.length}</div>`,
    actions: [
      { label: '再玩一次', primary: true, onClick: () => startLevel(0) },
      { label: '返回选关', onClick: showMenu },
    ],
  });
}

/* ===================== 进度存档 ===================== */
function loadProgress() {
  const v = parseInt(localStorage.getItem('gestureTrials.cleared') || '0', 10);
  S.cleared = Number.isNaN(v) ? 0 : Math.max(0, Math.min(v, LEVELS.length));
}

function saveProgress() {
  try {
    localStorage.setItem('gestureTrials.cleared', String(S.cleared));
  } catch (e) {
    /* 隐私模式忽略 */
  }
}

/* ===================== 手势回调 ===================== */
function updateHandUI({ gesture, hold, hasHand }) {
  el.handStatus.textContent = hasHand ? '已识别' : '等待举手';
  el.handStatus.classList.toggle('on', hasHand);
  el.videoHint.style.opacity = hasHand ? '0' : '1';

  const info = G[gesture] || G.unknown;
  el.playerGesture.textContent = gesture === 'none'
    ? '把手放进画面'
    : `${info.emoji} ${info.name}`;
  el.playerGesture.dataset.gesture = gesture;

  const pct = Math.round(hold * 100);
  el.holdFill.style.width = `${pct}%`;

  const canLock = S.phase === 'input';
  el.holdFill.classList.toggle('on', canLock && pct > 0);
  el.holdFill.classList.toggle('full', pct >= 100);

  if (!canLock) {
    el.holdLabel.textContent = S.phase === 'show' ? '先记住序列' : '等待回合开始';
  } else if (pct >= 100) {
    el.holdLabel.textContent = '已锁定';
  } else if (gesture === 'none') {
    el.holdLabel.textContent = '请把手放进画面';
  } else if (gesture === 'unknown') {
    el.holdLabel.textContent = '手势不标准，调整一下';
  } else {
    el.holdLabel.textContent = `保持 ${info.name} 以锁定`;
  }
}

Gesture.init(el.video, el.overlay, {
  onFrame: (payload) => {
    updateHandUI(payload);
    if (S.phase === 'input' && payload.hold >= 1) {
      onConfirm(payload.gesture);
    }
  },
  onError: (msg) => {
    el.result.textContent = msg;
    el.result.className = 'result error';
  },
});

/* ===================== 画布尺寸 ===================== */
function fitCanvas() {
  el.overlay.width = el.video.videoWidth || 640;
  el.overlay.height = el.video.videoHeight || 480;
}

el.video.addEventListener('loadedmetadata', fitCanvas);
window.addEventListener('resize', fitCanvas);

/* ===================== 按钮 ===================== */
el.retryBtn.addEventListener('click', () => {
  if (S.phase === 'menu') return;
  Sound.unlock();
  startLevel(S.levelIndex);
});

el.menuBtn.addEventListener('click', () => {
  Sound.unlock();
  showMenu();
});

/* ===================== 启动 ===================== */
loadProgress();
renderTrack();
showMenu();
