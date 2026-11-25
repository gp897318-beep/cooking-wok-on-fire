// Wok On Fire — the simulation: one state object and one step function.
// Everything the game does runs through stepSim, so the screenshot stager can
// play the real rules forward from a fresh state with a fixed seed and the
// frame it renders is a frame a real game produces.

import { DAY_SECONDS, LEVELS, MAX_ORDERS, MAX_STRIKES, mulberry32 } from './config.js';
import { filledSlots, recipeSlots, serveDish, spawnOrder, tickOrders } from './orders.js';
import { addIngredient, clearWok, createWok, plateWok, stepWok, tossWok } from './wok.js';
import { playBurn, playDrop, playOrderBell, playServe, playShiftEnd, playTossGood, playTossMiss, playTossPerfect, setSizzleLevel, startSizzle, stopSizzle } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const STEP = 1 / 60;

/** A fresh shift: empty wok, no tickets, the stall just opened. */
export function createSim(seed = 1) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    time: 0,
    screen: SCREEN_TITLE,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    strikes: 0,
    level: 1,
    dayLeft: DAY_SECONDS,
    orders: [],
    plates: [],
    wok: createWok(),
    selectedOrderId: null,
    spawnIn: 1.2,
    floaters: [], // {x, y, text, color, life}
    particles: [], // {x, y, vx, vy, life, color, size}
    events: [], // drained by main.js each frame to trigger sounds
    over: false,
  };
}

/** Reset a sim to a fresh shift (used by the screenshot stager). */
export function resetSim(sim) {
  const fresh = createSim(sim.seed);
  for (const key of Object.keys(fresh)) sim[key] = fresh[key];
}

function spawnParticles(sim, x, y, count, color, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = sim.rng() * Math.PI * 2;
    const velocity = speed * (0.4 + sim.rng() * 0.8);
    sim.particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 40,
      life: 0.5 + sim.rng() * 0.5,
      maxLife: 1,
      color,
      size: 2 + sim.rng() * 4,
    });
  }
}

function burstSteam(sim, dt) {
  const wok = sim.wok;
  if (wok.contents.length === 0 || wok.ruined) return;
  if (sim.rng() < dt * (6 + wok.flame * 8)) {
    sim.particles.push({
      x: 640 + (sim.rng() - 0.5) * 90, y: 330,
      vx: (sim.rng() - 0.5) * 12, vy: -55 - sim.rng() * 40,
      life: 0.9 + sim.rng() * 0.5, maxLife: 1.4,
      color: 'rgba(255,255,255,0.5)', size: 6 + sim.rng() * 8,
    });
  }
}

/**
 * One fixed step of the game. `act` is what the player did this step:
 * { add, toss, flame, plate, clear, serveOrderId, selectOrderId, start }.
 * Sounds are queued as events; main.js plays them.
 */
