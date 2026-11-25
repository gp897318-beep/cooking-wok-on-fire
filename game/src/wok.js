// Wok On Fire — the wok: flame, toss timing, cooking progress and burning.
// The wok is the game's skill test: keep the flame right, toss on the green,
// and the dish cooks fast and clean; ignore it and it burns.

import { BURN_RUIN, FLAMES, SCORE, TOSS, INGREDIENT_BY_ID } from './config.js';
import { filledSlots, wokMatchesOrder } from './orders.js';

/** A fresh, empty wok sitting on a medium flame. */
export function createWok() {
  return {
    contents: [], // ingredient ids, in the order they were tossed in
    cook: 0, // 0..1, done at 1
    burn: 0, // 0..1, ruined at BURN_RUIN
    flame: 1, // 0 low, 1 medium, 2 high
    needle: 0, // -1..1, the toss needle's position on its meter
    needleDir: 1,
    tossFlash: 0, // seconds left of the "PERFECT!" flash
    tossText: '',
    sizzle: 0, // steam/sizzle intensity for the renderer
    ruined: false,
  };
}

/** The ticket the wok is cooking for, if the player picked one. */
export function selectedOrder(sim) {
  return sim.orders.find((order) => order.id === sim.selectedOrderId) ?? null;
}

/** Drop an ingredient into the wok. Wrong ones hurt quality; too many chillies too. */
export function addIngredient(sim, ingredientId) {
  const wok = sim.wok;
  const order = selectedOrder(sim);
  if (wok.ruined) return { ok: false, why: 'ruined' };
  if (wok.cook >= 1) return { ok: false, why: 'done' };
  wok.contents.push(ingredientId);
  wok.sizzle = 1;
  const item = INGREDIENT_BY_ID[ingredientId];
  sim.events.push({ type: 'add', ingredient: ingredientId });
  if (order) {
    const before = filledSlots(order, wok.contents.slice(0, -1));
    const after = filledSlots(order, wok.contents);
    const newlyFilled = after.some((filled, i) => filled && !before[i]);
    const isWanted = newlyFilled || (ingredientId === 'cabai' && order.recipe.spice > 0);
    if (!isWanted) {
      order.wrongCount += 1;
      sim.score = Math.max(0, sim.score + SCORE.wrongIngredient);
      sim.floaters.push({ x: 640, y: 340, text: `Bukan ${item.name}! -20`, color: '#ff6b6b', life: 1.4 });
      sim.events.push({ type: 'wrongIngredient', ingredient: ingredientId });
    }
  }
  return { ok: true };
}

/** The toss: Space or a click on the wok. Score the needle against the green band. */
export function tossWok(sim) {
  const wok = sim.wok;
  if (wok.contents.length === 0 || wok.ruined) return { quality: 'none' };
  const distance = Math.abs(wok.needle);
  let quality = 'miss';
  if (distance <= TOSS.perfectHalfWidth) quality = 'perfect';
  else if (distance <= TOSS.goodHalfWidth) quality = 'good';
  if (quality === 'perfect') {
    wok.cook = Math.min(1, wok.cook + TOSS.perfectCookBoost);
    wok.burn = Math.max(0, wok.burn - 0.12);
    sim.combo += 1;
    sim.bestCombo = Math.max(sim.bestCombo, sim.combo);
    sim.score += SCORE.perfectToss;
    wok.tossText = 'PERFECT TOSS! +25';
    wok.tossFlash = 0.9;
    sim.events.push({ type: 'toss', quality });
  } else if (quality === 'good') {
    wok.cook = Math.min(1, wok.cook + TOSS.goodCookBoost);
    wok.burn = Math.max(0, wok.burn - 0.05);
    sim.score += SCORE.goodToss;
    wok.tossText = 'Bagus! +10';
    wok.tossFlash = 0.7;
    sim.events.push({ type: 'toss', quality });
  } else {
    wok.burn = Math.min(1, wok.burn + TOSS.missBurn);
    sim.combo = 0;
    wok.tossText = 'Melenceng...';
    wok.tossFlash = 0.7;
    sim.events.push({ type: 'toss', quality });
  }
  wok.sizzle = 1;
  return { quality };
}

/** Advance the wok one step: needle sweep, cooking, burning, steam. */
export function stepWok(sim, dt) {
  const wok = sim.wok;
  // The needle sweeps across the meter and back.
  wok.needle += wok.needleDir * (dt / TOSS.sweepSeconds) * 2;
  if (wok.needle > 1) { wok.needle = 1; wok.needleDir = -1; }
  if (wok.needle < -1) { wok.needle = -1; wok.needleDir = 1; }
  wok.tossFlash = Math.max(0, wok.tossFlash - dt);
  wok.sizzle = Math.max(0, wok.sizzle - dt * 1.5);
  if (wok.contents.length === 0 || wok.ruined || wok.cook >= 1) return;
  const flame = FLAMES[wok.flame];
  wok.cook = Math.min(1, wok.cook + flame.cookRate * dt);
  wok.burn = Math.min(1, wok.burn + flame.burnRate * dt);
  if (wok.burn >= BURN_RUIN) {
    wok.ruined = true;
    sim.combo = 0;
    const order = selectedOrder(sim);
    if (order) order.wrongCount += 2;
    sim.floaters.push({ x: 640, y: 340, text: 'GOSONG! Buang isinya (B)', color: '#ff6b6b', life: 1.8 });
    sim.events.push({ type: 'burned' });
  }
}

/** Empty the wok into the bin (after a burn, or to start a dish over). */
export function clearWok(sim) {
  sim.wok = createWok();
  sim.events.push({ type: 'clearWok' });
}

/** Pour the finished wok into a bowl on the serving counter. */
export function plateWok(sim) {
  const wok = sim.wok;
  const order = selectedOrder(sim);
  if (wok.contents.length === 0 || wok.cook < 1 || wok.ruined || !order) return null;
  const matched = wokMatchesOrder(order, wok.contents);
  const quality = matched ? 1 : Math.max(0.35, 1 - order.wrongCount * 0.25);
  const plate = {
    orderId: order.id,
    recipe: order.recipe,
    contents: [...wok.contents],
    quality,
    matched,
    bornAt: sim.time,
  };
  order.state = 'plated';
  order.dishQuality = quality;
  sim.plates.push(plate);
  sim.wok = createWok();
  sim.floaters.push({
    x: 640, y: 300,
    text: matched ? 'Racikan sempurna!' : 'Racikan kurang pas...',
    color: matched ? '#7CFC9A' : '#ffd166',
    life: 1.6,
  });
  sim.events.push({ type: 'plated', order, quality });
  return plate;
}

/** How done the current dish looks, for the cook-progress ring. */
export function cookPercent(wok) {
  return Math.round(wok.cook * 100);
}
