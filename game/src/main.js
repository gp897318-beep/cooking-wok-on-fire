// Wok On Fire — entry point: the frame loop, the action queue and the
// screenshot mode. The game runs at a fixed 60 Hz step so a replayed seed
// always plays the same way.

import { VIEW } from './config.js';
import { attachInput } from './input.js';
import { drawFrame } from './render.js';
import { SCREEN_OVER, SCREEN_PLAY, STEP, createSim, drainEvents, resetSim, stepSim } from './sim.js';
import { stageShot } from './shots.js';
import { ensureAudio, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

const sim = createSim(seed);
const ui = { hoverBin: null, muted: isMuted() };
const queue = [];

attachInput(canvas, sim, ui, queue);

// Screenshot mode: stage one deterministic scene, draw it once, and freeze.
// The frame the browser captures is exactly the staged game state.
if (shotName) {
  const screen = stageShot(shotName, sim);
  sim.screen = screen;
  drawFrame(ctx, sim, ui);
  document.title = `Wok On Fire — shot ${shotName}`;
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const action = queue.shift() ?? {};
      if (action.restart) {
        resetSim(sim);
        sim.screen = SCREEN_PLAY;
      } else {
        stepSim(sim, STEP, action);
      }
      drainEvents(sim);
    }
    drawFrame(ctx, sim, ui);
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointerdown', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });
  requestAnimationFrame(frame);
}

// Keep the screen-reader status line honest about the shift.
const status = document.getElementById('status');
setInterval(() => {
  if (!status) return;
  if (sim.screen === SCREEN_PLAY) {
    status.textContent = `Skor ${sim.score}, ${sim.served} hidangan disajikan, ${sim.orders.length} pesanan menunggu, ${Math.ceil(sim.dayLeft)} detik tersisa.`;
  } else if (sim.screen === SCREEN_OVER) {
    status.textContent = `Shift selesai. Skor akhir ${sim.score}, ${sim.served} hidangan disajikan.`;
  } else {
    status.textContent = 'Wok On Fire: game memasak mie di warung wok. Tekan Enter untuk mulai.';
  }
}, 1000);
