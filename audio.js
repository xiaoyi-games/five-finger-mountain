/**
 * audio.js —— 用 Web Audio API 实时合成音效，无需任何音频文件
 */
const Sound = (() => {
  let ac = null;

  function ctx() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      ac = new C();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone({ freq = 440, to = null, dur = 0.15, type = 'sine', gain = 0.12, delay = 0 } = {}) {
    try {
      const c = ctx();
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const g = c.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(g);
      g.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) {
      /* 静默失败，不影响游戏 */
    }
  }

  return {
    unlock() { try { ctx(); } catch (e) {} },
    tick() { tone({ freq: 620, dur: 0.09, type: 'triangle', gain: 0.09 }); },
    go() { tone({ freq: 880, to: 1320, dur: 0.22, type: 'triangle', gain: 0.13 }); },
    lock() {
      tone({ freq: 1180, dur: 0.07, type: 'square', gain: 0.06 });
      tone({ freq: 1560, dur: 0.09, type: 'square', gain: 0.05, delay: 0.06 });
    },
    win() { [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.16, gain: 0.1, delay: i * 0.08 })); },
    lose() { tone({ freq: 392, to: 180, dur: 0.42, type: 'sawtooth', gain: 0.08 }); },
    draw() { tone({ freq: 466, dur: 0.22, gain: 0.08 }); },
    error() { tone({ freq: 190, to: 120, dur: 0.16, type: 'square', gain: 0.07 }); },
    levelUp() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.1, delay: i * 0.1 })); },
    fail() { [330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'sawtooth', gain: 0.07, delay: i * 0.15 })); },
  };
})();
