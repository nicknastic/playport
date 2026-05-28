const TileSortingGame = (() => {
  let canvas, ctx, raf, cb;
  let tiles, slots, drag, score, level, levelComplete, gameOver, completePause, cbCalled;
  let timeLeft, roundTime;
  let lastTs = 0;
  const W = 480, H = 440;
  const TILE_SIZE = 62;
  const SLOT_SIZE = 62;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    score = 0; level = 1; gameOver = false; levelComplete = false;
    completePause = 0; drag = null; cbCalled = false; lastTs = 0;
    buildLevel();
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(loop);
  }

  // ── Fisher-Yates shuffle (in-place, returns array) ──
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Tile count grows by 1 each level, starting at 3, capped at 9 ──
  function tileCount() {
    return Math.min(2 + level, 9);
  }

  function buildLevel() {
    levelComplete = false;
    completePause = 0;
    const n = tileCount();

    // Fixed 15-second timer every round
    roundTime = 15;
    timeLeft = roundTime;

    // ── Slots: spread across top, numbers in RANDOM order ──
    slots = [];
    const slotNums = shuffle(Array.from({ length: n }, (_, i) => i + 1));
    const totalW = n * SLOT_SIZE + (n - 1) * 10;
    const startX = (W - totalW) / 2;
    for (let i = 0; i < n; i++) {
      slots.push({
        num: slotNums[i],
        x: startX + i * (SLOT_SIZE + 10),
        y: 60,
        filled: false,
        flash: 0,
        wrongFlash: 0
      });
    }

    // ── Tiles: numbers 1-n, scattered randomly in bottom half ──
    const positions = shufflePositions(n);
    tiles = shuffle(Array.from({ length: n }, (_, i) => ({
      num: i + 1,
      x: positions[i].x,
      y: positions[i].y,
      homeX: positions[i].x,
      homeY: positions[i].y,
      placed: false,
      shake: 0
    })));
  }

  function shufflePositions(n) {
    const cols = Math.ceil(n / 2);
    const cellW = (W - 40) / cols;
    const positions = Array.from({ length: n }, (_, i) => ({
      x: 20 + (i % cols) * cellW + cellW / 2 - TILE_SIZE / 2 + (Math.random() - 0.5) * 22,
      y: 235 + Math.floor(i / cols) * (TILE_SIZE + 20) + (Math.random() - 0.5) * 14
    }));
    return shuffle(positions);
  }

  function mpos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (levelComplete || gameOver) return;
    const m = mpos(e);
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i];
      if (t.placed) continue;
      if (m.x >= t.x && m.x <= t.x + TILE_SIZE && m.y >= t.y && m.y <= t.y + TILE_SIZE) {
        drag = t;
        drag.ox = m.x - t.x;
        drag.oy = m.y - t.y;
        tiles.splice(i, 1);
        tiles.push(drag);
        break;
      }
    }
  }

  function onMove(e) {
    if (!drag) return;
    const m = mpos(e);
    drag.x = m.x - drag.ox;
    drag.y = m.y - drag.oy;
  }

  function onUp() {
    if (!drag) return;
    const cx = drag.x + TILE_SIZE / 2;
    const cy = drag.y + TILE_SIZE / 2;
    let dropped = false;

    for (const s of slots) {
      if (s.filled) continue;
      if (cx >= s.x && cx <= s.x + SLOT_SIZE && cy >= s.y && cy <= s.y + SLOT_SIZE) {
        if (drag.num === s.num) {
          drag.x = s.x + (SLOT_SIZE - TILE_SIZE) / 2;
          drag.y = s.y + (SLOT_SIZE - TILE_SIZE) / 2;
          drag.placed = true;
          s.filled = true;
          s.flash = 0.7;
          score += 20 + level * 2;
          dropped = true;
          if (slots.every(sl => sl.filled)) {
            levelComplete = true;
            completePause = 2.0;
            score += level * 30;
          }
        } else {
          s.wrongFlash = 0.5;
          drag.shake = 0.4;
          drag.x = drag.homeX;
          drag.y = drag.homeY;
          dropped = true;
        }
        break;
      }
    }

    if (!dropped) { drag.x = drag.homeX; drag.y = drag.homeY; }
    drag = null;
  }

  function loop(ts) {
    if (gameOver) return;
    update(ts);
    render(ts);
    raf = requestAnimationFrame(loop);
  }

  function update(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    slots.forEach(s => {
      if (s.flash > 0)      s.flash      -= dt;
      if (s.wrongFlash > 0) s.wrongFlash -= dt;
    });
    tiles.forEach(t => { if (t.shake > 0) t.shake -= dt; });

    if (levelComplete) {
      completePause -= dt;
      if (completePause <= 0) { level++; buildLevel(); }
      return;   // don't tick timer during complete pause
    }

    // Countdown timer
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    }
  }

  function render(ts) {
    ctx.fillStyle = '#001208';
    ctx.fillRect(0, 0, W, H);

    // ── Header ──
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('TILE SORTING', W / 2 - 70, 28);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#668844';
    const n = slots.length;
    ctx.fillText('Level ' + level + '  |  ' + n + ' tiles', W / 2 - 58, 44);

    // Score
    ctx.fillStyle = '#f1c40f';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText('🪙 ' + Math.floor(score / 10), 10, 28);

    // ── Timer ──
    const timerRatio = timeLeft / roundTime;
    const timerColor = timerRatio > 0.45 ? '#44cc44' : timerRatio > 0.2 ? '#ddaa00' : '#ff3300';

    // Timer bar (bottom of screen)
    ctx.fillStyle = '#001a0a';
    ctx.fillRect(0, H - 18, W, 18);
    ctx.fillStyle = timerColor;
    ctx.fillRect(2, H - 16, Math.max(0, (W - 4) * timerRatio), 14);
    // Timer border
    ctx.strokeStyle = '#224422';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, H - 16, W - 4, 14);

    // Timer number (flashes red when low)
    const secs = Math.ceil(timeLeft);
    const flash = timeLeft < 6 && Math.floor(ts / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#ff6666' : timerColor;
    ctx.font = (timeLeft < 6 ? '11' : '9') + 'px "Press Start 2P"';
    ctx.fillText(secs + 's', W - 44, H - 4);

    // Instruction
    ctx.fillStyle = '#334433';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('Match each tile to its numbered slot!', 8, H - 22);

    // ── Slots ──
    slots.forEach(s => {
      let slotColor = '#002a14';
      if (s.filled && s.flash > 0)  slotColor = `rgba(50,200,80,${s.flash / 0.7})`;
      else if (s.filled)            slotColor = '#004422';
      if (s.wrongFlash > 0)         slotColor = `rgba(200,50,50,${s.wrongFlash / 0.5})`;

      ctx.fillStyle = slotColor;
      roundRect(ctx, s.x, s.y, SLOT_SIZE, SLOT_SIZE, 8); ctx.fill();
      ctx.strokeStyle = s.filled ? '#44cc66' : '#336633';
      ctx.lineWidth = 2;
      roundRect(ctx, s.x, s.y, SLOT_SIZE, SLOT_SIZE, 8); ctx.stroke();

      ctx.fillStyle = s.filled ? '#44cc66' : '#55aa55';
      ctx.font = 'bold 18px "Press Start 2P"';
      ctx.fillText(s.num, s.x + SLOT_SIZE / 2 - (s.num >= 10 ? 12 : 6), s.y + SLOT_SIZE / 2 - 4);

      drawDots(ctx, s.x, s.y, s.num, SLOT_SIZE, s.filled ? '#44cc66' : '#336633', 0.55);

      if (s.filled) {
        ctx.fillStyle = '#44ff88';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('✓', s.x + SLOT_SIZE - 18, s.y + 16);
      }
    });

    // ── Tiles ──
    tiles.forEach(t => {
      if (t.placed) return;
      const shakeX = t.shake > 0 ? (Math.sin(t.shake * 60) * 4 * (t.shake / 0.4)) : 0;
      const tx = t.x + shakeX, ty = t.y;
      const hue = (t.num - 1) * 50;

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, tx + 4, ty + 4, TILE_SIZE, TILE_SIZE, 8); ctx.fill();

      ctx.fillStyle = drag === t ? `hsl(${hue},70%,38%)` : `hsl(${hue},65%,28%)`;
      roundRect(ctx, tx, ty, TILE_SIZE, TILE_SIZE, 8); ctx.fill();
      ctx.strokeStyle = `hsl(${hue},80%,55%)`;
      ctx.lineWidth = drag === t ? 3 : 2;
      roundRect(ctx, tx, ty, TILE_SIZE, TILE_SIZE, 8); ctx.stroke();

      ctx.fillStyle = `hsl(${hue},90%,80%)`;
      ctx.font = 'bold 22px "Press Start 2P"';
      ctx.fillText(t.num, tx + TILE_SIZE / 2 - (t.num >= 10 ? 14 : 7), ty + 28);

      drawDots(ctx, tx, ty + 4, t.num, TILE_SIZE, `hsl(${hue},80%,65%)`, 0.7);

      if (drag === t) {
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.5)`;
        ctx.lineWidth = 6;
        roundRect(ctx, tx - 3, ty - 3, TILE_SIZE + 6, TILE_SIZE + 6, 10); ctx.stroke();
      }
    });

    // ── Level complete overlay ──
    if (levelComplete && completePause > 0.5) {
      ctx.fillStyle = 'rgba(0,30,15,0.88)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#44ff88';
      ctx.font = '20px "Press Start 2P"';
      ctx.fillText('LEVEL ' + level, W / 2 - 60, H / 2 - 30);
      ctx.fillStyle = '#9bbc0f';
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText('COMPLETE!', W / 2 - 68, H / 2 + 10);
      ctx.fillStyle = '#f1c40f';
      ctx.font = '9px "Press Start 2P"';
      ctx.fillText('Score: ' + score, W / 2 - 40, H / 2 + 46);
    }
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseup', onUp);

    const earned = Math.floor(score / 10);

    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff4444';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText('TIME\'S UP!', W / 2 - 72, H / 2 - 50);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('GAME OVER', W / 2 - 90, H / 2 - 10);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#fff';
    ctx.fillText('Levels: ' + level, W / 2 - 44, H / 2 + 30);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens: ' + earned, W / 2 - 50, H / 2 + 56);

    if (!cbCalled) { cbCalled = true; if (cb) cb(earned); }
  }

  function drawDots(ctx, tx, ty, count, size, color, yStart) {
    const patterns = [
      [],
      [[0.5, 0.5]],
      [[0.3, 0.3], [0.7, 0.7]],
      [[0.3, 0.3], [0.5, 0.5], [0.7, 0.7]],
      [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
      [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5], [0.3, 0.7], [0.7, 0.7]],
      [[0.3, 0.25], [0.7, 0.25], [0.3, 0.5], [0.7, 0.5], [0.3, 0.75], [0.7, 0.75]],
    ];
    const dots = patterns[Math.min(count, 6)];
    const dotR = size * 0.055;
    ctx.fillStyle = color;
    dots.forEach(([px, py]) => {
      const absY = ty + py * size;
      if (absY < ty + size * yStart) return;
      ctx.beginPath();
      ctx.arc(tx + px * size, absY, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (canvas) {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
    }
    if (!cbCalled) { cbCalled = true; if (cb) cb(Math.floor(score / 10)); }
  }

  return { start, stop };
})();
