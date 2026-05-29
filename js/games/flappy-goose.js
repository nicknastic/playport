const FlappyGooseGame = (() => {
  let canvas, ctx, raf, cb;
  let goose, pipes, score, gameOver, lastTime, pipeTimer, pipeInterval, started;
  let bgOffset, clouds;
  const W = 480, H = 440;
  const PIPE_W = 52, GAP = 140, PIPE_SPEED = 130;
  const GRAVITY = 520, FLAP_VY = -260;
  const GROUND_Y = H - 30;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    goose = { x: 80, y: H / 2, vy: 0, r: 20, wing: 0, wingDir: 1 };
    pipes = []; score = 0; gameOver = false; started = false;
    pipeTimer = 0; pipeInterval = 2.2; lastTime = 0; bgOffset = 0;

    // Clouds: x, y, scale, speed factor (parallax)
    clouds = [
      { x: 60,  y: 50,  s: 1.0, spd: 0.3 },
      { x: 200, y: 30,  s: 0.7, spd: 0.2 },
      { x: 340, y: 65,  s: 1.2, spd: 0.35 },
      { x: 460, y: 40,  s: 0.8, spd: 0.25 },
      { x: 560, y: 55,  s: 1.1, spd: 0.3 },
      { x: 700, y: 35,  s: 0.6, spd: 0.18 },
    ];

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('mousedown', onFlap);
    raf = requestAnimationFrame(loop);
  }

  function onKey(e) { if (e.key.toLowerCase() === 'w' || e.key === ' ') flap(); }
  function onFlap() { flap(); }

  function flap() {
    if (gameOver) return;
    if (!started) started = true;
    goose.vy = FLAP_VY;
    goose.wing = -0.5;
  }

  function addPipe() {
    const topH = 60 + Math.random() * (H - GAP - 120);
    pipes.push({ x: W + 10, top: topH, passed: false });
  }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!gameOver) { update(dt, ts); render(ts); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    if (!started) return;

    bgOffset += PIPE_SPEED * dt;

    // Scroll clouds
    clouds.forEach(c => {
      c.x -= PIPE_SPEED * c.spd * dt;
      if (c.x + 80 * c.s < 0) c.x = W + 80 * c.s;
    });

    goose.vy += GRAVITY * dt;
    goose.y  += goose.vy * dt;
    goose.wing += goose.wingDir * 8 * dt;
    if (goose.wing > 0.5 || goose.wing < -0.5) goose.wingDir *= -1;

    pipeTimer += dt;
    if (pipeTimer >= pipeInterval) { addPipe(); pipeTimer = 0; }

    pipes.forEach(p => {
      p.x -= PIPE_SPEED * dt;
      if (!p.passed && p.x + PIPE_W < goose.x) { p.passed = true; score++; }
      if (goose.x + goose.r - 10 > p.x && goose.x - goose.r + 10 < p.x + PIPE_W) {
        if (goose.y - goose.r < p.top || goose.y + goose.r > p.top + GAP) endGame();
      }
    });
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    if (goose.y + goose.r > GROUND_Y || goose.y - goose.r < 0) endGame();
  }

  function render(ts) {
    // ── Pokemon GBA sky ──
    PS.drawSky(ctx, W, 0, H);

    // ── Sun ──
    const sunX = W - 70, sunY = 55;
    // Rays
    ctx.strokeStyle = 'rgba(255,240,100,0.25)';
    ctx.lineWidth = 8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + ts * 0.0003;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a) * 30, sunY + Math.sin(a) * 30);
      ctx.lineTo(sunX + Math.cos(a) * 54, sunY + Math.sin(a) * 54);
      ctx.stroke();
    }
    // Sun disc
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 26);
    sunGrad.addColorStop(0,   '#ffffa0');
    sunGrad.addColorStop(0.6, '#ffdd00');
    sunGrad.addColorStop(1,   '#ffaa00');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

    // ── Distant tree line (tiny, very slow) ──
    PS.drawTreeRow(ctx, W, GROUND_Y - 58, 12, bgOffset * 0.06);

    // ── Background trees behind the hills ──
    PS.drawTreeRow(ctx, W, GROUND_Y - 70, 14, bgOffset * 0.09);
    PS.drawTreeRow(ctx, W, GROUND_Y - 90, 16, bgOffset * 0.11);

    // ── Far background hills (muted, very slow) ──
    ctx.fillStyle = '#7aaa78';
    drawHillRange(bgOffset * 0.1, GROUND_Y - 60, 260, 2.0, 0.3);

    // ── Mid hills (medium parallax) ──
    ctx.fillStyle = PS.PAL.grassMid;
    drawHillRange(bgOffset * 0.2, GROUND_Y - 45, 220, 2.5, 0.55);

    // ── Near rolling hills ──
    ctx.fillStyle = PS.PAL.treeBase;
    drawHillRange(bgOffset * 0.45, GROUND_Y - 22, 160, 2.5, 0.65);

    // ── Trees in front of hills (grounded at floor level) ──
    PS.drawTreeRow(ctx, W, GROUND_Y - 36, 18, bgOffset * 0.28);
    PS.drawTreeRow(ctx, W, GROUND_Y - 52, 26, bgOffset * 0.38);

    // ── Scrolling clouds ──
    clouds.forEach(c => drawCloud(c.x, c.y, c.s));

    // ── Distant pond ──
    const pondX = ((-bgOffset * 0.15) % (W + 200)) - 100;
    ctx.fillStyle = PS.PAL.water;
    ctx.beginPath();
    ctx.ellipse(pondX + 120, GROUND_Y - 6, 70, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(pondX + 105, GROUND_Y - 8, 20, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Ground layers ──
    // Dirt
    ctx.fillStyle = PS.PAL.pathDark;
    ctx.fillRect(0, GROUND_Y + 8, W, H - GROUND_Y - 8);
    // Grass strip
    const grassGrad = ctx.createLinearGradient(0, GROUND_Y - 4, 0, GROUND_Y + 10);
    grassGrad.addColorStop(0, PS.PAL.grassLight);
    grassGrad.addColorStop(1, PS.PAL.grassMid);
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, GROUND_Y - 4, W, 14);
    // Grass tufts scrolling
    ctx.fillStyle = PS.PAL.treeTip;
    for (let gx = (-bgOffset % 40); gx < W + 40; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx,     GROUND_Y - 4);
      ctx.lineTo(gx + 5, GROUND_Y - 12);
      ctx.lineTo(gx + 10, GROUND_Y - 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(gx + 18,  GROUND_Y - 4);
      ctx.lineTo(gx + 22,  GROUND_Y - 9);
      ctx.lineTo(gx + 26,  GROUND_Y - 4);
      ctx.fill();
    }

    // ── Trees / pipes ──
    pipes.forEach(p => {
      const bTop = p.top + GAP;
      drawTree(p.x, bTop, PIPE_W, GROUND_Y - bTop, false);
      drawTree(p.x, 0, PIPE_W, p.top, true);
    });

    // ── Goose ──
    if (!gameOver || started) drawGoose(goose.x, goose.y, goose.wing);

    // ── Score HUD (Pokemon dialog style) ──
    PS.dialogBox(ctx, W/2 - 38, 6, 76, 30);
    ctx.fillStyle = PS.PAL.uiText;
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(score, W/2 - (score >= 10 ? 10 : 5), 28);

    // Coin display
    PS.dialogBox(ctx, 6, 6, 90, 26);
    ctx.fillStyle = '#b07800';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('🪙 ' + Math.floor(score / 5), 12, 24);

    if (!started) {
      ctx.fillStyle = 'rgba(0,30,60,0.55)';
      ctx.fillRect(0, 0, W, H);
      PS.dialogBox(ctx, W/2 - 120, H/2 - 24, 240, 50);
      ctx.fillStyle = PS.PAL.uiText;
      ctx.font = '10px "Press Start 2P"';
      ctx.fillText('PRESS W TO START', W/2 - 102, H/2 + 2);
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = '#666';
      ctx.fillText('(or click)', W/2 - 36, H/2 + 18);
    }
  }

  // Rolling hill range using sine waves
  function drawHillRange(offset, baseY, amplitude, freq, phase) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const y = baseY - Math.abs(Math.sin((x + offset) * 0.008 * freq + phase)) * amplitude;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  // Jagged mountain range
  function drawMountainRange(offset, baseY, amplitude, count, phase) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    const step = W / count;
    for (let i = -1; i <= count + 1; i++) {
      const x = i * step - (offset % step);
      const peak = baseY - amplitude * (0.5 + 0.5 * Math.sin(i * 2.3 + phase));
      if (i === -1) ctx.moveTo(x, peak);
      else { ctx.lineTo(x - step * 0.5, baseY - amplitude * 0.3); ctx.lineTo(x, peak); }
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    const puffs = [
      [0,  0,  30], [30, -10, 24], [-28, -6, 20],
      [56, 0,  18], [-52, 2,  16], [14, -18, 18],
    ];
    puffs.forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    });
    // Soft shadow underneath
    ctx.fillStyle = 'rgba(100,140,180,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14 * s, 56 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTree(x, y, w, h, flipped) {
    if (h <= 0) return;
    const tw = 16, tx = x + (w - tw) / 2;
    ctx.fillStyle = '#5a3200';
    ctx.fillRect(tx, y, tw, h);
    const layers = 3;
    const lh = Math.min(h * 0.8, 80);
    const startY = flipped ? y + h : y;
    const dir = flipped ? -1 : 1;
    for (let i = 0; i < layers; i++) {
      const ly = startY + dir * (i * lh * 0.35);
      const lw = w * (0.6 + i * 0.2);
      ctx.fillStyle = i === 0 ? '#267300' : (i === 1 ? '#1a5c00' : '#134d00');
      ctx.beginPath();
      if (flipped) {
        ctx.moveTo(x+w/2, ly - lh*0.5); ctx.lineTo(x+w/2-lw/2, ly); ctx.lineTo(x+w/2+lw/2, ly);
      } else {
        ctx.moveTo(x+w/2, ly + lh*0.5); ctx.lineTo(x+w/2-lw/2, ly); ctx.lineTo(x+w/2+lw/2, ly);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#336600';
    ctx.fillRect(x, flipped ? y : y + h - 8, w, 8);
  }

  function drawGoose(x, y, wing) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#e8e8e0';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(22, -10, 11, 9, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ddd8cc';
    ctx.beginPath(); ctx.moveTo(14,-4); ctx.lineTo(24,-12); ctx.lineTo(22,-4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a020';
    ctx.beginPath(); ctx.moveTo(32,-10); ctx.lineTo(40,-8); ctx.lineTo(32,-6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(26,-12, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(27,-13, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ccc8b8';
    ctx.save(); ctx.rotate(wing);
    ctx.beginPath(); ctx.ellipse(-4, 2, 18, 8, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#d0ccc0';
    ctx.beginPath(); ctx.moveTo(-18,2); ctx.lineTo(-28,-4); ctx.lineTo(-28,8); ctx.closePath(); ctx.fill();
    // Feet
    ctx.strokeStyle = '#e8a020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-4, 20); ctx.lineTo(-12, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 6, 12); ctx.lineTo( 6, 20); ctx.lineTo( 14, 20); ctx.stroke();
    ctx.restore();
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);
    const earned = Math.floor(score / 5);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('HONK!', W/2 - 52, H/2 - 40);
    ctx.fillStyle = '#9bbc0f';
    ctx.fillText('GAME OVER', W/2 - 90, H/2);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('Trees passed: ' + score, W/2 - 80, H/2 + 40);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens earned: ' + earned, W/2 - 80, H/2 + 70);
    if (cb) cb(earned);
  }

  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    if (canvas) canvas.removeEventListener('mousedown', onFlap);
  }

  return { start, stop };
})();
