const WhackAMoleGame = (() => {
  let canvas, ctx, raf, cb;
  let gardener, holes, score, gameOver, lastTime, timeLeft, keys, nextMole, particles;
  const W = 480, H = 440;
  const HOLES = 5;
  const HOLE_Y = [200, 280, 340, 260, 320];
  const HOLE_X = [60, 140, 240, 340, 420];
  const MOLE_TIME = 1.8;
  const GAME_TIME = 45;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    gardener = { holeIdx: 2, x: HOLE_X[2], swinging: 0 };
    holes = Array.from({length: HOLES}, (_, i) => ({
      x: HOLE_X[i], y: HOLE_Y[i],
      mole: null  // null or { timer, maxTimer, popped }
    }));
    score = 0; gameOver = false; lastTime = 0; timeLeft = GAME_TIME;
    nextMole = 1.0; keys = {}; particles = [];
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    raf = requestAnimationFrame(loop);
  }

  function onKey(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 's') whack();
    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft')  moveTo(gardener.holeIdx - 1);
    if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') moveTo(gardener.holeIdx + 1);
  }
  function offKey(e) { keys[e.key.toLowerCase()] = false; }

  function moveTo(idx) {
    if (idx < 0 || idx >= HOLES) return;
    gardener.holeIdx = idx;
    gardener.x = HOLE_X[idx];
  }

  function whack() {
    if (gameOver) return;
    gardener.swinging = 0.3;
    const h = holes[gardener.holeIdx];
    if (h.mole && h.mole.popped) {
      score++;
      h.mole = null;
      // Particle burst
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: h.x, y: h.y - 30,
          vx: (Math.random()-0.5)*200,
          vy: -100 - Math.random()*150,
          life: 0.6, color: `hsl(${Math.random()*60+30},80%,60%)`
        });
      }
    }
  }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!gameOver) { update(dt); render(); raf = requestAnimationFrame(loop); }
  }

  function update(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }

    // Swing animation
    if (gardener.swinging > 0) gardener.swinging -= dt * 3;

    // Spawn moles
    nextMole -= dt;
    if (nextMole <= 0) {
      const empties = holes.filter(h => !h.mole);
      if (empties.length > 0) {
        const h = empties[Math.floor(Math.random() * empties.length)];
        const t = Math.max(0.8, MOLE_TIME - score * 0.02);
        h.mole = { timer: t, maxTimer: t, popped: false };
      }
      nextMole = 0.5 + Math.random() * 0.8;
    }

    // Update moles
    holes.forEach(h => {
      if (!h.mole) return;
      h.mole.timer -= dt;
      h.mole.popped = h.mole.timer < h.mole.maxTimer * 0.7;
      if (h.mole.timer <= 0) h.mole = null;
    });

    // Particles
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
    });
    particles = particles.filter(p => p.life > 0);
  }

  function render() {
    // Background - garden
    ctx.fillStyle = '#1a3300';
    ctx.fillRect(0, 0, W, H);

    // Dirt patches
    ctx.fillStyle = '#2d1a00';
    ctx.fillRect(0, 170, W, H - 170);

    // Grass border
    ctx.fillStyle = '#2d5500';
    ctx.fillRect(0, 165, W, 20);

    // Flower decorations
    drawFlower(30, 140, '#ff4488');
    drawFlower(W - 30, 140, '#ffaa00');
    drawFlower(W/2, 130, '#ff8844');

    // Hole + mole
    holes.forEach((h, i) => {
      // Hole shadow / dirt
      ctx.fillStyle = '#1a0d00';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 26, 14, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3d2200';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 22, 11, 0, 0, Math.PI*2); ctx.fill();

      // Highlight selected hole
      if (i === gardener.holeIdx) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, 26, 14, 0, 0, Math.PI*2); ctx.stroke();
      }

      // Mole
      if (h.mole) {
        const progress = h.mole.popped ? 1 : (1 - h.mole.timer / h.mole.maxTimer) / 0.3;
        const popY = h.y - 40 * Math.min(1, progress);
        drawMole(h.x, popY, h.mole.popped);
      }
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / 0.6;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Gardener
    const gx = gardener.x, gy = HOLE_Y[gardener.holeIdx] - 55;
    const swing = gardener.swinging > 0 ? -0.8 : 0;
    drawGardener(gx, gy, swing);

    // HUD
    ctx.fillStyle = '#001a00';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('WHACKS: ' + score, 10, 26);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('🪙 ' + Math.floor(score/30), W/2 - 30, 26);
    const t = Math.ceil(timeLeft);
    ctx.fillStyle = t <= 10 ? '#ff4444' : '#9bbc0f';
    ctx.fillText('TIME: ' + t, W - 120, 26);

    // Token progress bar
    const prog = (score % 30) / 30;
    ctx.fillStyle = '#1a3300';
    ctx.fillRect(W/2 - 60, 35, 120, 8);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(W/2 - 60, 35, 120 * prog, 8);
    ctx.strokeStyle = '#5a5a00';
    ctx.lineWidth = 1;
    ctx.strokeRect(W/2 - 60, 35, 120, 8);
  }

  function drawGardener(x, y, swingAngle) {
    // Body
    ctx.fillStyle = '#4466aa';
    ctx.fillRect(x - 12, y, 24, 30);
    // Head
    ctx.fillStyle = '#f5c87a';
    ctx.beginPath(); ctx.arc(x, y - 14, 14, 0, Math.PI*2); ctx.fill();
    // Hat
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 16, y - 26, 32, 6);
    ctx.fillRect(x - 10, y - 42, 20, 18);
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - 5, y - 16, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 16, 2, 0, Math.PI*2); ctx.fill();
    // Shovel arm
    ctx.save();
    ctx.translate(x + 10, y + 4);
    ctx.rotate(swingAngle);
    ctx.fillStyle = '#f5c87a';
    ctx.fillRect(0, 0, 8, 20);   // arm
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(4, 14, 4, 28);  // handle
    ctx.fillStyle = '#aaa';
    ctx.fillRect(0, 40, 14, 6);  // shovel head
    ctx.fillRect(2, 34, 10, 8);
    ctx.restore();
    // Legs
    ctx.fillStyle = '#334488';
    ctx.fillRect(x - 10, y + 28, 9, 18);
    ctx.fillRect(x + 1, y + 28, 9, 18);
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 12, y + 44, 12, 6);
    ctx.fillRect(x + 1, y + 44, 12, 6);
  }

  function drawMole(x, y, visible) {
    if (!visible) return;
    // Body
    ctx.fillStyle = '#8B6914';
    ctx.beginPath(); ctx.ellipse(x, y, 18, 22, 0, 0, Math.PI*2); ctx.fill();
    // Face
    ctx.fillStyle = '#c49a3c';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 12, 14, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - 5, y - 8, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 8, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 4, y - 9, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y - 9, 1, 0, Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle = '#ff8888';
    ctx.beginPath(); ctx.arc(x, y - 4, 3.5, 0, Math.PI*2); ctx.fill();
    // Claws
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x - 22, y + 2, 6, 8);
    ctx.fillRect(x + 16, y + 2, 6, 8);
  }

  function drawFlower(x, y, color) {
    ctx.fillStyle = '#2d6600';
    ctx.fillRect(x - 2, y, 4, 20);
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a)*8, y + Math.sin(a)*8, 5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
  }

  function endGame() {
    gameOver = true;
    cancelAnimationFrame(raf);
    const earned = Math.floor(score / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('TIME\'S UP!', W/2 - 80, H/2 - 30);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('Moles whacked: ' + score, W/2 - 90, H/2 + 10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens earned: ' + earned, W/2 - 80, H/2 + 40);
    if (cb) cb(earned);
  }

  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', offKey);
    const earned = Math.floor(score / 30);
    if (cb && !gameOver) cb(earned);
  }

  return { start, stop };
})();
