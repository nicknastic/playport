const BoxSortingGame = (() => {
  let canvas, ctx, raf, cb;
  let boxes, score, miss, speed, spawnTimer, spawnInterval, gameOver, lastTime, drag;
  const W = 480, H = 440;
  const BELT_Y = 100, BELT_H = 60;
  const TRUCK_W = 100, TRUCK_H = 80;
  const RED_X = 30, BLUE_X = W - 30 - TRUCK_W;
  const TRUCK_Y = H - TRUCK_H - 20;
  // Animated belt offset
  let beltOffset = 0;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    boxes = []; score = 0; miss = 0; speed = 35; drag = null;  // slower start
    spawnTimer = 0; spawnInterval = 3.2; gameOver = false; lastTime = 0; beltOffset = 0;
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(loop);
  }

  function spawnBox() {
    // 40% red, 40% blue, 20% grey (decoy)
    const roll = Math.random();
    let color, label;
    if (roll < 0.4)      { color = 'red';  label = 'RED';  }
    else if (roll < 0.8) { color = 'blue'; label = 'BLUE'; }
    else                 { color = 'grey'; label = '???';  }

    boxes.push({
      x: W + 30, y: BELT_Y + 8,
      w: 44, h: 44,
      color, label,
      vx: -speed,
      dragging: false
    });
  }

  function mpos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    const m = mpos(e);
    drag = boxes.find(b => !b.dragging && m.x > b.x && m.x < b.x+b.w && m.y > b.y && m.y < b.y+b.h) || null;
    if (drag) { drag.dragging = true; drag.ox = m.x - drag.x; drag.oy = m.y - drag.y; }
  }
  function onMove(e) {
    if (!drag) return;
    const m = mpos(e);
    drag.x = m.x - drag.ox;
    drag.y = m.y - drag.oy;
  }
  function onUp() {
    if (!drag) return;
    const cx = drag.x + drag.w/2, cy = drag.y + drag.h/2;
    const onRed  = cx > RED_X  && cx < RED_X  + TRUCK_W && cy > TRUCK_Y;
    const onBlue = cx > BLUE_X && cx < BLUE_X + TRUCK_W && cy > TRUCK_Y;

    if (onRed || onBlue) {
      if (drag.color === 'grey') {
        // Grey box goes on neither truck - penalise
        miss++;
        flashMsg = { text: 'WRONG! Grey = NO TRUCK', t: 1.5, color: '#ff8800' };
      } else {
        const correct = (onRed && drag.color === 'red') || (onBlue && drag.color === 'blue');
        if (correct) { score++; flashMsg = { text: '+1', t: 0.6, color: '#9bbc0f' }; }
        else         { miss++;  flashMsg = { text: 'WRONG TRUCK!', t: 1.0, color: '#ff4444' }; }
      }
      boxes.splice(boxes.indexOf(drag), 1);
    } else {
      drag.dragging = false;
    }
    drag = null;
    if (miss >= 5) endGame();
  }

  let flashMsg = null;

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!gameOver) { update(dt); render(); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    beltOffset = (beltOffset + speed * dt) % 40;

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnBox(); spawnTimer = 0;
      // Slow ramp-up, capped lower than before
      spawnInterval = Math.max(1.4, spawnInterval - 0.06);
      speed = Math.min(80, speed + 2);   // max 80 (was 160)
    }

    boxes.forEach(b => {
      if (!b.dragging) {
        b.x += b.vx * dt;
        b.vx = -speed;
      }
      // Grey boxes that reach left edge just disappear (no miss penalty)
      if (b.x + b.w < 0) {
        if (b.color !== 'grey') miss++;
        boxes.splice(boxes.indexOf(b), 1);
      }
    });

    if (flashMsg) flashMsg.t -= dt;

    if (miss >= 5) endGame();
  }

  function render() {
    // ── Pokemon Mart / warehouse interior ──
    ctx.fillStyle = PS.PAL.indoorWall;
    ctx.fillRect(0, 0, W, BELT_Y - 10);
    ctx.fillStyle = '#8090b8';
    ctx.fillRect(0, BELT_Y - 18, W, 8);
    PS.drawIndoorFloor(ctx, W, H, BELT_Y - 10);
    ctx.fillStyle = PS.PAL.pathDark;
    ctx.fillRect(0, TRUCK_Y + TRUCK_H, W, H);

    // Animated belt
    ctx.fillStyle = '#555';
    ctx.fillRect(0, BELT_Y, W, BELT_H);
    for (let x = -40 + (beltOffset % 40); x < W + 40; x += 40) {
      ctx.fillStyle = '#484848';
      ctx.fillRect(x, BELT_Y + 2, 20, BELT_H - 4);
    }
    // Belt rails
    ctx.fillStyle = '#777';
    ctx.fillRect(0, BELT_Y, W, 5);
    ctx.fillRect(0, BELT_Y + BELT_H - 5, W, 5);
    // Belt label
    ctx.fillStyle = '#888';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('CONVEYOR BELT  ◀◀◀', 10, BELT_Y - 8);

    // Trucks — red faces right (cab on right), blue faces left (mirrored)
    drawTruck(RED_X,  TRUCK_Y, '#c0392b', 'RED',  false);
    drawTruck(BLUE_X, TRUCK_Y, '#2980b9', 'BLUE', true);

    // Grey bin in the middle (discard zone for grey boxes)
    const binX = W/2 - 35, binY = TRUCK_Y + 10;
    ctx.fillStyle = '#666';
    ctx.fillRect(binX, binY, 70, 55);
    ctx.fillStyle = '#444';
    ctx.fillRect(binX - 4, binY - 6, 78, 12);
    ctx.fillStyle = '#aaa';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('TRASH', binX + 10, binY + 30);
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('🗑', binX + 22, binY + 48);

    // Boxes
    boxes.forEach(b => {
      let bg, cross, border;
      if (b.color === 'red')  { bg = '#c0392b'; cross = '#8b0000'; border = '#ff6666'; }
      else if (b.color==='blue'){ bg = '#2980b9'; cross = '#00008b'; border = '#66aaff'; }
      else                    { bg = '#888';    cross = '#555';    border = '#ccc';    }

      ctx.fillStyle = bg;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = cross; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x+b.w,b.y+b.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x+b.w,b.y); ctx.lineTo(b.x,b.y+b.h); ctx.stroke();
      ctx.strokeStyle = border; ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '6px "Press Start 2P"';
      ctx.fillText(b.label, b.x + (b.w - ctx.measureText(b.label).width)/2, b.y + b.h - 6);

      // Question mark on grey
      if (b.color === 'grey') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Press Start 2P"';
        ctx.fillText('?', b.x + b.w/2 - 5, b.y + b.h/2 + 6);
      }
    });

    // ── Pokemon dialog HUD ──
    PS.dialogBox(ctx, 4, 4, 130, 38);
    ctx.fillStyle = PS.PAL.uiText;
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('SORTED: ' + score, 10, 18);
    ctx.fillStyle = '#c82020';
    ctx.fillText('MISS: ' + miss + '/5', 10, 34);
    PS.dialogBox(ctx, W/2 - 36, 4, 72, 26);
    ctx.fillStyle = '#b07800';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('🪙 ' + Math.floor(score/5), W/2 - 26, 22);
    PS.hpBar(ctx, W - 110, 12, 100, 10, miss > 0 ? 1 - miss/5 : 1);

    // Flash message
    if (flashMsg && flashMsg.t > 0) {
      ctx.fillStyle = flashMsg.color;
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText(flashMsg.text, W/2 - 60, BELT_Y - 28);
    }

    // Legend
    ctx.fillStyle = '#888';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('? grey box = ignore', 10, H - 8);
  }

  function drawTruck(x, y, color, label, flipped = false) {
    const TW = TRUCK_W, TH = TRUCK_H;
    const trailerW = 62, cabW = 38;

    // Mirror for right-side truck
    if (flipped) {
      ctx.save();
      ctx.translate(x + TW, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    // ── TOP-DOWN VIEW ──
    // Layout: [trailer ........][cab]
    const cabX = x + trailerW;
    const hi  = color === '#c0392b' ? '#e05858' : '#3daee8';
    const mid = color === '#c0392b' ? '#a02222' : '#1a6090';

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 4, y + TH, TW - 2, 5);

    // ── Trailer chassis / outer frame ──
    ctx.fillStyle = '#252525';
    ctx.fillRect(x, y + 3, trailerW, TH - 6);

    // Trailer deck — planks (top-down: horizontal stripes, light wood style tinted by color)
    const deckX = x + 3, deckY = y + 6, deckW = trailerW - 6, deckH = TH - 12;
    const plankCount = 7;
    const plankH = deckH / plankCount;
    for (let i = 0; i < plankCount; i++) {
      // Alternate slightly lighter/darker
      ctx.fillStyle = i % 2 === 0 ? hi : color;
      ctx.fillRect(deckX, deckY + i * plankH, deckW, plankH - 0.5);
    }
    // Subtle wood-grain lines
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(deckX + 8 + i * 16, deckY + 2, 1, deckH - 4);
    }

    // Trailer side rails (top and bottom edges)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 2, y + 3, trailerW - 4, 3);
    ctx.fillRect(x + 2, y + TH - 6, trailerW - 4, 3);

    // Tie-down clips along top and bottom rails
    ctx.fillStyle = '#111';
    for (let i = 0; i < 6; i++) {
      const cx2 = x + 4 + i * 10;
      ctx.fillRect(cx2, y + 1, 4, 5);     // top clip
      ctx.fillRect(cx2, y + TH - 6, 4, 5); // bottom clip
    }

    // Trailer rear board (left end)
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y + 3, 3, TH - 6);

    // Rear trailer wheels (top-down: two pairs visible on sides)
    [[x + 14, y + 2], [x + 30, y + 2]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(wx - 4, wy - 5, 8, 5);
      ctx.fillStyle = '#606060'; ctx.fillRect(wx - 3, wy - 4, 6, 3);
    });
    [[x + 14, y + TH - 2], [x + 30, y + TH - 2]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(wx - 4, wy, 8, 5);
      ctx.fillStyle = '#606060'; ctx.fillRect(wx - 3, wy + 1, 6, 3);
    });

    // Label on trailer
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = '7px "Press Start 2P"';
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, deckX + (deckW - lw) / 2 + 1, deckY + deckH / 2 + 4);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, deckX + (deckW - lw) / 2, deckY + deckH / 2 + 3);
    ctx.restore();

    // ── Cab (top-down, boxy cab-over) ──
    // Outer shell
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cabX, y + 2, cabW, TH - 4);
    // Main white/silver roof panel
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(cabX + 2, y + 5, cabW - 6, TH - 10);
    // Roof highlight (sunlit top)
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cabX + 4, y + 7, cabW - 14, TH - 14);
    // Center roof vent / AC unit
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(cabX + 6, y + TH/2 - 5, cabW - 18, 10);
    ctx.fillStyle = '#888';
    ctx.fillRect(cabX + 7, y + TH/2 - 4, cabW - 20, 8);

    // Color accent stripes along sides
    ctx.fillStyle = color;
    ctx.fillRect(cabX + 2, y + 3, cabW - 6, 4);
    ctx.fillRect(cabX + 2, y + TH - 7, cabW - 6, 4);
    // Dark stripe just inside color stripe
    ctx.fillStyle = mid;
    ctx.fillRect(cabX + 2, y + 6, cabW - 6, 2);
    ctx.fillRect(cabX + 2, y + TH - 8, cabW - 6, 2);

    // Windshield (right/front face of cab, top-down = narrow strip)
    ctx.fillStyle = '#2a4a60';
    ctx.fillRect(cabX + cabW - 5, y + 5, 5, TH - 10);
    // Windshield glare
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(cabX + cabW - 4, y + 6, 2, 7);

    // Mirrors sticking out top and bottom
    ctx.fillStyle = '#555';
    ctx.fillRect(cabX + 3, y - 1, 9, 4);
    ctx.fillRect(cabX + 3, y + TH - 3, 9, 4);
    ctx.fillStyle = '#888';
    ctx.fillRect(cabX + 4, y, 7, 2);
    ctx.fillRect(cabX + 4, y + TH - 2, 7, 2);

    // Steer-axle wheels
    [[cabX + 10, y + 1], [cabX + 10, y + TH - 1]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(wx - 4, wy - 5, 8, 5);
      ctx.fillStyle = '#606060'; ctx.fillRect(wx - 3, wy - 4, 6, 3);
    });
    [[cabX + 10, y + TH - 1]].forEach(([wx, wy]) => {
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(wx - 4, wy, 8, 5);
      ctx.fillStyle = '#606060'; ctx.fillRect(wx - 3, wy + 1, 6, 3);
    });

    if (flipped) ctx.restore();
  }

  function endGame() {
    gameOver = true;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseup', onUp);
    const earned = Math.floor(score / 5);
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('GAME OVER', W/2-90, H/2-30);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('Sorted: ' + score + ' boxes', W/2-90, H/2+10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens earned: ' + earned, W/2-80, H/2+40);
    if (cb) cb(earned);
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (canvas) {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
    }
  }

  return { start, stop };
})();
