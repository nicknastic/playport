const FlappyGooseGame = (() => {
  let canvas, ctx, raf, cb;
  let goose, pipes, score, gameOver, lastTime, pipeTimer, pipeInterval, started;
  const W = 480, H = 440;
  const PIPE_W = 52, GAP = 140, PIPE_SPEED = 130;
  const GRAVITY = 520, FLAP_VY = -260;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    goose = { x: 80, y: H / 2, vy: 0, r: 20, wing: 0, wingDir: 1 };
    pipes = []; score = 0; gameOver = false; started = false;
    pipeTimer = 0; pipeInterval = 2.2; lastTime = 0;
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
    if (!gameOver) { update(dt); render(ts); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    if (!started) return;
    goose.vy += GRAVITY * dt;
    goose.y  += goose.vy * dt;
    goose.wing += goose.wingDir * 8 * dt;
    if (goose.wing > 0.5 || goose.wing < -0.5) goose.wingDir *= -1;

    pipeTimer += dt;
    if (pipeTimer >= pipeInterval) { addPipe(); pipeTimer = 0; }

    pipes.forEach(p => {
      p.x -= PIPE_SPEED * dt;
      if (!p.passed && p.x + PIPE_W < goose.x) { p.passed = true; score++; }
      // Collision
      if (goose.x + goose.r - 10 > p.x && goose.x - goose.r + 10 < p.x + PIPE_W) {
        if (goose.y - goose.r < p.top || goose.y + goose.r > p.top + GAP) endGame();
      }
    });
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    if (goose.y + goose.r > H - 8 || goose.y - goose.r < 0) endGame();
  }

  function render(ts) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#001a33');
    sky.addColorStop(1, '#003366');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    [[80,60,60,25],[220,90,80,20],[380,50,70,30],[150,140,50,18]].forEach(([x,y,w,h]) => {
      ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI*2); ctx.fill();
    });

    // Ground
    ctx.fillStyle = '#1a4a00';
    ctx.fillRect(0, H - 8, W, 8);

    // Pipes (trees)
    pipes.forEach(p => {
      // Bottom pipe
      const bTop = p.top + GAP;
      drawTree(p.x, bTop, PIPE_W, H - bTop - 8, false);
      // Top pipe
      drawTree(p.x, 0, PIPE_W, p.top, true);
    });

    // Goose
    if (!gameOver || started) drawGoose(goose.x, goose.y, goose.wing);

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(score, W/2 - 8, 36);

    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9bbc0f';
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText('PRESS W TO START', W/2 - 100, H/2);
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#aaa';
      ctx.fillText('(or click)', W/2 - 40, H/2 + 30);
    }
  }

  function drawTree(x, y, w, h, flipped) {
    if (h <= 0) return;
    // Trunk
    ctx.fillStyle = '#5a3200';
    const tw = 16, tx = x + (w - tw) / 2;
    ctx.fillRect(tx, y, tw, h);
    // Foliage layers
    const layers = 3;
    const lh = Math.min(h * 0.8, 80);
    const startY = flipped ? y + h : y;
    const dir = flipped ? -1 : 1;
    ctx.fillStyle = '#1a6600';
    for (let i = 0; i < layers; i++) {
      const ly = startY + dir * (i * lh * 0.35);
      const lw = w * (0.6 + i * 0.2);
      ctx.beginPath();
      if (flipped) {
        ctx.moveTo(x + w/2, ly - lh * 0.5);
        ctx.lineTo(x + w/2 - lw/2, ly);
        ctx.lineTo(x + w/2 + lw/2, ly);
      } else {
        ctx.moveTo(x + w/2, ly + lh * 0.5);
        ctx.lineTo(x + w/2 - lw/2, ly);
        ctx.lineTo(x + w/2 + lw/2, ly);
      }
      ctx.closePath();
      ctx.fillStyle = i === 0 ? '#267300' : (i === 1 ? '#1a5c00' : '#134d00');
      ctx.fill();
    }
    // Cap
    ctx.fillStyle = '#336600';
    ctx.fillRect(x, flipped ? y : y + h - 8, w, 8);
  }

  function drawGoose(x, y, wing) {
    ctx.save();
    ctx.translate(x, y);
    // Body
    ctx.fillStyle = '#e8e8e0';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, -0.1, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#e8e8e0';
    ctx.beginPath(); ctx.ellipse(22, -10, 11, 9, 0.3, 0, Math.PI*2); ctx.fill();
    // Neck
    ctx.fillStyle = '#ddd8cc';
    ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(24, -12); ctx.lineTo(22, -4); ctx.closePath(); ctx.fill();
    // Beak
    ctx.fillStyle = '#e8a020';
    ctx.beginPath(); ctx.moveTo(32, -10); ctx.lineTo(40, -8); ctx.lineTo(32, -6); ctx.closePath(); ctx.fill();
    // Eye
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(26, -12, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(27, -13, 0.8, 0, Math.PI*2); ctx.fill();
    // Wing
    ctx.fillStyle = '#ccc8b8';
    ctx.save();
    ctx.rotate(wing);
    ctx.beginPath(); ctx.ellipse(-4, 2, 18, 8, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // Tail
    ctx.fillStyle = '#d0ccc0';
    ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-28, -4); ctx.lineTo(-28, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);
    const earned = Math.floor(score / 5);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('HONK!', W/2 - 52, H/2 - 40);
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
