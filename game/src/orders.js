// Wok On Fire — the order board: tickets arrive, wait, get served or walk away.
// A ticket is a recipe plus a patience timer; the board is the game's clock.

import { CUSTOMERS, LEVELS, RECIPES, SCORE, levelFor } from './config.js';

let orderCounter = 0;

/** Build a fresh ticket for the current level: a random unlocked recipe and customer. */
export function spawnOrder(sim, rng) {
  const level = levelFor(sim.score);
  const menu = RECIPES.slice(0, level.recipes);
  const recipe = menu[Math.floor(rng() * menu.length)];
  const customer = CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)];
  orderCounter += 1;
  return {
    id: orderCounter,
    customer: customer.name,
    color: customer.color,
    recipe,
    timeLeft: level.ticketSeconds,
    maxTime: level.ticketSeconds,
    state: 'waiting', // waiting | cooking | plated | served | expired
    dishQuality: 0, // 0..1, set when the dish is plated
    wrongCount: 0,
  };
}

/** Tick every ticket's patience down; expired ones leave and cost a strike. */
export function tickOrders(sim, dt) {
  for (const order of sim.orders) {
    if (order.state === 'served' || order.state === 'expired') continue;
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      order.timeLeft = 0;
      order.state = 'expired';
      order.expiredAt = sim.time;
      sim.strikes += 1;
      sim.score = Math.max(0, sim.score + SCORE.expiredOrder);
      sim.floaters.push({ x: 170, y: 120, text: `${order.customer} pergi! -40`, color: '#ff6b6b', life: 1.6 });
      sim.events.push({ type: 'orderExpired', order });
      if (sim.selectedOrderId === order.id) sim.selectedOrderId = null;
    }
  }
  // Expired tickets stay on the board as a "walked away" note for two seconds,
  // then the board clears them for the next customer.
  sim.orders = sim.orders.filter((order) => order.state !== 'expired' || sim.time - (order.expiredAt ?? 0) < 2);
  sim.orders = sim.orders.filter((order) => order.state !== 'served');
}

/** The recipe slots a ticket shows: noodle, protein, veg, sauce and chilli level. */
export function recipeSlots(recipe) {
  return [
    { kind: 'noodle', id: recipe.noodle },
    { kind: 'protein', id: recipe.protein },
    { kind: 'veg', id: recipe.veg },
    { kind: 'sauce', id: recipe.sauce },
    { kind: 'spice', id: recipe.spice > 0 ? 'cabai' : null, count: recipe.spice },
  ];
}

/** Which slots of the ticket are already in the wok (for the ticket's checkmarks). */
export function filledSlots(order, wokContents) {
  const slots = recipeSlots(order.recipe);
  const have = new Set(wokContents);
  return slots.map((slot) => {
    if (slot.kind === 'spice') {
      const chillies = wokContents.filter((id) => id === 'cabai').length;
      return chillies >= slot.count;
    }
    return slot.id !== null && have.has(slot.id);
  });
}

/** True when the wok holds exactly the ticket's recipe, no more and no less. */
export function wokMatchesOrder(order, wokContents) {
  const slots = recipeSlots(order.recipe);
  const want = [];
  for (const slot of slots) {
    if (slot.kind === 'spice') {
      for (let i = 0; i < slot.count; i += 1) want.push('cabai');
    } else if (slot.id !== null) want.push(slot.id);
  }
  if (want.length !== wokContents.length) return false;
  const sortedWant = [...want].sort();
  const sortedHave = [...wokContents].sort();
  return sortedWant.every((id, i) => id === sortedHave[i]);
}

/** Score a served dish: recipe base, time left, combo and quality. */
export function serveScore(order, sim) {
  const timeRatio = order.timeLeft / order.maxTime;
  const timeBonus = Math.round(SCORE.timeBonusMax * timeRatio);
  const comboBonus = sim.combo * SCORE.comboStep;
  const quality = order.dishQuality;
  const total = Math.round((order.recipe.base + timeBonus + comboBonus) * (0.6 + 0.4 * quality));
  return { total, timeBonus, comboBonus, quality };
}

/** Serve a plated dish to its ticket: pay out, clear the plate, advance the level. */
export function serveDish(sim, plate, order) {
  const result = serveScore(order, sim);
  sim.score += result.total;
  sim.coins += order.recipe.base / 10 + 5;
  sim.served += 1;
  sim.combo += 1;
  sim.bestCombo = Math.max(sim.bestCombo, sim.combo);
  order.state = 'served';
  sim.plates = sim.plates.filter((p) => p !== plate);
  sim.floaters.push({ x: 640, y: 300, text: `+${result.total}  ${order.recipe.name}`, color: '#ffd166', life: 1.8 });
  sim.events.push({ type: 'served', order, score: result.total });
  if (sim.selectedOrderId === order.id) sim.selectedOrderId = null;
  const level = levelFor(sim.score);
  if (level.level !== sim.level) {
    sim.level = level.level;
    sim.floaters.push({ x: 640, y: 200, text: `LEVEL ${level.level} — Rush dimulai!`, color: '#ff9f1c', life: 2.2 });
    sim.events.push({ type: 'levelUp', level: level.level });
  }
  return result;
}

/** Level table for the HUD: next target score. */
export function nextLevelTarget(score) {
  for (const entry of LEVELS) {
    if (score < entry.target) return entry;
  }
  return null;
}
