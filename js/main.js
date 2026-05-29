let activeGame = null;
let currentGame = null;
let dragGhost = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function updateTokenDisplay() {
  const t = State.getTokens();
  document.getElementById('token-count').textContent = t;
  document.getElementById('game-token-count').textContent = t;
}

function showRack() {
  document.getElementById('cartridge-rack').classList.remove('hidden');
  document.getElementById('cartridge-slot').classList.remove('hidden');
}

function hideRack() {
  document.getElementById('cartridge-rack').classList.add('hidden');
  document.getElementById('cartridge-slot').classList.add('hidden');
}

// ── BOOT ──
document.getElementById('btn-play').onclick = () => {
  showScreen('menu');
  showRack();
  renderCartridgeRack();
  updateTokenDisplay();
};
document.getElementById('btn-settings-boot').onclick = () => showScreen('settings');
document.getElementById('btn-quit').onclick = () => {
  if (confirm('Quit PlayPort?')) window.close();
};

// ── MENU ──
document.getElementById('btn-back-menu').onclick = () => {
  hideRack();
  showScreen('boot');
};

// ── CARTRIDGE RACK ──
function renderCartridgeRack() {
  const grid = document.getElementById('rack-grid');
  grid.innerHTML = '';
  GAMES.forEach(g => {
    const locked = !State.isUnlocked(g.id);

    // Full cartridge = body (artwork) + connector tab
    const wrapper = document.createElement('div');
    wrapper.className = 'cart-wrapper';

    const body = document.createElement('div');
    body.className = 'cart-item';
    if (g.img) {
      body.style.backgroundImage    = `url('${g.img}')`;
      body.style.backgroundSize     = 'cover';
      body.style.backgroundPosition = 'center top';
    } else {
      body.style.background = `linear-gradient(160deg, ${g.color}, ${g.bg})`;
    }
    body.innerHTML = `
      ${locked ? `<div class="cart-locked-overlay">🔒<br>${g.cost}🪙</div>` : ''}
      <div class="cart-name">${g.name}</div>
    `;

    const connector = document.createElement('div');
    connector.className = 'cart-connector';

    wrapper.appendChild(body);
    wrapper.appendChild(connector);

    wrapper.addEventListener('mousedown', (e) => startDrag(e, g, wrapper));
    grid.appendChild(wrapper);
  });
}

// ── DRAG AND DROP ──
function startDrag(e, g, sourceEl) {
  e.preventDefault();
  const rect = sourceEl.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  // Clone the whole wrapper (body + connector) as the flying ghost
  dragGhost = sourceEl.cloneNode(true);
  dragGhost.className = 'cart-ghost';
  dragGhost.style.left   = (e.clientX - offsetX) + 'px';
  dragGhost.style.top    = (e.clientY - offsetY) + 'px';
  dragGhost.style.width  = rect.width + 'px';
  document.body.appendChild(dragGhost);

  const slot = document.getElementById('cartridge-slot');

  function onMove(ev) {
    dragGhost.style.left = (ev.clientX - offsetX) + 'px';
    dragGhost.style.top  = (ev.clientY - offsetY) + 'px';

    // Highlight slot when hovering over it
    const sr = slot.getBoundingClientRect();
    const over = ev.clientX > sr.left && ev.clientX < sr.right &&
                 ev.clientY > sr.top  && ev.clientY < sr.bottom;
    slot.classList.toggle('slot-hover', over);
  }

  function onUp(ev) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    slot.classList.remove('slot-hover');

    const sr  = slot.getBoundingClientRect();
    const hit = ev.clientX > sr.left && ev.clientX < sr.right &&
                ev.clientY > sr.top  && ev.clientY < sr.bottom;

    dragGhost.remove();
    dragGhost = null;

    if (hit) onCartridgeInserted(g);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onCartridgeInserted(g) {
  if (State.isUnlocked(g.id)) {
    launchGame(g);
    return;
  }
  // Show unlock modal
  const modal = document.getElementById('unlock-modal');
  document.getElementById('modal-title').textContent = g.name;
  document.getElementById('modal-body').innerHTML =
    `Unlock this game for<br><br>🪙 ${g.cost} tokens?<br><br>You have: 🪙 ${State.getTokens()}`;
  document.getElementById('modal-unlock').style.display = '';
  modal.classList.remove('hidden');

  document.getElementById('modal-unlock').onclick = () => {
    if (State.canAfford(g.cost)) {
      State.spendTokens(g.cost);
      State.unlock(g.id);
      modal.classList.add('hidden');
      updateTokenDisplay();
      renderCartridgeRack();
      launchGame(g);
    } else {
      document.getElementById('modal-body').innerHTML =
        `Not enough tokens!<br><br>Need: 🪙 ${g.cost}<br>Have: 🪙 ${State.getTokens()}`;
      document.getElementById('modal-unlock').style.display = 'none';
    }
  };
  document.getElementById('modal-cancel').onclick = () => modal.classList.add('hidden');
}

// ── GAME ──
const GAME_MODULES = {
  'juggling':     () => typeof JugglingGame     !== 'undefined' ? JugglingGame     : null,
  'box-sorting':  () => typeof BoxSortingGame   !== 'undefined' ? BoxSortingGame   : null,
  'flappy-goose': () => typeof FlappyGooseGame  !== 'undefined' ? FlappyGooseGame  : null,
  'moon-landing': () => typeof MoonLandingGame  !== 'undefined' ? MoonLandingGame  : null,
  'tile-sorting': () => typeof TileSortingGame  !== 'undefined' ? TileSortingGame  : null,
  'whack-a-mole': () => typeof WhackAMoleGame   !== 'undefined' ? WhackAMoleGame   : null,
};

function launchGame(g) {
  if (activeGame) { activeGame.stop(); activeGame = null; }
  currentGame = g;
  hideRack();
  showScreen('game');
  document.getElementById('game-title-display').textContent = g.icon + ' ' + g.name;
  document.getElementById('controls-hint').textContent = g.controls;
  updateTokenDisplay();

  const canvas = document.getElementById('game-canvas');
  const mod = GAME_MODULES[g.id]();
  if (!mod) { canvas.getContext('2d').fillText('COMING SOON', 160, 220); return; }

  activeGame = mod;
  mod.start(canvas, (tokensEarned) => {
    if (tokensEarned > 0) {
      State.addTokens(tokensEarned);
      updateTokenDisplay();
    }
  });
}

document.getElementById('btn-back-game').onclick = () => {
  if (activeGame) { activeGame.stop(); activeGame = null; }
  currentGame = null;
  showScreen('menu');
  showRack();
  renderCartridgeRack();
  updateTokenDisplay();
};

document.getElementById('btn-restart-game').onclick = () => {
  if (currentGame) launchGame(currentGame);
};

// ── SETTINGS ──
document.getElementById('btn-back-settings').onclick = () => showScreen('boot');
const soundSlider = document.getElementById('setting-sound');
soundSlider.oninput = () => {
  document.getElementById('sound-val').textContent = soundSlider.value;
};
document.getElementById('btn-reset-tokens').onclick = () => {
  if (confirm('Reset ALL progress and tokens?')) {
    State.reset();
    updateTokenDisplay();
  }
};

updateTokenDisplay();
