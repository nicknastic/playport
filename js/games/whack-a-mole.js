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
    // Background - Pokemon GBA garden
    PS.drawGrass(ctx, W, H, 0, 50);

    // Sky strip at top
    PS.drawSky(ctx, W, 0, 50);

    // Tree row backdrop
    PS.drawTreeRow(ctx, W, 52, 28, 0);

    // Dirt patches
    ctx.fillStyle = PS.PAL.pathDark;
    ctx.fillRect(0, 170, W, H - 170);

    // Grass border
    ctx.fillStyle = PS.PAL.grassMid;
    ctx.fillRect(0, 165, W, 20);

    // Flower decorations
    drawFlower(30, 140, '#ff4488');
    drawFlower(W - 30, 140, '#ffaa00');
    drawFlower(W/2, 130, '#ff8844');

    // Hole + mole
    holes.forEach((h, i) => {
      // Dirt mound behind hole
      ctx.fillStyle = '#5a3a18';
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 32, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5228';
      ctx.beginPath(); ctx.ellipse(h.x - 6, h.y + 2, 14, 8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6030';
      ctx.beginPath(); ctx.ellipse(h.x + 8, h.y + 3, 10, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      // Dark hole opening
      ctx.fillStyle = '#100800';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1008';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 20, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Highlight selected hole
      if (i === gardener.holeIdx) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, 26, 14, 0, 0, Math.PI*2); ctx.stroke();
      }

      // Mole
      if (h.mole) {
        const progress = h.mole.popped ? 1 : (1 - h.mole.timer / h.mole.maxTimer) / 0.3;
        const popY = h.y - 18 * Math.min(1, progress);
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

    // HUD (Pokemon dialog style)
    PS.dialogBox(ctx, 4, 4, 140, 30);
    ctx.fillStyle = PS.PAL.uiText;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('WHACKS: ' + score, 10, 24);

    PS.dialogBox(ctx, W/2 - 40, 4, 80, 30);
    ctx.fillStyle = '#b07800';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('🪙 ' + Math.floor(score/30), W/2 - 30, 24);

    const t = Math.ceil(timeLeft);
    PS.dialogBox(ctx, W - 110, 4, 106, 30);
    ctx.fillStyle = t <= 10 ? PS.PAL.hpRed : PS.PAL.uiText;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('TIME: ' + t, W - 106, 24);

    // Token progress bar
    const prog = (score % 30) / 30;
    PS.hpBar(ctx, W/2 - 60, 38, 120, 8, prog);
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

    // ── Dark velvety body ──
    ctx.fillStyle = '#28282e';
    ctx.beginPath(); ctx.ellipse(x, y + 4, 20, 22, 0, 0, Math.PI * 2); ctx.fill();

    // Fur sheen — subtle highlight on shoulder
    ctx.fillStyle = '#38383e';
    ctx.beginPath(); ctx.ellipse(x - 5, y - 4, 11, 10, -0.4, 0, Math.PI * 2); ctx.fill();

    // ── Head ──
    ctx.fillStyle = '#28282e';
    ctx.beginPath(); ctx.ellipse(x, y - 14, 13, 12, 0, 0, Math.PI * 2); ctx.fill();

    // ── Elongated pink snout (pointing slightly up-left like in photo) ──
    ctx.fillStyle = '#d07070';
    ctx.beginPath(); ctx.ellipse(x + 2, y - 24, 6, 8, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e89090';
    ctx.beginPath(); ctx.ellipse(x + 2, y - 27, 4, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    // Nostrils
    ctx.fillStyle = '#a03030';
    ctx.beginPath(); ctx.arc(x - 0.5, y - 28, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3.5, y - 26, 1.2, 0, Math.PI * 2); ctx.fill();

    // ── Tiny vestigial eyes (almost hidden like real moles) ──
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(x - 8, y - 17, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y - 18, 1.8, 0, Math.PI * 2); ctx.fill();

    // ── Large wide paddle paws with spread digits ──
    // Left paw - big, cream/pinkish, spread wide
    ctx.fillStyle = '#c8a880';
    ctx.beginPath(); ctx.ellipse(x - 23, y + 2, 12, 7, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddc4a0';
    // Left fingers fanned out
    const leftFingers = [[-32, -6, -0.7], [-30, -2, -0.4], [-28, 1, -0.1], [-26, 3, 0.2]];
    leftFingers.forEach(([dx, dy, ang]) => {
      ctx.save();
      ctx.translate(x + dx, y + dy);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Right paw - mirrored
    ctx.fillStyle = '#c8a880';
    ctx.beginPath(); ctx.ellipse(x + 23, y + 2, 12, 7, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ddc4a0';
    const rightFingers = [[26, -6, 0.7], [28, -2, 0.4], [30, 1, 0.1], [31, 3, -0.2]];
    rightFingers.forEach(([dx, dy, ang]) => {
      ctx.save();
      ctx.translate(x + dx, y + dy);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Claw tips on fingers
    ctx.fillStyle = '#b09070';
    leftFingers.forEach(([dx, dy, ang]) => {
      ctx.save();
      ctx.translate(x + dx, y + dy - 5);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, 0, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    rightFingers.forEach(([dx, dy, ang]) => {
      ctx.save();
      ctx.translate(x + dx, y + dy - 5);
      ctx.rotate(ang);
      ctx.beginPath(); ctx.ellipse(0, 0, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
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
