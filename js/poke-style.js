// ══ Shared Pokemon GBA visual helpers ══
const PS = (() => {
  const PAL = {
    skyTop:        '#78a8f0',
    skyBot:        '#b0d8f8',
    grassLight:    '#90cc8c',
    grassMid:      '#70b068',
    grassDot:      '#60a058',
    treeTip:       '#58cc30',
    treeMid:       '#40aa20',
    treeBase:      '#207010',
    treeHi:        '#88ee50',
    path:          '#f0d8a8',
    pathDark:      '#d8b870',
    water:         '#6898e0',
    waterLight:    '#98c0f8',
    sand:          '#f8e8b8',
    uiBg:          '#f8f8f8',
    uiBorder:      '#383838',
    uiDark:        '#101828',
    uiText:        '#383838',
    hpGreen:       '#18cc18',
    hpYellow:      '#e0d800',
    hpRed:         '#d82020',
    indoorFloor1:  '#d8c8a0',
    indoorFloor2:  '#c8b888',
    indoorWall:    '#a0a8c8',
    spaceDeep:     '#080818',
    spaceMid:      '#101030',
    moonSurface:   '#d8d0a8',
    moonCrater:    '#b8b090',
  };

  // Pokemon GBA grass with iconic dot grid
  function drawGrass(ctx, W, H, scrollX = 0, startY = 0) {
    ctx.fillStyle = PAL.grassLight;
    ctx.fillRect(0, startY, W, H - startY);
    ctx.fillStyle = PAL.grassDot;
    const C = 16, D = 4;
    for (let col = -1; col <= Math.ceil(W / C) + 1; col++) {
      for (let row = 0; row <= Math.ceil((H - startY) / C) + 1; row++) {
        const x = col * C - (scrollX % C);
        const y = startY + row * C;
        if ((col + row) % 2 === 0) {
          ctx.fillRect(x + 4, y + 4, D, D);
          ctx.fillRect(x + 10, y + 10, D, D);
        } else {
          ctx.fillRect(x + 2, y + 9, D, D);
          ctx.fillRect(x + 10, y + 2, D, D);
        }
      }
    }
  }

  // GBA sky gradient
  function drawSky(ctx, W, startY = 0, endY = 80) {
    const g = ctx.createLinearGradient(0, startY, 0, endY);
    g.addColorStop(0, PAL.skyTop); g.addColorStop(1, PAL.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, startY, W, endY - startY);
  }

  // Pokemon-style chunky 2-high tree (tileSize = one tile, usually 24-32px)
  function drawTree(ctx, x, y, s = 28) {
    ctx.fillStyle = PAL.treeBase;
    ctx.fillRect(x, y + s, s, s);
    ctx.fillStyle = PAL.treeMid;
    ctx.fillRect(x + 2, y + 2, s - 4, s + 2);
    ctx.fillStyle = PAL.treeTip;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = PAL.treeHi;
    ctx.fillRect(x + 3, y + 3, 6, 5);
    ctx.fillRect(x + s - 9, y + 7, 5, 4);
  }

  // Row of trees scrolling with offset
  function drawTreeRow(ctx, W, baseY, s = 28, scrollX = 0) {
    for (let i = -1; i <= Math.ceil(W / s) + 1; i++) {
      drawTree(ctx, i * s - (scrollX % s), baseY, s);
    }
  }

  // Pokemon-style white dialog box
  function dialogBox(ctx, x, y, w, h) {
    ctx.fillStyle = PAL.uiBorder;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = PAL.uiBg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(x + 2, y + 2, w - 4, 3);
    ctx.fillRect(x + 2, y + 5, 3, h - 7);
  }

  // Color-coded HP-style bar (Pokemon battle bar look)
  function hpBar(ctx, x, y, w, h, ratio) {
    ctx.fillStyle = '#202028';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#101018';
    ctx.fillRect(x, y, w, h);
    const col = ratio > 0.5 ? PAL.hpGreen : ratio > 0.25 ? PAL.hpYellow : PAL.hpRed;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
  }

  // Indoor tile floor (Pokemon Center / Mart style)
  function drawIndoorFloor(ctx, W, H, startY = 0) {
    const TS = 32;
    for (let col = 0; col <= Math.ceil(W / TS); col++) {
      for (let row = 0; row <= Math.ceil((H - startY) / TS); row++) {
        ctx.fillStyle = (col + row) % 2 === 0 ? PAL.indoorFloor1 : PAL.indoorFloor2;
        ctx.fillRect(col * TS, startY + row * TS, TS, TS);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * TS, startY + row * TS, TS, TS);
      }
    }
  }

  // Pixel cloud (small puffy GBA style)
  function drawCloud(ctx, x, y, s = 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    [[0,0,14],[16,-6,11],[-14,-4,10],[28,0,9],[30,-8,8]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(x + dx*s, y + dy*s, r*s, 0, Math.PI*2); ctx.fill();
    });
  }

  return { PAL, drawGrass, drawSky, drawTree, drawTreeRow, dialogBox, hpBar, drawIndoorFloor, drawCloud };
})();
