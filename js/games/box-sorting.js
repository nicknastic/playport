const BoxSortingGame = (() => {
  let canvas, ctx, raf, cb;
  let boxes, score, miss, speed, spawnTimer, spawnInterval, gameOver, lastTime, drag;
  const W = 480, H = 440;
  const BELT_Y = 100, BELT_H = 60;
  const TRUCK_W = 58, TRUCK_H = 135;           // vertical: narrow width, tall height
  const RED_X = 28, BLUE_X = W - 28 - TRUCK_W; // 28 and 394
  const TRUCK_Y = H - TRUCK_H - 8;             // sits near bottom
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

    // Trucks — both vertical, cab at top facing up toward belt
    drawTruck(RED_X,  TRUCK_Y, '#c0392b', 'RED');
    drawTruck(BLUE_X, TRUCK_Y, '#2980b9', 'BLUE');

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

  function drawTruck(x, y, color, label) {
    // ── VERTICAL TOP-DOWN VIEW — cab at top, trailer going down ──
    const TW = TRUCK_W;   // 58px wide
    const TH = TRUCK_H;   // 135px tall
    const cabH  = 44;     // cab section
    const gap   = 6;      // coupling gap
    const trailY = y + cabH + gap;
    const trailH = TH - cabH - gap;
    const cx = x + TW / 2; // horizontal centre

    const hi  = color === '#c0392b' ? '#d94f4f' : '#3daee8';
    const dim = color === '#c0392b' ? '#7a1010' : '#104a70';

    // ── Drop shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 6, y + TH + 2, TW - 4, 6);

    // ══════════════ TRAILER ══════════════
    // Outer metal frame
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, trailY, TW, trailH);

    // Trailer skin — corrugated vertical ribs (like right photo)
    const ribCount = 9;
    const ribW = (TW - 6) / ribCount;
    for (let i = 0; i < ribCount; i++) {
      const rx = x + 3 + i * ribW;
      const bright = i % 2 === 0;
      ctx.fillStyle = bright ? hi : color;
      ctx.fillRect(rx, trailY + 2, ribW - 0.5, trailH - 4);
    }
    // Subtle horizontal seam lines across ribs
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let s = 1; s <= 3; s++) {
      ctx.fillRect(x + 3, trailY + s * (trailH / 4), TW - 6, 1);
    }

    // Left and right side rails
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x,          trailY, 3, trailH);
    ctx.fillRect(x + TW - 3, trailY, 3, trailH);
    // Rail edge highlight
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 2,      trailY, 1, trailH);
    ctx.fillRect(x + TW - 3, trailY, 1, trailH);

    // Tie-down hardware along left and right rails
    ctx.fillStyle = '#111';
    const clipCount = 7;
    for (let i = 0; i < clipCount; i++) {
      const cy2 = trailY + 4 + i * ((trailH - 8) / (clipCount - 1));
      ctx.fillRect(x - 2,      cy2 - 2, 5, 4);  // left clip
      ctx.fillRect(x + TW - 3, cy2 - 2, 5, 4);  // right clip
    }

    // Rear bumper bar (bottom of trailer)
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 2, y + TH - 4, TW - 4, 4);
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x + 4, y + TH - 3, TW - 8, 2);

    // Rear axle wheels (left and right of trailer bottom)
    [x - 6, x + TW - 4].forEach(wx => {
      ctx.fillStyle = '#111'; ctx.fillRect(wx, y + TH - 22, 10, 16);
      ctx.fillStyle = '#666'; ctx.fillRect(wx + 1, y + TH - 21, 8, 14);
      ctx.fillStyle = '#333'; ctx.fillRect(wx + 3, y + TH - 19, 4, 10);
    });
    // Second rear axle wheels slightly higher
    [x - 6, x + TW - 4].forEach(wx => {
      ctx.fillStyle = '#111'; ctx.fillRect(wx, y + TH - 42, 10, 16);
      ctx.fillStyle = '#666'; ctx.fillRect(wx + 1, y + TH - 41, 8, 14);
      ctx.fillStyle = '#333'; ctx.fillRect(wx + 3, y + TH - 39, 4, 10);
    });

    // Label on trailer
    ctx.save();
    ctx.translate(x + TW / 2, trailY + trailH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '7px "Press Start 2P"';
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, -lw / 2 + 1, 4);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, -lw / 2, 3);
    ctx.restore();

    // ══════════════ COUPLING / 5TH WHEEL ══════════════
    ctx.fillStyle = '#444';
    ctx.fillRect(x + 8, y + cabH, TW - 16, gap);
    ctx.fillStyle = '#666';
    ctx.fillRect(x + 10, y + cabH + 1, TW - 20, gap - 2);
    // King pin
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.arc(cx, y + cabH + gap / 2, 3, 0, Math.PI * 2); ctx.fill();

    // ══════════════ CAB (nose at top) ══════════════
    // Cab outer shell (slightly wider silhouette)
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.moveTo(x + 6,      y + cabH);      // rear left
    ctx.lineTo(x,          y + cabH - 6);  // mid-left
    ctx.lineTo(x + 2,      y + 8);         // front left shoulder
    ctx.lineTo(x + TW / 2, y);             // nose tip
    ctx.lineTo(x + TW - 2, y + 8);         // front right shoulder
    ctx.lineTo(x + TW,     y + cabH - 6);  // mid-right
    ctx.lineTo(x + TW - 6, y + cabH);      // rear right
    ctx.closePath();
    ctx.fill();

    // Main roof panel (silver/white)
    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.moveTo(x + 8,      y + cabH - 1);
    ctx.lineTo(x + 2,      y + cabH - 7);
    ctx.lineTo(x + 4,      y + 10);
    ctx.lineTo(x + TW / 2, y + 2);
    ctx.lineTo(x + TW - 4, y + 10);
    ctx.lineTo(x + TW - 2, y + cabH - 7);
    ctx.lineTo(x + TW - 8, y + cabH - 1);
    ctx.closePath();
    ctx.fill();

    // Roof highlight (sunlit centre strip)
    ctx.fillStyle = '#efefef';
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + cabH - 2);
    ctx.lineTo(cx - 4, y + 4);
    ctx.lineTo(cx,     y + 2);
    ctx.lineTo(cx + 4, y + 4);
    ctx.lineTo(cx + 6, y + cabH - 2);
    ctx.closePath();
    ctx.fill();

    // Air dam spoiler at rear of cab (bottom edge)
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x + 6, y + cabH - 6, TW - 12, 5);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x + 8, y + cabH - 5, TW - 16, 3);

    // Windshield (dark strip near top of cab, just below nose)
    ctx.fillStyle = '#1a3048';
    ctx.beginPath();
    ctx.moveTo(x + 5,      y + 10);
    ctx.lineTo(x + TW - 5, y + 10);
    ctx.lineTo(x + TW - 7, y + 22);
    ctx.lineTo(x + 7,      y + 22);
    ctx.closePath();
    ctx.fill();
    // Windshield glare
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(x + 7,  y + 11);
    ctx.lineTo(x + 14, y + 11);
    ctx.lineTo(x + 12, y + 20);
    ctx.lineTo(x + 7,  y + 20);
    ctx.closePath();
    ctx.fill();

    // Hood / engine area below windshield
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(x + 7, y + 22, TW - 14, cabH - 28);
    // Hood panel lines
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(cx - 1, y + 24, 2, cabH - 30);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(cx + 2, y + 24, 4, cabH - 30);

    // Color accent stripe across the cab middle
    ctx.fillStyle = color;
    ctx.fillRect(x + 4, y + 23, TW - 8, 4);
    ctx.fillStyle = dim;
    ctx.fillRect(x + 4, y + 26, TW - 8, 2);

    // Exhaust stacks (small circles left and right of hood)
    [x + 5, x + TW - 9].forEach(sx => {
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(sx + 2, y + 30, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(sx + 2, y + 30, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    // Mirrors — sticking out LEFT and RIGHT (near windshield level)
    ctx.fillStyle = '#444';
    ctx.fillRect(x - 8, y + 12, 8, 5);   // left mirror arm
    ctx.fillRect(x + TW, y + 12, 8, 5);  // right mirror arm
    ctx.fillStyle = '#888';
    ctx.fillRect(x - 10, y + 11, 6, 7);  // left mirror glass
    ctx.fillRect(x + TW + 4, y + 11, 6, 7); // right mirror glass

    // Front steer-axle wheels
    [x - 6, x + TW - 4].forEach(wx => {
      ctx.fillStyle = '#111'; ctx.fillRect(wx, y + 28, 10, 16);
      ctx.fillStyle = '#666'; ctx.fillRect(wx + 1, y + 29, 8, 14);
      ctx.fillStyle = '#333'; ctx.fillRect(wx + 3, y + 31, 4, 10);
    });
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
