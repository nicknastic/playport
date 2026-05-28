const JugglingGame = (() => {
  let canvas, ctx, raf, cb;
  let jester, balls, keys, score, gameOver, lastTime, nextBallTime, spawnInterval, animTime;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    keys = {};
    score = 0; gameOver = false; lastTime = 0; animTime = 0;
    nextBallTime = 6000; spawnInterval = 10000;

    jester = {
      x: canvas.width / 2, y: canvas.height - 70,
      w: 36, h: 60, speed: 180,
      legPhase: 0, bodyBob: 0, armL: 0, armR: 0,
      moving: 0   // -1 left, 0 still, 1 right
    };
    balls = [spawnBall(true)];

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    raf = requestAnimationFrame(loop);
  }

  function spawnBall(isFirst = false) {
    // First ball always drops from centre; extras pick a random top zone
    const zones = [
      { x: canvas.width * 0.18, vx:  18 },   // top-left
      { x: canvas.width * 0.50, vx:   0 },   // top-centre
      { x: canvas.width * 0.82, vx: -18 },   // top-right
    ];
    const zone = isFirst
      ? zones[1]                                       // first ball: centre
      : zones[Math.floor(Math.random() * zones.length)]; // extras: random

    return {
      x: zone.x + (Math.random() - 0.5) * 20,
      y: 60,
      vx: zone.vx + (Math.random() - 0.5) * 10,
      vy: 0,
      r: 13,
      color: `hsl(${Math.random()*360},80%,60%)`,
      trail: []
    };
  }

  function onKey(e)  { keys[e.key.toLowerCase()] = true;  }
  function offKey(e) { keys[e.key.toLowerCase()] = false; }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts; animTime = ts;
    if (!gameOver) { update(dt, ts); render(ts); raf = requestAnimationFrame(loop); }
  }

  function update(dt, ts) {
    // Move jester
    const movingL = keys['a'] || keys['arrowleft'];
    const movingR = keys['d'] || keys['arrowright'];
    jester.moving = movingL ? -1 : movingR ? 1 : 0;

    if (movingL) jester.x -= jester.speed * dt;
    if (movingR) jester.x += jester.speed * dt;
    jester.x = Math.max(jester.w/2, Math.min(canvas.width - jester.w/2, jester.x));

    // Animate legs & body
    if (jester.moving !== 0) {
      jester.legPhase += dt * 8;
    } else {
      jester.legPhase *= 0.8;
    }
    jester.bodyBob = Math.sin(ts * 0.003) * 2;  // gentle idle bob

    // Raise arms toward nearby balls
    jester.armL = 0; jester.armR = 0;
    balls.forEach(b => {
      if (b.x < jester.x && Math.abs(b.y - (jester.y - 24)) < 70) jester.armL = Math.min(1, 70 / (Math.abs(b.y - (jester.y-24)) + 1) * 0.3);
      if (b.x >= jester.x && Math.abs(b.y - (jester.y - 24)) < 70) jester.armR = Math.min(1, 70 / (Math.abs(b.y - (jester.y-24)) + 1) * 0.3);
    });

    // Spawn extra balls
    if (ts > nextBallTime && balls.length < 5) {
      balls.push(spawnBall());
      nextBallTime = ts + spawnInterval;
      spawnInterval = Math.max(4000, spawnInterval - 1000);
    }

    // Update balls
    balls.forEach(b => {
      // Store trail point every few frames
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 8) b.trail.shift();

      b.vy += 200 * dt;   // gentle gravity
      b.x  += b.vx * dt;
      b.y  += b.vy * dt;

      // Light air resistance on horizontal drift
      b.vx *= 0.995;

      // Wall bounce - soften the bounce
      if (b.x - b.r < 0)            { b.x = b.r;               b.vx =  Math.abs(b.vx) * 0.7; }
      if (b.x + b.r > canvas.width) { b.x = canvas.width - b.r; b.vx = -Math.abs(b.vx) * 0.7; }

      // Juggle hit zone (generous - full hand width below jester waist)
      const handLx = jester.x - 30;
      const handRx = jester.x + 30;
      const handY  = jester.y - 20;
      const nearLeft  = Math.abs(b.x - handLx) < 32 && Math.abs(b.y - handY) < 36;
      const nearRight = Math.abs(b.x - handRx) < 32 && Math.abs(b.y - handY) < 36;

      if (keys['s'] && (nearLeft || nearRight) && b.vy > 0) {
        b.vy  = -210;
        // Gently push ball toward centre to keep it in play
        const toCentre = (canvas.width / 2 - b.x) * 0.012;
        b.vx  = b.vx * 0.3 + toCentre + (Math.random() - 0.5) * 18;
        score += 10;
      }

      if (b.y + b.r > canvas.height) endGame();
    });

    score += dt * 2;
  }

  function render(ts) {
    const W = canvas.width, H = canvas.height;

    // ══ Circus Big Top Interior ══

    // Tent wall — alternating red & cream vertical stripes
    const stripeW = Math.ceil(W / 12);
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#cc1111' : '#fff0d0';
      ctx.fillRect(i * stripeW, 0, stripeW + 1, H);
    }

    // Bleacher seating (upper background)
    ctx.fillStyle = '#6a0e0e';
    ctx.fillRect(0, 72, W, 82);
    ctx.fillStyle = '#4a0a0a';
    ctx.fillRect(0, 72, W, 6);

    // Audience heads
    const headPal = ['#f5c87a','#d4956a','#e8c4a0','#c8866a','#8b5a2b','#f0d090'];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 16; col++) {
        const hx = 14 + col * 30 + (row % 2 === 0 ? 0 : 15);
        const hy = 88 + row * 22;
        if (hx > W) continue;
        ctx.fillStyle = headPal[(col * 3 + row) % headPal.length];
        ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill();
        // Hair (dark top half)
        ctx.fillStyle = ['#3a1a00','#111','#4a2800','#222'][(col + row) % 4];
        ctx.beginPath(); ctx.arc(hx, hy - 2, 7, Math.PI, Math.PI * 2); ctx.fill();
        // Occasional hat
        if ((col + row * 5) % 7 === 0) {
          ctx.fillStyle = '#cc1111';
          ctx.fillRect(hx - 6, hy - 14, 12, 5);
          ctx.fillRect(hx - 4, hy - 20, 8, 8);
        }
      }
    }

    // Ring divider rail
    ctx.fillStyle = '#5a0808';
    ctx.fillRect(0, 152, W, 10);
    ctx.fillStyle = '#8b1010';
    ctx.fillRect(0, 152, W, 4);

    // Sawdust circus ring floor
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(0, 162, W, H - 162);
    // Sawdust texture (static pseudo-random dots)
    ctx.fillStyle = '#b08848';
    for (let i = 0; i < 55; i++) {
      ctx.fillRect((i * 97 + 30) % (W - 6), 168 + (i * 67) % (H - 180), 5, 2);
    }
    ctx.fillStyle = '#d4b070';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 137 + 60) % (W - 6), 172 + (i * 83) % (H - 186), 3, 2);
    }

    // Circus ring oval border (white dashes on floor)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.ellipse(W / 2, H, W / 2 - 10, 28, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Tent poles (left & right) ──
    ctx.fillStyle = '#6a2e08';
    ctx.fillRect(14, 0, 13, H);
    ctx.fillRect(W - 27, 0, 13, H);
    // Gold rings on poles
    ctx.fillStyle = '#ffd700';
    for (let py = 28; py < H; py += 55) {
      ctx.fillRect(12, py, 17, 7);
      ctx.fillRect(W - 29, py, 17, 7);
    }

    // ── Ropes between poles (catenary curves) ──
    ctx.strokeStyle = '#a09060';
    ctx.lineWidth = 1.5;
    [48, 98].forEach(baseY => {
      ctx.beginPath();
      for (let x = 27; x <= W - 27; x += 2) {
        const t = (x - 27) / (W - 54);
        const sag = 22 * (4 * t * (1 - t));
        x === 27 ? ctx.moveTo(x, baseY + sag) : ctx.lineTo(x, baseY + sag);
      }
      ctx.stroke();
    });

    // ── Pennant flags on top rope ──
    const pCols = ['#dd1010','#ffd700','#1040cc','#10aa20','#ff8800'];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const px = 27 + t * (W - 54);
      const sag = 22 * (4 * t * (1 - t));
      const py = 48 + sag;
      ctx.fillStyle = pCols[i % 5];
      ctx.beginPath();
      ctx.moveTo(px - 9, py);
      ctx.lineTo(px + 9, py);
      ctx.lineTo(px, py + 18);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // ── Spotlights (from top corners, aimed at jester) ──
    [
      { sx: 80,     r: 255, g: 255, b: 200 },
      { sx: W - 80, r: 255, g: 210, b: 255 }
    ].forEach(({ sx, r, g, b }) => {
      const tx = jester.x, ty = jester.y - 30;
      const ang = Math.atan2(ty - 8, tx - sx);
      const len = Math.hypot(tx - sx, ty - 8) + 80;
      ctx.save();
      ctx.translate(sx, 8);
      ctx.rotate(ang);
      const sg = ctx.createRadialGradient(0, 0, 5, 0, 0, len);
      sg.addColorStop(0,   `rgba(${r},${g},${b},0.22)`);
      sg.addColorStop(0.6, `rgba(${r},${g},${b},0.05)`);
      sg.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, len, -0.24, 0.24);
      ctx.closePath();
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.restore();
      // Spotlight pool on floor
      ctx.fillStyle = `rgba(${r},${g},${b},0.12)`;
      ctx.beginPath();
      ctx.ellipse(tx, jester.y + 18, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Scalloped top valance (circus tent edge) ──
    ctx.fillStyle = '#cc1111';
    ctx.fillRect(0, 0, W, 16);
    const scW = 32;
    for (let x = 0; x < W; x += scW) {
      ctx.fillStyle = Math.floor(x / scW) % 2 === 0 ? '#cc1111' : '#ffd700';
      ctx.beginPath();
      ctx.arc(x + scW / 2, 16, scW / 2, 0, Math.PI);
      ctx.fill();
    }

    // ── Animated coloured lights string ──
    ctx.strokeStyle = '#4a4060'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 110); ctx.lineTo(W, 110); ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const lit = Math.sin(ts * 0.005 + i * 0.9) > 0;
      ctx.fillStyle = lit ? `hsl(${i * 28},100%,62%)` : '#1a1628';
      ctx.beginPath(); ctx.arc(i * (W / 13) + W / 26, 110, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    // Ground floor strip at very bottom
    ctx.fillStyle = '#b08040';
    ctx.fillRect(0, H - 6, W, 6);

    // ── Pokemon dialog HUD ──
    PS.dialogBox(ctx, 6, 76, 148, 36);
    ctx.fillStyle = PS.PAL.uiText;
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('SCORE: ' + Math.floor(score), 13, 90);
    ctx.fillText('BALLS: ' + balls.length, 13, 104);

    // ── Ball trails & arrows ──
    balls.forEach(b => {
      // Trail (fading dots)
      b.trail.forEach((pt, i) => {
        const alpha = (i / b.trail.length) * 0.35;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, b.r * (i / b.trail.length) * 0.6, 0, Math.PI*2); ctx.fill();
      });

      // Direction arrow — shows where ball is heading
      const speed2d = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (speed2d > 10) {
        const nx = b.vx / speed2d, ny = b.vy / speed2d;
        const ax = b.x + nx * (b.r + 14);
        const ay = b.y + ny * (b.r + 14);
        const perp = { x: -ny * 5, y: nx * 5 };
        ctx.fillStyle = b.vy > 0 ? 'rgba(255,80,80,0.85)' : 'rgba(80,255,80,0.85)';
        ctx.beginPath();
        ctx.moveTo(ax + nx*8, ay + ny*8);
        ctx.lineTo(ax + perp.x, ay + perp.y);
        ctx.lineTo(ax - perp.x, ay - perp.y);
        ctx.closePath(); ctx.fill();
      }

      // Ball itself
      const grad = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.1, b.x, b.y, b.r);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, b.color);
      grad.addColorStop(1, '#222');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(b.x, H - 4, b.r * 0.8 * (1 - (H - b.y) / H), 3, 0, 0, Math.PI*2);
      ctx.fill();
    });

    // ── Jester ──
    const jx = jester.x, jy = jester.y + jester.bodyBob;
    const lLeg = Math.sin(jester.legPhase) * 6 * Math.abs(jester.moving);
    const rLeg = -lLeg;

    // Legs (animated)
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(jx - 12, jy + 6 + lLeg, 10, 22 - Math.abs(lLeg));
    ctx.fillStyle = '#cc44cc';
    ctx.fillRect(jx + 2,  jy + 6 + rLeg, 10, 22 - Math.abs(rLeg));
    // Shoes
    ctx.fillStyle = '#111';
    ctx.fillRect(jx - 16, jy + 26 + lLeg, 16, 7);
    ctx.fillRect(jx + 2,  jy + 26 + rLeg, 16, 7);

    // Body
    ctx.fillStyle = '#cc44cc';
    ctx.fillRect(jx - 14, jy - 30, 28, 36);
    // Collar zigzag
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(jx - 14 + i*7, jy - 30);
      ctx.lineTo(jx - 10 + i*7, jy - 24);
      ctx.lineTo(jx - 7  + i*7, jy - 30);
      ctx.closePath(); ctx.fill();
    }

    // Arms (raised toward nearby balls)
    const armLift = -14;
    const armLY = jy - 28 + armLift * jester.armL;
    const armRY = jy - 28 + armLift * jester.armR;
    ctx.fillStyle = '#cc44cc';
    ctx.fillRect(jx - 30, armLY, 18, 8);
    ctx.fillRect(jx + 12, armRY, 18, 8);
    // Hands (glow if arm is raised)
    ctx.fillStyle = jester.armL > 0.4 ? '#ffe066' : '#f5c87a';
    ctx.beginPath(); ctx.arc(jx - 30, armLY + 4, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = jester.armR > 0.4 ? '#ffe066' : '#f5c87a';
    ctx.beginPath(); ctx.arc(jx + 30, armRY + 4, 8, 0, Math.PI*2); ctx.fill();

    // Head
    ctx.fillStyle = '#f5c87a';
    ctx.beginPath(); ctx.arc(jx, jy - 44, 16, 0, Math.PI*2); ctx.fill();

    // Hat
    ctx.fillStyle = '#cc44cc';
    ctx.beginPath(); ctx.moveTo(jx-16,jy-58); ctx.lineTo(jx-6,jy-82); ctx.lineTo(jx,jy-58); ctx.fill();
    ctx.fillStyle = '#ffff00';
    ctx.beginPath(); ctx.moveTo(jx,jy-58); ctx.lineTo(jx+10,jy-82); ctx.lineTo(jx+16,jy-58); ctx.fill();
    // Hat bells (jiggle with movement)
    const bellJiggle = Math.sin(ts * 0.015) * 2 * Math.abs(jester.moving);
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.arc(jx - 6, jy - 82 + bellJiggle, 4.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(jx + 10, jy - 82 - bellJiggle, 4.5, 0, Math.PI*2); ctx.fill();

    // Eyes (blink every ~3s)
    const blinking = Math.sin(ts * 0.003) > 0.97;
    ctx.fillStyle = '#222';
    if (blinking) {
      ctx.fillRect(jx - 8, jy - 48, 5, 2);
      ctx.fillRect(jx + 3, jy - 48, 5, 2);
    } else {
      ctx.beginPath(); ctx.arc(jx - 6, jy - 46, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(jx + 6, jy - 46, 2.5, 0, Math.PI*2); ctx.fill();
      // Pupils track nearest ball
      if (balls.length > 0) {
        const nb = balls.reduce((a,b) => Math.abs(b.x-jx) < Math.abs(a.x-jx) ? b : a);
        const px = Math.sign(nb.x - jx) * 1.2;
        const py = nb.y < jy ? -1 : 0.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(jx-6+px, jy-46+py, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(jx+6+px, jy-46+py, 1, 0, Math.PI*2); ctx.fill();
      }
    }
    // Smile
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(jx, jy - 42, 7, 0.2, Math.PI - 0.2); ctx.stroke();

    // ── S prompt: flash on any catchable ball ──
    const anyNear = balls.some(b => {
      const nearL = Math.abs(b.x - (jester.x-30)) < 32 && Math.abs(b.y - (jester.y-20)) < 36;
      const nearR = Math.abs(b.x - (jester.x+30)) < 32 && Math.abs(b.y - (jester.y-20)) < 36;
      return (nearL || nearR) && b.vy > 0;
    });
    if (anyNear) {
      const alpha = 0.5 + 0.5 * Math.sin(ts * 0.02);
      ctx.fillStyle = `rgba(255,220,0,${alpha})`;
      ctx.font = '13px "Press Start 2P"';
      ctx.fillText('PRESS S!', W/2 - 52, H - 20);
    }
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);
    const earned = Math.floor(score / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '18px "Press Start 2P"';
    ctx.fillText('GAME OVER', canvas.width/2 - 90, canvas.height/2 - 30);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('Score: ' + Math.floor(score), canvas.width/2 - 55, canvas.height/2 + 10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens earned: ' + earned, canvas.width/2 - 80, canvas.height/2 + 40);
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('Press BACK to return', canvas.width/2 - 90, canvas.height/2 + 70);
    if (cb) cb(earned);
  }

  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', offKey);
  }

  return { start, stop };
})();