export function stepSim(sim, dt, act = {}) {
  if (sim.screen === SCREEN_TITLE) {
    if (act.start) {
      sim.screen = SCREEN_PLAY;
      sim.events.push({ type: 'start' });
    }
    return;
  }
  if (sim.screen === SCREEN_OVER) {
    if (act.start) resetSim(sim);
    return;
  }

  sim.time += dt;
  sim.dayLeft -= dt;

  // New tickets arrive on a timer, faster at higher levels.
  sim.spawnIn -= dt;
  if (sim.spawnIn <= 0 && sim.orders.filter((o) => o.state !== 'served').length < MAX_ORDERS) {
    const order = spawnOrder(sim, sim.rng);
    sim.orders.push(order);
    sim.events.push({ type: 'order', order });
    const level = LEVELS[Math.min(sim.level, LEVELS.length) - 1];
    sim.spawnIn = level.orderEvery * (0.85 + sim.rng() * 0.3);
    if (sim.selectedOrderId === null) sim.selectedOrderId = order.id;
  }

  // Player actions, in the order they resolve.
  if (act.selectOrderId !== undefined && act.selectOrderId !== null) {
    const order = sim.orders.find((o) => o.id === act.selectOrderId);
    if (order && order.state !== 'served' && order.state !== 'expired') {
      sim.selectedOrderId = order.id;
      sim.events.push({ type: 'select', order });
    }
  }
  if (act.flame !== undefined && act.flame !== null) {
    sim.wok.flame = act.flame;
    sim.events.push({ type: 'flame', flame: act.flame });
  }
  if (act.add) addIngredient(sim, act.add);
  if (act.toss) tossWok(sim);
  if (act.clear) clearWok(sim);
  if (act.plate) plateWok(sim);
  if (act.serveOrderId !== undefined && act.serveOrderId !== null) {
    const plate = sim.plates.find((p) => p.orderId === act.serveOrderId);
    const order = sim.orders.find((o) => o.id === act.serveOrderId);
    if (plate && order && order.state === 'plated') {
      serveDish(sim, plate, order);
      spawnParticles(sim, 1100, 300, 14, '#ffd166', 90);
    }
  }

  tickOrders(sim, dt);
  stepWok(sim, dt);
  burstSteam(sim, dt);

  // Floaters and particles age out.
  for (const floater of sim.floaters) floater.life -= dt;
  sim.floaters = sim.floaters.filter((f) => f.life > 0);
  for (const particle of sim.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy -= 20 * dt;
  }
  sim.particles = sim.particles.filter((p) => p.life > 0);

  // The shift ends when the day timer runs out or three customers walk away.
  if (sim.dayLeft <= 0 || sim.strikes >= MAX_STRIKES) {
    sim.dayLeft = Math.max(0, sim.dayLeft);
    sim.screen = SCREEN_OVER;
    sim.over = true;
    sim.events.push({ type: 'over', score: sim.score, served: sim.served });
  }
}

/** Drain the event queue, playing each sound once. Called by main.js per frame. */
export function drainEvents(sim) {
  const events = sim.events.splice(0, sim.events.length);
  for (const event of events) {
    if (event.type === 'add') playDrop();
    else if (event.type === 'toss') {
      if (event.quality === 'perfect') playTossPerfect();
      else if (event.quality === 'good') playTossGood();
      else playTossMiss();
    } else if (event.type === 'order') playOrderBell();
    else if (event.type === 'served') playServe();
    else if (event.type === 'burned') playBurn();
    else if (event.type === 'over') playShiftEnd();
  }
  const cooking = sim.wok.contents.length > 0 && !sim.wok.ruined && sim.wok.cook < 1;
  if (cooking) {
    startSizzle(sim.wok.flame);
    setSizzleLevel(sim.wok.flame, true);
  } else {
    setSizzleLevel(sim.wok.flame, false);
    stopSizzle();
  }
}

/** The autopilot the screenshot stager steers with: play the real rules well. */
export function autopilotAct(sim) {
  const act = {};
  const order = sim.orders.find((o) => o.id === sim.selectedOrderId && o.state !== 'expired')
    || sim.orders.find((o) => o.state === 'waiting' || o.state === 'cooking');
  if (!order) return act;
  if (sim.selectedOrderId !== order.id) act.selectOrderId = order.id;
  const wok = sim.wok;
  if (wok.ruined) {
    act.clear = true;
    return act;
  }
  // Toss when the needle is inside the green band.
  if (wok.contents.length > 0 && Math.abs(wok.needle) <= 0.12) act.toss = true;
  if (wok.cook >= 1) {
    act.plate = true;
    return act;
  }
  // Add the next missing ingredient, one per call (the stager calls once a step,
  // so throttle by the wok's sizzle clock to look human).
  if (wok.sizzle <= 0.55) {
    const filled = filledSlots(order, wok.contents);
    const slots = recipeSlots(order.recipe);
    for (let i = 0; i < slots.length; i += 1) {
      if (!filled[i]) {
        const slot = slots[i];
        if (slot.kind === 'spice') act.add = 'cabai';
        else if (slot.id) act.add = slot.id;
        break;
      }
    }
  }
  // High flame while cooking, medium when nearly done.
  act.flame = wok.cook > 0.8 ? 1 : 2;
  // Serve any plated dish whose ticket is still waiting.
  const plate = sim.plates.find((p) => p.orderId === order.id);
  if (plate) act.serveOrderId = order.id;
  return act;
}
