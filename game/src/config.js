// Wok On Fire — configuration: the world of the noodle stall, its recipes and its levels.
// Every number that tunes the game lives here, so the rules can be rebalanced without
// touching the simulation or the renderer.

export const VIEW = { width: 1280, height: 720 };

// One in-game day lasts this long; the shift ends and the score is tallied.
export const DAY_SECONDS = 180;

// A customer walks away after three expired orders.
export const MAX_STRIKES = 3;

// How many tickets may wait on the order board at once.
export const MAX_ORDERS = 4;

// Toss timing: the needle sweeps back and forth; landing inside the green band is perfect.
export const TOSS = {
  sweepSeconds: 1.15,
  perfectHalfWidth: 0.16,
  goodHalfWidth: 0.34,
  perfectCookBoost: 0.16,
  goodCookBoost: 0.07,
  missBurn: 0.22,
};

// Flame levels: 0 low, 1 medium, 2 high. High cooks fast but burns fast.
export const FLAMES = [
  { name: 'Api Kecil', cookRate: 0.045, burnRate: 0.0, color: '#7fb7ff' },
  { name: 'Api Sedang', cookRate: 0.085, burnRate: 0.03, color: '#ffb347' },
  { name: 'Api Besar', cookRate: 0.15, burnRate: 0.11, color: '#ff5a2a' },
];

// Burn past this and the wok's contents are ruined.
export const BURN_RUIN = 1.0;

// Score: base per served dish, plus what is left on its ticket timer, plus combo.
export const SCORE = {
  serveBase: 100,
  timeBonusMax: 80,
  perfectToss: 25,
  goodToss: 10,
  comboStep: 15,
  wrongIngredient: -20,
  expiredOrder: -40,
};

// Ingredients sold at the counter. key is the keyboard shortcut, price is what a
// serving earns back in coins (coins are flavour: they show the stall is thriving).
export const INGREDIENTS = [
  { id: 'mie', name: 'Mie Kuning', short: 'Mie', key: '1', color: '#f2c94c', kind: 'noodle', price: 6, emoji: '🍜', tiny: 'Mie' },
  { id: 'kwetiau', name: 'Kwetiau', short: 'Kwetiau', key: '2', color: '#f6e3c5', kind: 'noodle', price: 7, emoji: '🍜', tiny: 'Kwe' },
  { id: 'bihun', name: 'Bihun', short: 'Bihun', key: '3', color: '#fdf6e3', kind: 'noodle', price: 6, emoji: '🍜', tiny: 'Bih' },
  { id: 'ramen', name: 'Ramen', short: 'Ramen', key: '4', color: '#f7d774', kind: 'noodle', price: 9, emoji: '🍜', tiny: 'Ram' },
  { id: 'ayam', name: 'Ayam', short: 'Ayam', key: '5', color: '#e8a04c', kind: 'protein', price: 8, emoji: '🍗', tiny: 'Ayam' },
  { id: 'sapi', name: 'Sapi', short: 'Sapi', key: '6', color: '#c65b4e', kind: 'protein', price: 10, emoji: '🥩', tiny: 'Sapi' },
  { id: 'udang', name: 'Udang', short: 'Udang', key: '7', color: '#ff8f6b', kind: 'protein', price: 11, emoji: '🍤', tiny: 'Udang' },
  { id: 'sawi', name: 'Sawi Hijau', short: 'Sawi', key: '8', color: '#58b368', kind: 'veg', price: 4, emoji: '🥬', tiny: 'Sawi' },
  { id: 'wortel', name: 'Wortel', short: 'Wortel', key: '9', color: '#ff7f2a', kind: 'veg', price: 4, emoji: '🥕', tiny: 'Wort' },
  { id: 'telur', name: 'Telur', short: 'Telur', key: '0', color: '#fff3b0', kind: 'veg', price: 5, emoji: '🥚', tiny: 'Telur' },
  { id: 'cabai', name: 'Cabai Rawit', short: 'Cabai', key: 'q', color: '#e63946', kind: 'spice', price: 3, emoji: '🌶️', tiny: 'Cabe' },
  { id: 'saus', name: 'Saus Manis', short: 'Saus', key: 'w', color: '#8b5a2b', kind: 'sauce', price: 3, emoji: '🫙', tiny: 'Saus' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((item) => [item.id, item]));

// The stall's menu: every dish is one noodle, one protein, one vegetable, one sauce
// and a chilli level. The ticket shows exactly these five slots.
export const RECIPES = [
  { id: 'mie-goreng', name: 'Mie Goreng Spesial', noodle: 'mie', protein: 'ayam', veg: 'sawi', sauce: 'saus', spice: 1, base: 100 },
  { id: 'kwetiau-sapi', name: 'Kwetiau Sapi Lada', noodle: 'kwetiau', protein: 'sapi', veg: 'wortel', sauce: 'saus', spice: 1, base: 120 },
  { id: 'bihun-udang', name: 'Bihun Udang Pedas', noodle: 'bihun', protein: 'udang', veg: 'sawi', sauce: 'saus', spice: 2, base: 130 },
  { id: 'ramen-ayam', name: 'Ramen Ayam Kuah', noodle: 'ramen', protein: 'ayam', veg: 'wortel', sauce: 'saus', spice: 0, base: 140 },
  { id: 'mie-sapi', name: 'Mie Sapi Mercon', noodle: 'mie', protein: 'sapi', veg: 'cabai', sauce: 'saus', spice: 3, base: 150 },
  { id: 'kwetiau-udang', name: 'Kwetiau Udang Telur', noodle: 'kwetiau', protein: 'udang', veg: 'telur', sauce: 'saus', spice: 1, base: 140 },
  { id: 'bihun-ayam', name: 'Bihun Ayam Jamur', noodle: 'bihun', protein: 'ayam', veg: 'wortel', sauce: 'saus', spice: 0, base: 110 },
  { id: 'ramen-sapi', name: 'Ramen Sapi Pedas', noodle: 'ramen', protein: 'sapi', veg: 'sawi', sauce: 'saus', spice: 2, base: 160 },
];

// Regulars at the stall. Their names and colours are original to this game.
export const CUSTOMERS = [
  { name: 'Bu Ratna', color: '#e07a5f' },
  { name: 'Pak Dedi', color: '#3d8bfd' },
  { name: 'Mbak Sari', color: '#e9c46a' },
  { name: 'Mas Joko', color: '#2a9d8f' },
  { name: 'Kak Lilis', color: '#f4a261' },
  { name: 'Bang Rizky', color: '#9b5de5' },
  { name: 'Nenek Wati', color: '#ef476f' },
  { name: 'Om Bambang', color: '#06d6a0' },
];

// Difficulty curve: each level shortens ticket timers, spawns orders faster and
// unlocks more of the menu.
export const LEVELS = [
  { level: 1, orderEvery: 14, ticketSeconds: 75, recipes: 3, target: 300 },
  { level: 2, orderEvery: 12, ticketSeconds: 65, recipes: 5, target: 700 },
  { level: 3, orderEvery: 10, ticketSeconds: 55, recipes: 6, target: 1200 },
  { level: 4, orderEvery: 8.5, ticketSeconds: 48, recipes: 8, target: 1800 },
  { level: 5, orderEvery: 7, ticketSeconds: 42, recipes: 8, target: 2600 },
];

export function levelFor(score) {
  let level = LEVELS[0];
  for (const entry of LEVELS) {
    if (score >= entry.target) level = entry;
  }
  return level;
}

/** Small deterministic random generator, so a screenshot seed always stages the same frame. */
export function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
