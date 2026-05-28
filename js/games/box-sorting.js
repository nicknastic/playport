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

    // Trucks
    drawTruck(RED_X,  TRUCK_Y, '#c0392b', 'RED');
    drawTruck(BLUE_X, TRUCK_Y, '#2980b9', 'BLUE');

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

  function drawTruck(x, y, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 20, TRUCK_W, TRUCK_H - 20);
    ctx.fillRect(x + TRUCK_W - 30, y, 30, 30);
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x+20, y+TRUCK_H, 14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+TRUCK_W-15, y+TRUCK_H, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(x+20, y+TRUCK_H, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+TRUCK_W-15, y+TRUCK_H, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#aaddff';
    ctx.fillRect(x+TRUCK_W-26, y+4, 18, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText(label, x+8, y+42);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('TRUCK', x+4, y+54);
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
