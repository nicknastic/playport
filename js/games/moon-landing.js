const MoonLandingGame = (() => {
  let canvas, ctx, raf, cb;
  let rocket, asteroids, bullets, stars, score, gameOver, lastTime, spawnTimer, spawnInterval, moonY, flame;
  const W = 480, H = 440;

  function start(c, callback) {
    canvas = c; ctx = c.getContext('2d'); cb = callback;
    rocket = { x: W/2, y: H - 70, vx: 0, w: 28, h: 50, speed: 180 };
    asteroids = []; bullets = []; score = 0; gameOver = false; lastTime = 0;
    spawnTimer = 0; spawnInterval = 1.8; moonY = -200; flame = 0;
    stars = Array.from({length: 60}, () => ({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.5+0.5 }));
    keys = {};
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    canvas.addEventListener('mousedown', onShoot);
    raf = requestAnimationFrame(loop);
  }

  let keys = {};
  function onKey(e)  { keys[e.key.toLowerCase()] = true; }
  function offKey(e) { keys[e.key.toLowerCase()] = false; }
  function onShoot(e) {
    if (gameOver) return;
    bullets.push({ x: rocket.x, y: rocket.y - rocket.h/2, vy: -400 });
  }

  function spawnAsteroid() {
    const r = 14 + Math.random() * 22;
    asteroids.push({
      x: r + Math.random() * (W - r*2),
      y: -r,
      r,
      vx: (Math.random() - 0.5) * 80,
      vy: 50 + Math.random() * 100,
      angle: 0, spin: (Math.random() - 0.5) * 2,
      hp: r > 25 ? 2 : 1
    });
  }

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!gameOver) { update(dt, ts); render(ts); raf = requestAnimationFrame(loop); }
  }

  function update(dt, ts) {
    if (keys['a'] || keys['arrowleft'])  rocket.vx -= 600 * dt;
    if (keys['d'] || keys['arrowright']) rocket.vx += 600 * dt;
    rocket.vx *= 0.92;
    rocket.x += rocket.vx * dt;
    rocket.x = Math.max(rocket.w/2, Math.min(W - rocket.w/2, rocket.x));

    score += dt * 10;
    moonY += dt * 15;
    flame = ts * 0.01;

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnAsteroid(); spawnTimer = 0;
      spawnInterval = Math.max(0.6, spawnInterval - 0.04);
    }

    // Bullets
    bullets.forEach(b => b.y += b.vy * dt);
    bullets = bullets.filter(b => b.y > -10);

    // Asteroids
    asteroids.forEach(a => {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.spin * dt;
      if (a.x - a.r < 0 || a.x + a.r > W) a.vx *= -1;
    });

    // Bullet-asteroid collision
    bullets.forEach(b => {
      asteroids.forEach(a => {
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.sqrt(dx*dx + dy*dy) < a.r + 4) {
          a.hp--;
          b.y = -999;
          score += 50;
          if (a.hp <= 0) a.y = H + 999;
        }
      });
    });
    // Remove asteroids that have passed below the rocket — they safely fly by
    asteroids = asteroids.filter(a => a.y < rocket.y + a.r + 20 && a.hp > 0);

    // Rocket-asteroid collision — only while asteroid is still in the danger zone
    asteroids.forEach(a => {
      const dx = rocket.x - a.x, dy = rocket.y - a.y;
      if (Math.sqrt(dx*dx + dy*dy) < a.r + 12) endGame();
    });

    // Win: moon reached
    if (moonY > H/2 - 50) endGame(true);
  }

  function render(ts) {
    // Space background
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(s => {
      const twinkle = 0.6 + 0.4 * Math.sin(ts * 0.003 + s.x);
      ctx.fillStyle = `rgba(255,255,220,${twinkle})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });

    // Moon (destination)
    const moonDrawY = H/2 - 50 - (H/2 - 50 + 200) * (1 - Math.min(1, moonY / (H/2 - 50)));
    ctx.fillStyle = '#e0d8b0';
    ctx.beginPath(); ctx.arc(W/2, moonDrawY, 55, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c8c0a0';
    [[0,8,12],[20,-12,8],[-18,4,6],[8,22,5]].forEach(([dx,dy,r]) => {
      ctx.beginPath(); ctx.arc(W/2+dx, moonDrawY+dy, r, 0, Math.PI*2); ctx.fill();
    });
    if (moonY > -80) {
      ctx.fillStyle = '#9bbc0f';
      ctx.font = '9px "Press Start 2P"';
      ctx.fillText('MOON', W/2 - 22, moonDrawY + 4);
    }

    // Asteroids
    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rad = a.r * (0.8 + 0.2 * Math.sin(i * 2.3));
        i === 0 ? ctx.moveTo(Math.cos(ang)*rad, Math.sin(ang)*rad)
                : ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6B5335';
      ctx.beginPath(); ctx.arc(-a.r*0.2, -a.r*0.1, a.r*0.25, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });

    // Bullets
    ctx.fillStyle = '#ff0';
    bullets.forEach(b => {
      ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - 1, b.y - 10, 2, 4);
      ctx.fillStyle = '#ff0';
    });

    // Rocket flame
    const flameH = 18 + 8 * Math.sin(flame * 12);
    const flameGrad = ctx.createLinearGradient(rocket.x, rocket.y + 20, rocket.x, rocket.y + 20 + flameH);
    flameGrad.addColorStop(0, '#ff8800');
    flameGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(rocket.x - 8, rocket.y + 20);
    ctx.lineTo(rocket.x, rocket.y + 20 + flameH);
    ctx.lineTo(rocket.x + 8, rocket.y + 20);
    ctx.closePath(); ctx.fill();

    // Rocket body
    const rx = rocket.x, ry = rocket.y;
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(rx, ry - 25);
    ctx.lineTo(rx - 12, ry + 18);
    ctx.lineTo(rx + 12, ry + 18);
    ctx.closePath(); ctx.fill();
    // Nose
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    ctx.moveTo(rx, ry - 25);
    ctx.lineTo(rx - 7, ry - 10);
    ctx.lineTo(rx + 7, ry - 10);
    ctx.closePath(); ctx.fill();
    // Window
    ctx.fillStyle = '#88ccff';
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#88aacc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI*2); ctx.stroke();
    // Fins
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.moveTo(rx - 12, ry + 18); ctx.lineTo(rx - 22, ry + 28); ctx.lineTo(rx - 12, ry + 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(rx + 12, ry + 18); ctx.lineTo(rx + 22, ry + 28); ctx.lineTo(rx + 12, ry + 10); ctx.closePath(); ctx.fill();

    // HUD
    ctx.fillStyle = '#9bbc0f';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('SCORE: ' + Math.floor(score), 10, 24);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('🪙 ' + Math.floor(score/100), W - 80, 24);
    ctx.fillStyle = '#88aaff';
    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('CLICK = SHOOT', W/2 - 55, H - 12);
  }

  function endGame(won = false) {
    if (gameOver) return;
    gameOver = true;
    cancelAnimationFrame(raf);
    const earned = Math.floor(score / 100);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = won ? '#f1c40f' : '#9bbc0f';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText(won ? '🌕 LANDED!' : 'DESTROYED!', W/2 - (won ? 70 : 80), H/2 - 30);
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = '#9bbc0f';
    ctx.fillText('Score: ' + Math.floor(score), W/2 - 55, H/2 + 10);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Tokens earned: ' + earned, W/2 - 80, H/2 + 40);
    if (cb) cb(earned);
  }

  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', offKey);
    if (canvas) canvas.removeEventListener('mousedown', onShoot);
  }

  return { start, stop };
})();
