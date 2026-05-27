const TileSortingGame = (() => {
  let canvas, ctx, raf, cb;
  let tiles, slots, drag, score, level, levelComplete, gameOver, completePause;
  const W = 480, H = 440;
  const TILE_SIZE = 62;
  const SLOT_SIZE = 62;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    score = 0; level = 1; gameOver = false; levelComplete = false; completePause = 0; drag = null;
    buildLevel();
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(loop);
  }

  // How many tiles per level (starts at 4, grows to 6)
  function tileCount() { return Math.min(6, 3 + level); }

  function buildLevel() {
    levelComplete = false;
    completePause = 0;
    const n = tileCount();

    // Target slots: evenly spread across top area
    slots = [];
    const totalW = n * SLOT_SIZE + (n-1) * 10;
    const startX = (W - totalW) / 2;
    for (let i = 0; i < n; i++) {
      slots.push({
        num: i + 1,
        x: startX + i * (SLOT_SIZE + 10),
        y: 60,
        filled: false,
        flash: 0,     // >0 = green flash timer
        wrongFlash: 0 // >0 = red flash timer
      });
    }

    // Tiles: same numbers, scattered randomly in bottom half
    const positions = shufflePositions(n);
    tiles = [];
    for (let i = 0; i < n; i++) {
      tiles.push({
        num: i + 1,
        x: positions[i].x,
        y: positions[i].y,
        homeX: positions[i].x,
        homeY: positions[i].y,
        placed: false,
        shake: 0   // wrong drop shake animation
      });
    }
  }

  function shufflePositions(n) {
    // Place tiles in a grid in the bottom half, shuffled
    const cols = Math.ceil(n / 2);
    const cellW = (W - 40) / cols;
    const positions = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        x: 20 + col * cellW + cellW/2 - TILE_SIZE/2 + (Math.random()-0.5)*20,
        y: 230 + row * (TILE_SIZE + 18) + (Math.random()-0.5)*12
      });
    }
    // Fisher-Yates shuffle
    for (let i = positions.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions;
  }

  function mpos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (levelComplete) return;
    const m = mpos(e);
    // Pick up topmost unplaced tile under cursor
    for (let i = tiles.length - 1; i >= 0; i--) {
      const t = tiles[i];
      if (t.placed) continue;
      if (m.x >= t.x && m.x <= t.x + TILE_SIZE && m.y >= t.y && m.y <= t.y + TILE_SIZE) {
        drag = t;
        drag.ox = m.x - t.x;
        drag.oy = m.y - t.y;
        // Bring to front
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
    const cx = drag.x + TILE_SIZE/2;
    const cy = drag.y + TILE_SIZE/2;

    // Check if dropped on a slot
    let dropped = false;
    for (const s of slots) {
      if (s.filled) continue;
      if (cx >= s.x && cx <= s.x + SLOT_SIZE && cy >= s.y && cy <= s.y + SLOT_SIZE) {
        if (drag.num === s.num) {
          // Correct!
          drag.x = s.x + (SLOT_SIZE - TILE_SIZE) / 2;
          drag.y = s.y + (SLOT_SIZE - TILE_SIZE) / 2;
          drag.placed = true;
          s.filled = true;
          s.flash = 0.7;
          score += 20;
          dropped = true;

          // Check level complete
          if (slots.every(sl => sl.filled)) {
            levelComplete = true;
            completePause = 2.0;
            score += level * 30;  // level bonus
          }
        } else {
          // Wrong slot - shake and send home
          s.wrongFlash = 0.5;
          drag.shake = 0.4;
          drag.x = drag.homeX;
          drag.y = drag.homeY;
          dropped = true;
        }
        break;
      }
    }

    if (!dropped) {
      // Didn't land on any slot — return home
      drag.x = drag.homeX;
      drag.y = drag.homeY;
    }

    drag = null;
  }

  function loop(ts) {
    update(ts);
    render(ts);
    raf = requestAnimationFrame(loop);
  }

  let lastTs = 0;
  function update(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    // Tick flash timers
    slots.forEach(s => {
      if (s.flash > 0) s.flash -= dt;
      if (s.wrongFlash > 0) s.wrongFlash -= dt;
    });
    tiles.forEach(t => { if (t.shake > 0) t.shake -= dt; });

    // Level complete pause then advance
    if (levelComplete) {
      completePause -= dt;
      if (completePause <= 0) {
        level++;
        buildLevel();
      }
    }
  }

  function render(ts) {
    ctx.fillStyle = '#001208';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('TILE SORTING', W/2 - 70, 28);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#668844';
    ctx.fillText('Level ' + level + '  |  ' + tileCount() + ' tiles', W/2 - 58, 44);

    // HUD
    ctx.fillStyle = '#f1c40f';
    ctx.font = '9px "Press Start 2P"';
    ctx.fillText('🪙 ' + Math.floor(score/10), W - 80, 28);

    // Instruction strip
    ctx.fillStyle = 'rgba(0,40,20,0.7)';
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = '#449944';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Drag each tile to the matching numbered slot', 14, H - 10);

    // ── Slots ──
    slots.forEach(s => {
      // Slot background
      let slotColor = '#002a14';
      if (s.filled && s.flash > 0) slotColor = `rgba(50,200,80,${s.flash / 0.7})`;
      else if (s.filled) slotColor = '#004422';
      if (s.wrongFlash > 0) slotColor = `rgba(200,50,50,${s.wrongFlash / 0.5})`;

      ctx.fillStyle = slotColor;
      roundRect(ctx, s.x, s.y, SLOT_SIZE, SLOT_SIZE, 8); ctx.fill();

      ctx.strokeStyle = s.filled ? '#44cc66' : '#336633';
      ctx.lineWidth = 2;
      roundRect(ctx, s.x, s.y, SLOT_SIZE, SLOT_SIZE, 8); ctx.stroke();

      // Slot number label
      ctx.fillStyle = s.filled ? '#44cc66' : '#55aa55';
      ctx.font = 'bold 18px "Press Start 2P"';
      ctx.fillText(s.num, s.x + SLOT_SIZE/2 - (s.num >= 10 ? 12 : 6), s.y + SLOT_SIZE/2 - 4);

      // Dot guide (small)
      ctx.fillStyle = s.filled ? '#44cc66' : '#336633';
      drawDots(ctx, s.x, s.y, s.num, SLOT_SIZE, s.filled ? '#44cc66' : '#336633', 0.55);

      // Check mark when filled
      if (s.filled) {
        ctx.fillStyle = '#44ff88';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('✓', s.x + SLOT_SIZE - 18, s.y + 16);
      }
    });

    // ── Tiles ──
    tiles.forEach(t => {
      if (t.placed) return;   // placed tiles stay in slots (drawn above via slot)
      const shakeX = t.shake > 0 ? (Math.sin(t.shake * 60) * 4 * (t.shake / 0.4)) : 0;
      const tx = t.x + shakeX, ty = t.y;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, tx+4, ty+4, TILE_SIZE, TILE_SIZE, 8); ctx.fill();

      // Tile body
      const hue = (t.num - 1) * 50;
      ctx.fillStyle = drag === t ? `hsl(${hue},70%,38%)` : `hsl(${hue},65%,28%)`;
      roundRect(ctx, tx, ty, TILE_SIZE, TILE_SIZE, 8); ctx.fill();
      ctx.strokeStyle = `hsl(${hue},80%,55%)`;
      ctx.lineWidth = drag === t ? 3 : 2;
      roundRect(ctx, tx, ty, TILE_SIZE, TILE_SIZE, 8); ctx.stroke();

      // Number (big)
      ctx.fillStyle = `hsl(${hue},90%,80%)`;
      ctx.font = 'bold 22px "Press Start 2P"';
      ctx.fillText(t.num, tx + TILE_SIZE/2 - (t.num >= 10 ? 14 : 7), ty + 28);

      // Dots below number
      drawDots(ctx, tx, ty + 4, t.num, TILE_SIZE, `hsl(${hue},80%,65%)`, 0.7);

      // Lift shadow when dragging
      if (drag === t) {
        ctx.strokeStyle = `hsla(${hue},100%,70%,0.5)`;
        ctx.lineWidth = 6;
        roundRect(ctx, tx-3, ty-3, TILE_SIZE+6, TILE_SIZE+6, 10); ctx.stroke();
      }
    });

    // ── Level complete overlay ──
    if (levelComplete && completePause > 0.5) {
      ctx.fillStyle = 'rgba(0,30,15,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#44ff88';
      ctx.font = '20px "Press Start 2P"';
      ctx.fillText('LEVEL ' + level, W/2 - 60, H/2 - 30);
      ctx.fillStyle = '#9bbc0f';
      ctx.fillText('COMPLETE!', W/2 - 68, H/2 + 10);
      ctx.fillStyle = '#f1c40f';
      ctx.font = '9px "Press Start 2P"';
      ctx.fillText('Score: ' + score, W/2 - 40, H/2 + 46);
    }
  }

  function drawDots(ctx, tx, ty, count, size, color, yStart) {
    // Dot positions for 1-6 on a tile (bottom half)
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
      // Only render dots in bottom yStart..1.0 range of the tile
      const absY = ty + py * size;
      if (absY < ty + size * yStart) return;
      ctx.beginPath();
      ctx.arc(tx + px * size, absY, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (canvas) {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
    }
    const earned = Math.floor(score / 10);
    if (cb) cb(earned);
  }

  return { start, stop };
})();
