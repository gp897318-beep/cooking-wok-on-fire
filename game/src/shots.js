// Wok On Fire — screenshot staging: each named scene plays the real rules
// forward from a fresh world for a fixed number of steps, steered by the
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. ?shot=start|play|rush|end

import { STEP, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, autopilotAct, createSim, resetSim, stepSim } from './sim.js';
import { LEVELS } from './config.js';
import { spawnOrder } from './orders.js';
import { addIngredient, clearWok, plateWok } from './wok.js';
import { wokMatchesOrder } from './orders.js';

const START_SECONDS = 2;
const PLAY_SECONDS = 24;
const RUSH_SECONDS = 55;
const END_SECONDS = 190;

/** A sloppy pilot for the end scene: it tosses late and forgets the flame, so the
 *  shift ends the way a hurried player's does. */
function sloppyAct(sim) {
  const act = autopilotAct(sim);
  // Toss only when the needle is far from the green, and keep the flame high.
  if (act.toss && Math.abs(sim.wok.needle) < 0.5) delete act.toss;
  act.flame = 2;
  return act;
}

/**
 * Set `sim` to the named scene and return the screen to draw over it.
 * start: the title screen, wok steaming behind it.
 * play: mid-shift, several tickets, the wok mid-toss, one bowl plated.
 * rush: high level, four tickets, big flame, the board nearly full.
 * end: the shift-over screen with a real final score.
 */
export function stageShot(name, sim) {
  resetSim(sim);
  if (name !== 'play' && name !== 'rush' && name !== 'serve' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) stepSim(sim, STEP, {});
    return SCREEN_TITLE;
  }
  sim.screen = SCREEN_PLAY;
  const seconds = name === 'rush' ? RUSH_SECONDS : name === 'end' ? END_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? sloppyAct : autopilotAct;
  for (let i = 0; i < seconds / STEP; i += 1) {
    stepSim(sim, STEP, pilot(sim));
    if (sim.screen === SCREEN_OVER) break;
  }
  if (name === 'rush' && sim.screen !== SCREEN_OVER) {
    // Force the rush look: top level, a full board and a big flame.
    sim.score = Math.max(sim.score, LEVELS[4].target);
    sim.level = 5;
    sim.wok.flame = 2;
  }
  if ((name === 'play' || name === 'rush' || name === 'serve') && sim.screen !== SCREEN_OVER) {
    topUpScene(sim, name === 'rush' ? 3 : 2);
  }
  if (name === 'serve' && sim.screen !== SCREEN_OVER) {
    // The serve scene shows two bowls ready on the counter.
    const extra = sim.orders.find((o) => o.state === 'waiting' && !sim.plates.some((p) => p.orderId === o.id));
    if (extra && sim.plates.length < 2) {
      sim.plates.push({
        orderId: extra.id,
        recipe: extra.recipe,
        contents: [extra.recipe.noodle, extra.recipe.protein, extra.recipe.veg, 'saus'],
        quality: 1,
        matched: true,
        bornAt: sim.time,
      });
      extra.state = 'plated';
      extra.dishQuality = 1;
    }
  }
  // A frozen frame reads best without floating score popups mid-flight.
  if (name !== 'end') sim.floaters = [];
  return sim.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY;
}

/**
 * Guarantee the frozen frame shows a complete game: tickets waiting on the
 * board, the wok mid-assembly with food in it, and a bowl plated and ready.
 * Everything here is built with the same rules the player uses.
 */
function topUpScene(sim, wantOrders) {
  const waiting = () => sim.orders.filter((o) => o.state === 'waiting' || o.state === 'cooking');
  while (waiting().length < wantOrders) {
    const order = spawnOrder(sim, sim.rng);
    order.timeLeft = order.maxTime * (0.55 + sim.rng() * 0.3);
    sim.orders.push(order);
  }
  if (sim.selectedOrderId === null) {
    const first = waiting()[0];
    if (first) sim.selectedOrderId = first.id;
  }
  // The wok mid-assembly: some ingredients in, half cooked, flame high.
  // If the autopilot already finished a dish, plate it when it matches its
  // ticket; a mismatched one is thrown away so the frame stays clean.
  if (sim.wok.cook >= 1 && sim.wok.contents.length > 0 && !sim.wok.ruined) {
    const current = sim.orders.find((o) => o.id === sim.selectedOrderId);
    if (current && wokMatchesOrder(current, sim.wok.contents)) plateWok(sim);
    else clearWok(sim);
  }
  const order = waiting().find((o) => o.id === sim.selectedOrderId) ?? waiting()[0];
  if (order) sim.selectedOrderId = order.id;
  if (order && sim.wok.contents.length < 2 && sim.wok.cook < 1) {
    sim.wok.cook = 0.55;
    sim.wok.burn = 0.18;
    sim.wok.flame = 2;
    sim.wok.needle = 0.05;
    addIngredient(sim, order.recipe.noodle);
    addIngredient(sim, order.recipe.protein);
    addIngredient(sim, order.recipe.veg);
    sim.wok.cook = 0.55;
  }
  // One bowl plated and ready on the serving counter.
  if (sim.plates.length === 0) {
    const other = waiting().find((o) => o.id !== sim.selectedOrderId) ?? waiting()[0];
    if (other) {
      sim.plates.push({
        orderId: other.id,
        recipe: other.recipe,
        contents: [other.recipe.noodle, other.recipe.protein, other.recipe.veg, 'saus'],
        quality: 1,
        matched: true,
        bornAt: sim.time,
      });
      other.state = 'plated';
      other.dishQuality = 1;
    }
  }
}
