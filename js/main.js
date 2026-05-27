let activeGame = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function updateTokenDisplay() {
  const t = State.getTokens();
  document.getElementById('token-count').textContent = t;
  document.getElementById('game-token-count').textContent = t;
}

// ── BOOT ──
document.getElementById('btn-play').onclick = () => {
  showScreen('menu');
  renderCartridges();
  updateTokenDisplay();
};
document.getElementById('btn-settings-boot').onclick = () => showScreen('settings');
document.getElementById('btn-quit').onclick = () => {
  if (confirm('Quit PlayPort?')) window.close();
};

// ── MENU ──
document.getElementById('btn-back-menu').onclick = () => showScreen('boot');

function renderCartridges() {
  const grid = document.getElementById('cartridge-grid');
  grid.innerHTML = '';
  GAMES.forEach(g => {
    const locked = !State.isUnlocked(g.id);
    const el = document.createElement('div');
    el.className = 'cartridge' + (locked ? ' locked' : '');

    if (g.img) {
      // Use the provided cartridge artwork as full background
      el.style.backgroundImage = `url('${g.img}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center top';
    } else {
      // Fallback gradient for games without artwork (Moon Landing)
      el.style.background = `linear-gradient(160deg, ${g.color}, ${g.bg})`;
    }

    el.innerHTML = `
      ${g.img ? '' : `<div class="cartridge-icon">${g.icon}</div>`}
      ${locked ? '<div class="lock-overlay"><div class="lock-icon">🔒</div><div class="lock-cost">🪙 ${g.cost} to unlock</div></div>' : ''}
      ${!locked && g.cost > 0 ? `<div class="cartridge-cost">🪙${g.cost}</div>` : ''}
      ${!g.img ? `<div class="cartridge-label">${g.name}</div>` : '<div class="cartridge-notch"></div>'}
    `;
    el.onclick = () => onCartridgeClick(g);
    grid.appendChild(el);
  });
}

function onCartridgeClick(g) {
  if (State.isUnlocked(g.id)) {
    launchGame(g);
    return;
  }
  const modal = document.getElementById('unlock-modal');
  document.getElementById('modal-title').textContent = g.name;
  document.getElementById('modal-body').innerHTML =
    `Unlock this game for<br><br>🪙 ${g.cost} tokens?<br><br>You have: 🪙 ${State.getTokens()}`;
  modal.classList.remove('hidden');
  document.getElementById('modal-unlock').onclick = () => {
    if (State.canAfford(g.cost)) {
      State.spendTokens(g.cost);
      State.unlock(g.id);
      modal.classList.add('hidden');
      updateTokenDisplay();
      renderCartridges();
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
  'juggling':     () => typeof JugglingGame !== 'undefined' ? JugglingGame : null,
  'box-sorting':  () => typeof BoxSortingGame !== 'undefined' ? BoxSortingGame : null,
  'flappy-goose': () => typeof FlappyGooseGame !== 'undefined' ? FlappyGooseGame : null,
  'moon-landing': () => typeof MoonLandingGame !== 'undefined' ? MoonLandingGame : null,
  'tile-sorting': () => typeof TileSortingGame !== 'undefined' ? TileSortingGame : null,
  'whack-a-mole': () => typeof WhackAMoleGame !== 'undefined' ? WhackAMoleGame : null,
};

function launchGame(g) {
  if (activeGame) { activeGame.stop(); activeGame = null; }
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
  showScreen('menu');
  renderCartridges();
  updateTokenDisplay();
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
