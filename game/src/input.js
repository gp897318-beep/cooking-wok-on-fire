// Wok On Fire — input: mouse clicks and keyboard, turned into one action
// object per frame. The simulation never reads the DOM itself.

import { INGREDIENTS } from './config.js';
import { LAYOUT } from './render.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './sim.js';
import { ensureAudio, toggleMute } from './audio.js';

function inside(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** The clickable zones for this frame: bins, tickets, plates, buttons, wok. */
export function zonesFor(sim) {
  const zones = [];
  // Ingredient bins along the bottom counter.
  INGREDIENTS.forEach((item, i) => {
    zones.push({
      kind: 'bin', id: item.id,
      rect: { x: 16 + i * 104, y: LAYOUT.counter.y + 32, w: 100, h: 118 },
    });
  });
  // Order tickets on the board.
  let y = LAYOUT.board.y + 68;
  for (const order of sim.orders) {
    zones.push({ kind: 'ticket', id: order.id, rect: { x: LAYOUT.board.x + 10, y, w: LAYOUT.board.w - 20, h: 104 } });
    y += 112;
  }
  // Plated bowls on the serving counter.
  sim.plates.forEach((plate, i) => {
    zones.push({
      kind: 'plate', id: plate.orderId,
      rect: { x: LAYOUT.serve.x + 70 + (i % 2) * 140 - 56, y: LAYOUT.serve.y + 120 + Math.floor(i / 2) * 110 - 40, w: 112, h: 100 },
    });
  });
  // Buttons and the wok itself.
  zones.push({ kind: 'plateButton', rect: LAYOUT.plateButton });
  zones.push({ kind: 'clearButton', rect: LAYOUT.clearButton });
  for (const button of LAYOUT.flameButtons) zones.push({ kind: 'flame', id: button.flame, rect: button });
  zones.push({ kind: 'mute', rect: LAYOUT.muteButton });
  zones.push({ kind: 'wok', rect: { x: LAYOUT.wok.x - LAYOUT.wok.r, y: LAYOUT.wok.y - LAYOUT.wok.r, w: LAYOUT.wok.r * 2, h: LAYOUT.wok.r * 2 } });
  return zones;
}

/** Convert a click at canvas coordinates into an action for the simulation. */
export function clickAction(sim, x, y, ui) {
  if (sim.screen === SCREEN_TITLE) return { start: true };
  if (sim.screen === SCREEN_OVER) return { start: true };
  for (const zone of zonesFor(sim)) {
    if (!inside(x, y, zone.rect)) continue;
    if (zone.kind === 'bin') return { add: zone.id };
    if (zone.kind === 'ticket') return { selectOrderId: zone.id };
    if (zone.kind === 'plate') return { serveOrderId: zone.id };
    if (zone.kind === 'plateButton') return { plate: true };
    if (zone.kind === 'clearButton') return { clear: true };
    if (zone.kind === 'flame') return { flame: zone.id };
    if (zone.kind === 'mute') {
      ui.muted = toggleMute();
      return {};
    }
    if (zone.kind === 'wok') return { toss: true };
  }
  return {};
}

/** Convert a key press into an action. Returns null for keys the game ignores. */
export function keyAction(sim, key, ui) {
  const lower = key.toLowerCase();
  if (sim.screen === SCREEN_TITLE && (key === 'Enter' || key === ' ')) return { start: true };
  if (sim.screen === SCREEN_OVER && lower === 'r') return { start: true };
  if (sim.screen !== SCREEN_PLAY) return null;
  if (key === ' ') return { toss: true };
  if (lower === 'f') return { flame: (sim.wok.flame + 1) % 3 };
  if (lower === 'b') return { clear: true };
  if (lower === 'm') {
    ui.muted = toggleMute();
    return {};
  }
  if (lower === 'r') return { restart: true };
  if (lower === 'enter') return { plate: true };
  const item = INGREDIENTS.find((entry) => entry.key === lower);
  if (item) return { add: item.id };
  return null;
}

/** Which ingredient bin the pointer is hovering, for the highlight. */
export function hoverBinAt(x, y) {
  for (const zone of zonesFor({ orders: [], plates: [], wok: { flame: 1 } })) {
    if (zone.kind === 'bin' && inside(x, y, zone.rect)) return zone.id;
  }
  return null;
}

/** Wire a canvas element to the game: returns a queue of actions, one per event. */
export function attachInput(canvas, sim, ui, queue) {
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  canvas.addEventListener('pointerdown', (event) => {
    ensureAudio();
    const point = canvasPoint(event);
    const action = clickAction(sim, point.x, point.y, ui);
    if (action && Object.keys(action).length > 0) queue.push(action);
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event);
    ui.hoverBin = hoverBinAt(point.x, point.y);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    ensureAudio();
    const action = keyAction(sim, event.key, ui);
    if (action) {
      event.preventDefault();
      queue.push(action);
    }
  });
}
