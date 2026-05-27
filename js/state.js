const GAMES = [
  { id: 'juggling',    name: 'JUGGLING',     icon: '🤹', cost: 0,  color: '#b8860b', bg: '#2a1f00', img: 'images/juggling.png',     controls: 'A/D = MOVE   S = JUGGLE' },
  { id: 'box-sorting', name: 'BOX SORTING',  icon: '📦', cost: 15, color: '#8b3a00', bg: '#1f0d00', img: 'images/box-sorting.png',  controls: 'MOUSE = DRAG BOXES TO TRUCKS' },
  { id: 'flappy-goose',name: 'FLAPPY GOOSE', icon: '🪿', cost: 30, color: '#006080', bg: '#001520', img: 'images/flappy-goose.png', controls: 'W = FLAP WINGS' },
  { id: 'moon-landing',name: 'MOON LANDING', icon: '🚀', cost: 50, color: '#2d0060', bg: '#0a0015', img: 'images/moon-landing.png', controls: 'A/D = MOVE   CLICK = SHOOT' },
  { id: 'tile-sorting',name: 'TILE SORTING', icon: '🀱',  cost: 60, color: '#005030', bg: '#001208', img: 'images/tile-sorting.png', controls: 'DRAG TILES TO MATCHING SLOTS' },
  { id: 'whack-a-mole',name: 'WHACK-A-MOLE', icon: '🔨', cost: 80, color: '#5a1a00', bg: '#150500', img: 'images/whack-a-mole.png', controls: 'A/D = MOVE   S = WHACK' },
];

const State = (() => {
  const KEY = 'playport_save';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { tokens: 0, unlocked: ['juggling'] };
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  let data = load();

  return {
    getTokens()         { return data.tokens; },
    addTokens(n)        { data.tokens += n; save(data); },
    spendTokens(n)      { data.tokens -= n; save(data); },
    isUnlocked(id)      { return data.unlocked.includes(id); },
    unlock(id)          { if (!data.unlocked.includes(id)) { data.unlocked.push(id); save(data); } },
    reset()             { data = { tokens: 0, unlocked: ['juggling'] }; save(data); },
    canAfford(cost)     { return data.tokens >= cost; },
  };
})();
