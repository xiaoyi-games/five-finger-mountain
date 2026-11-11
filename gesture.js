/**
 * gesture.js
 * 手势识别：MediaPipe Hands 21 关键点 → 石头 / 布 / 剪刀
 * 新增：稳定性判定（hold），手势保持 HOLD_MS 才算"锁定"，解决抖动误判。
 *
 * 关键点索引: 0 腕 | 1-4 拇指 | 5-8 食指 | 9-12 中指 | 13-16 无名指 | 17-20 小指
 */

const Gesture = (() => {
  const HOLD_MS = 950;          // 需要稳定保持的时长
  const MIRROR = true;          // 画面镜像

  let hands = null;
  let camera = null;
  let canvasEl = null;
  let ctx = null;
  let onFrameCb = () => {};
  let onErrorCb = () => {};

  let stableGesture = 'none';
  let stableSince = performance.now();
  let holdRatio = 0;

  async function init(videoEl, overlayEl, { onFrame, onError } = {}) {
    onFrameCb = onFrame || (() => {});
    onErrorCb = onError || (() => {});
    canvasEl = overlayEl;
    ctx = canvasEl.getContext('2d');

    hands = new Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    hands.onResults(onResults);

    try {
      camera = new Camera(videoEl, {
        onFrame: async () => {
          if (hands) await hands.send({ image: videoEl });
        },
        width: 640,
        height: 480,
      });
      await camera.start();
    } catch (err) {
      console.error('Camera error:', err);
      onErrorCb('摄像头打开失败，请在浏览器允许摄像头权限后刷新页面');
    }
  }

  function stop() {
    if (camera) camera.stop();
    camera = null;
    if (hands) hands.close();
    hands = null;
  }

  /** 重置保持计时（换回合时调用） */
  function resetHold() {
    stableGesture = 'none';
    stableSince = performance.now();
    holdRatio = 0;
  }

  function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    if (MIRROR) {
      ctx.translate(canvasEl.width, 0);
      ctx.scale(-1, 1);
    }

    const list = results.multiHandLandmarks;
    let gesture = 'none';
    let hasHand = false;

    if (list && list.length) {
      hasHand = true;
      const lm = list[0];
      drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: 'rgba(0,255,153,0.85)', lineWidth: 3 });
      drawLandmarks(ctx, lm, { color: '#ff3366', lineWidth: 1, radius: 3 });
      gesture = classify(lm);
    }

    ctx.restore();

    // ---- 稳定性判定 ----
    const now = performance.now();
    if (gesture === stableGesture) {
      if (gesture !== 'none' && gesture !== 'unknown') {
        holdRatio = Math.min(1, (now - stableSince) / HOLD_MS);
      } else {
        holdRatio = 0;
      }
    } else {
      stableGesture = gesture;
      stableSince = now;
      holdRatio = 0;
    }

    onFrameCb({ gesture, hold: holdRatio, hasHand });
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /**
   * 距离法判定手指伸展：指尖离手腕比 PIP 离手腕更远 → 伸直。
   * 相比 y 坐标比较，不受手部旋转影响。
   */
  function classify(lm) {
    const wrist = lm[0];
    const fingers = [
      { tip: 8, pip: 6 },   // 食指
      { tip: 12, pip: 10 }, // 中指
      { tip: 16, pip: 14 }, // 无名指
      { tip: 20, pip: 18 }, // 小指
    ];

    const ext = fingers.map(
      (f) => dist(lm[f.tip], wrist) > dist(lm[f.pip], wrist) * 1.08
    );
    const count = ext.filter(Boolean).length;

    if (count === 0) return 'rock';
    if (count >= 3) return 'paper';
    if (count === 2 && ext[0] && ext[1]) return 'scissors';
    return 'unknown';
  }

  return { init, stop, classify, resetHold };
})();
