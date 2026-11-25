// Wok On Fire — the renderer: every pixel of the stall, drawn on one canvas.
// The kitchen is drawn, not photographed: tiled walls, a wooden counter, a steel
// wok over a live flame, tickets pinned to the order board. No images are loaded.

import { FLAMES, INGREDIENTS, INGREDIENT_BY_ID, VIEW } from './config.js';
import { filledSlots, nextLevelTarget, recipeSlots } from './orders.js';
import { cookPercent } from './wok.js';

// ---- layout: every panel's rectangle, shared with input.js -----------------
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 56 },
  board: { x: 12, y: 64, w: 284, h: 476 },
  kitchen: { x: 308, y: 64, w: 664, h: 476 },
  serve: { x: 984, y: 64, w: 284, h: 476 },
  counter: { x: 12, y: 548, w: 1256, h: 164 },
  wok: { x: 640, y: 372, r: 108 },
  tossMeter: { x: 480, y: 196, w: 320, h: 26 },
  flameButtons: [
    { x: 1000, y: 470, w: 80, h: 56, flame: 0, label: 'KECIL' },
    { x: 1088, y: 470, w: 80, h: 56, flame: 1, label: 'SEDANG' },
    { x: 1176, y: 470, w: 80, h: 56, flame: 2, label: 'BESAR' },
  ],
  plateButton: { x: 1000, y: 400, w: 128, h: 56 },
  clearButton: { x: 1136, y: 400, w: 120, h: 56 },
  muteButton: { x: 1224, y: 10, w: 44, h: 36 },
};

// ---- small drawing helpers -------------------------------------------------
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold' : 'normal'} ${size}px "DejaVu Sans", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function chip(ctx, x, y, w, h, color, label, size = 12) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = `bold ${size}px "DejaVu Sans", Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + size / 2 - 1);
}

// A little drawn bowl of noodles: swirl lines in a bowl, coloured by the dish.
function drawNoodleBowl(ctx, x, y, r, colors) {
  ctx.fillStyle = '#f8f4e8';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a8';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x, y - 2, r * (0.55 - i * 0.14), 0.3, Math.PI - 0.4);
    ctx.stroke();
  }
  colors.slice(0, 3).forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - r * 0.5 + i * r * 0.5, y - 6 - (i % 2) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---- the whole frame -------------------------------------------------------
export function drawFrame(ctx, sim, ui) {
  drawKitchen(ctx, sim);
  drawTopBar(ctx, sim, ui);
  drawOrderBoard(ctx, sim);
  drawStove(ctx, sim);
  drawServeCounter(ctx, sim);
  drawIngredientCounter(ctx, sim, ui);
  drawFloaters(ctx, sim);
  if (sim.screen === 'title') drawTitle(ctx, sim);
  if (sim.screen === 'over') drawGameOver(ctx, sim);
}

function drawKitchen(ctx, sim) {
  // Warm tiled wall.
  ctx.fillStyle = '#f7e8c9';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f2dfba';
  for (let y = 56; y < 548; y += 46) {
    for (let x = (y % 92 === 0 ? 0 : 23); x < VIEW.width; x += 46) {
      ctx.fillRect(x, y, 44, 44);
    }
  }
  // Wooden counter band behind the stove and the bins.
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 540, VIEW.width, 8);
  ctx.fillStyle = '#a06a35';
  ctx.fillRect(0, 548, VIEW.width, 164);
  ctx.fillStyle = '#7c4f24';
  for (let x = 0; x < VIEW.width; x += 90) ctx.fillRect(x, 548, 3, 164);
  // A hanging sign and a window with a street view, for the stall's own look.
  ctx.fillStyle = '#3d2b1f';
  roundRect(ctx, 320, 66, 640, 34, 8);
  ctx.fill();
  text(ctx, 'WARUNG MIE "WOK ON FIRE"  •  SEJAK 1998  •  MIE DIGORENG DI ATAS API', 640, 88, 13, '#ffd166', 'center');
}

function drawTopBar(ctx, sim, ui) {
  const bar = LAYOUT.topBar;
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  text(ctx, 'WOK ON FIRE', 16, 36, 24, '#ffb347');
  text(ctx, 'Noodle Wok Rush', 200, 36, 14, '#f7e8c9', 'left', false);
  text(ctx, `SKOR ${sim.score}`, 560, 36, 20, '#ffffff', 'center');
  text(ctx, `Combo x${sim.combo}`, 700, 36, 15, sim.combo >= 3 ? '#7CFC9A' : '#f7e8c9', 'center');
  text(ctx, `Level ${sim.level}`, 800, 36, 15, '#ffd166', 'center');
  const next = nextLevelTarget(sim.score);
  text(ctx, next ? `Ke Lv ${next.level}: ${next.target}` : 'Level MAX', 900, 36, 13, '#cbb89a', 'center');
  // Day timer: a bar that drains as the shift runs out.
  const ratio = Math.max(0, sim.dayLeft / 180);
  ctx.fillStyle = '#4a3a28';
  roundRect(ctx, 980, 18, 130, 20, 10);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#58b368' : ratio > 0.25 ? '#ffb347' : '#e63946';
  roundRect(ctx, 980, 18, 130 * ratio, 20, 10);
  ctx.fill();
  text(ctx, `${Math.ceil(sim.dayLeft)} dtk`, 1045, 33, 13, '#ffffff', 'center');
  // Strikes: how many customers have walked away, out of three.
  text(ctx, `Pergi ${sim.strikes}/3`, 1200, 36, 13, '#ffb3b3', 'right');
  // Mute button.
  ctx.fillStyle = '#4a3a28';
  roundRect(ctx, LAYOUT.muteButton.x, LAYOUT.muteButton.y, 44, 36, 8);
  ctx.fill();
  text(ctx, ui.muted ? 'MUTE' : 'SUARA', 1246, 34, 11, '#ffffff', 'center');
}

// ---- order board -----------------------------------------------------------
function drawOrderBoard(ctx, sim) {
  const b = LAYOUT.board;
  ctx.fillStyle = '#3d2b1f';
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fill();
  ctx.fillStyle = '#5a4028';
  roundRect(ctx, b.x + 6, b.y + 6, b.w - 12, 34, 8);
  ctx.fill();
  text(ctx, 'ORDER BOARD', b.x + b.w / 2, b.y + 29, 16, '#ffd166', 'center');
  text(ctx, 'Klik tiket untuk memasak pesanannya', b.x + b.w / 2, b.y + 58, 11, '#d8c9a8', 'center', false);
  let y = b.y + 68;
  if (sim.orders.length === 0) {
    text(ctx, 'Belum ada pesanan...', b.x + b.w / 2, y + 60, 14, '#d8c9a8', 'center', false);
    text(ctx, 'Pelanggan segera datang!', b.x + b.w / 2, y + 84, 12, '#a98f6a', 'center', false);
  }
  for (const order of sim.orders) {
    y = drawTicket(ctx, order, b.x + 10, y, b.w - 20, sim);
    y += 8;
  }
}

function drawTicket(ctx, order, x, y, w, sim) {
  const h = 104;
  const selected = sim.selectedOrderId === order.id;
  ctx.fillStyle = order.state === 'expired' ? '#5a3a3a' : selected ? '#fff3d6' : '#fdf6e3';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = selected ? '#ff9f1c' : '#d8c9a8';
  ctx.lineWidth = selected ? 3 : 1;
  ctx.stroke();
  // Customer stripe.
  ctx.fillStyle = order.color;
  roundRect(ctx, x, y, 8, h, 4);
  ctx.fill();
  text(ctx, order.customer, x + 16, y + 20, 14, '#2b2118');
  text(ctx, order.recipe.name, x + 16, y + 40, 13, '#5a4028', 'left', false);
  // Recipe slots: five chips; a check shows what is already in the wok.
  const slots = recipeSlots(order.recipe);
  const filled = sim.selectedOrderId === order.id ? filledSlots(order, sim.wok.contents) : slots.map(() => false);
  let sx = x + 16;
  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i];
    let label = '?';
    let color = '#888888';
    if (slot.kind === 'spice') {
      label = slot.count > 0 ? `Cb x${slot.count}` : 'Cabe 0';
      color = '#e63946';
    } else if (slot.id) {
      const item = INGREDIENT_BY_ID[slot.id];
      label = item.tiny;
      color = item.color;
    }
    const chipW = 44;
    chip(ctx, sx, y + 50, chipW, 20, filled[i] ? '#58b368' : color, filled[i] ? '✓' : label, 10);
    sx += chipW + 4;
  }
  // Patience bar.
  const ratio = Math.max(0, order.timeLeft / order.maxTime);
  ctx.fillStyle = '#e5dcc3';
  roundRect(ctx, x + 16, y + 80, w - 32, 12, 6);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#58b368' : ratio > 0.25 ? '#ffb347' : '#e63946';
  roundRect(ctx, x + 16, y + 80, (w - 32) * ratio, 12, 6);
  ctx.fill();
  text(ctx, order.state === 'expired' ? 'PERGI!' : order.state === 'plated' ? 'SIAP DISAJIKAN!' : `${Math.ceil(order.timeLeft)} dtk`,
    x + w - 16, y + 20, 12, order.state === 'expired' ? '#ff6b6b' : '#5a4028', 'right');
  return y + h;
}

// ---- stove, wok, flame, toss meter -----------------------------------------
function drawStove(ctx, sim) {
  const k = LAYOUT.kitchen;
  // Stove body.
  ctx.fillStyle = '#5c5c66';
  roundRect(ctx, k.x + 40, k.y + 330, k.w - 80, 130, 14);
  ctx.fill();
  ctx.fillStyle = '#3a3a42';
  roundRect(ctx, k.x + 40, k.y + 330, k.w - 80, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#d8d8e0';
  text(ctx, 'KOMPOR ARANG • WOK BESI', k.x + 62, k.y + 448, 13, '#d8d8e0');
  drawFlame(ctx, sim);
  drawWok(ctx, sim);
  drawTossMeter(ctx, sim);
  // Cook progress ring around the wok.
  const wok = LAYOUT.wok;
  const pct = cookPercent(sim.wok);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(wok.x, wok.y, wok.r + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = sim.wok.ruined ? '#e63946' : '#58b368';
  ctx.beginPath();
  ctx.arc(wok.x, wok.y, wok.r + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sim.wok.cook);
  ctx.stroke();
  text(ctx, sim.wok.ruined ? 'GOSONG!' : `${pct}% MATANG`, k.x + k.w - 52, k.y + 448, 14,
    sim.wok.ruined ? '#e63946' : '#ffffff', 'right');
  // Burn warning.
  if (sim.wok.burn > 0.35 && !sim.wok.ruined) {
    text(ctx, `AWAS HAMPIR GOSONG ${(sim.wok.burn * 100) | 0}% — kecilkan api / toss!`, wok.x, wok.y - wok.r - 52, 14, '#e63946', 'center');
  }
  // Toss flash text.
  if (sim.wok.tossFlash > 0) {
    ctx.globalAlpha = Math.min(1, sim.wok.tossFlash);
    text(ctx, sim.wok.tossText, wok.x, wok.y - wok.r - 28, 20,
      sim.wok.tossText.startsWith('PERFECT') ? '#2a9d8f' : '#5a4028', 'center');
    ctx.globalAlpha = 1;
  }
  // Steam and toss particles.
  for (const particle of sim.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFlame(ctx, sim) {
  const wok = LAYOUT.wok;
  const flame = FLAMES[sim.wok.flame];
  const flicker = Math.sin(sim.time * 13) * 4 + Math.sin(sim.time * 29) * 2;
  const baseY = wok.y + wok.r - 6;
  const heights = [58, 86, 118];
  const height = heights[sim.wok.flame] + flicker;
  for (let i = 0; i < 3; i += 1) {
    const spread = 46 - i * 12;
    ctx.fillStyle = i === 0 ? flame.color : i === 1 ? '#ffcf3f' : '#fff3b0';
    ctx.globalAlpha = 0.85 - i * 0.18;
    ctx.beginPath();
    ctx.moveTo(wok.x - spread, baseY);
    ctx.quadraticCurveTo(wok.x - spread * 0.4, baseY - height * 0.6, wok.x, baseY - height + i * 8);
    ctx.quadraticCurveTo(wok.x + spread * 0.4, baseY - height * 0.6, wok.x + spread, baseY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWok(ctx, sim) {
  const wok = LAYOUT.wok;
  const contents = sim.wok.contents;
  // Wok body: dark steel bowl with a rim and two handles.
  ctx.fillStyle = '#2f2f36';
  ctx.beginPath();
  ctx.ellipse(wok.x, wok.y, wok.r, wok.r * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#55555f';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#1c1c22';
  ctx.beginPath();
  ctx.ellipse(wok.x, wok.y - 6, wok.r - 10, (wok.r - 10) * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#55555f';
  ctx.fillRect(wok.x - wok.r - 26, wok.y - 12, 26, 10);
  ctx.fillRect(wok.x + wok.r, wok.y - 12, 26, 10);
  // The food inside: coloured blobs for each ingredient, jittered by time.
  contents.forEach((id, i) => {
    const item = INGREDIENT_BY_ID[id];
    const angle = (i / Math.max(1, contents.length)) * Math.PI * 2 + sim.time * 0.4;
    const radius = 18 + (i % 3) * 24;
    const x = wok.x + Math.cos(angle) * radius;
    const y = wok.y - 6 + Math.sin(angle) * radius * 0.4;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (item.kind === 'noodle') {
      ctx.strokeStyle = '#c98f1b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0.4, Math.PI * 1.4);
      ctx.stroke();
    }
  });
  if (contents.length === 0) {
    text(ctx, 'Wok kosong — klik bahan di bawah!', wok.x, wok.y - 2, 13, '#9a9aa5', 'center', false);
  }
}

function drawTossMeter(ctx, sim) {
  const m = LAYOUT.tossMeter;
  text(ctx, 'TOSS — tekan SPASI / klik wok saat jarum di hijau!', m.x + m.w / 2, m.y - 8, 13, '#2b2118', 'center');
  ctx.fillStyle = '#2b2118';
  roundRect(ctx, m.x, m.y, m.w, m.h, 8);
  ctx.fill();
  // Good zone (amber) and perfect zone (green).
  const centre = m.x + m.w / 2;
  const half = m.w / 2;
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(centre - half * 0.34, m.y + 3, half * 0.68, m.h - 6);
  ctx.fillStyle = '#58b368';
  ctx.fillRect(centre - half * 0.16, m.y + 3, half * 0.32, m.h - 6);
  // The needle.
  const nx = centre + sim.wok.needle * half;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(nx - 2, m.y - 2, 4, m.h + 4);
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(nx, m.y + m.h + 8);
  ctx.lineTo(nx - 6, m.y + m.h + 16);
  ctx.lineTo(nx + 6, m.y + m.h + 16);
  ctx.closePath();
  ctx.fill();
}

// ---- serving counter -------------------------------------------------------
function drawServeCounter(ctx, sim) {
  const s = LAYOUT.serve;
  ctx.fillStyle = '#3d2b1f';
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = '#5a4028';
  roundRect(ctx, s.x + 6, s.y + 6, s.w - 12, 34, 8);
  ctx.fill();
  text(ctx, 'MEJA SAJI', s.x + s.w / 2, s.y + 29, 16, '#ffd166', 'center');
  text(ctx, 'Klik mangkok untuk mengantar', s.x + s.w / 2, s.y + 58, 11, '#d8c9a8', 'center', false);
  // Plated bowls.
  if (sim.plates.length === 0) {
    text(ctx, 'Belum ada hidangan...', s.x + s.w / 2, s.y + 130, 13, '#d8c9a8', 'center', false);
    text(ctx, 'Masak sampai 100%, lalu TUANG.', s.x + s.w / 2, s.y + 154, 12, '#a98f6a', 'center', false);
  }
  sim.plates.forEach((plate, i) => {
    const px = s.x + 70 + (i % 2) * 140;
    const py = s.y + 120 + Math.floor(i / 2) * 110;
    drawNoodleBowl(ctx, px, py, 52, plate.contents.map((id) => INGREDIENT_BY_ID[id].color));
    const order = sim.orders.find((o) => o.id === plate.orderId);
    text(ctx, order ? order.customer : '', px, py + 44, 12, '#fdf6e3', 'center');
    text(ctx, plate.matched ? '✓ Racikan pas' : 'Racikan kurang', px, py + 62, 11,
      plate.matched ? '#7CFC9A' : '#ffd166', 'center', false);
  });
  // Action buttons.
  const plateBtn = LAYOUT.plateButton;
  const ready = sim.wok.cook >= 1 && !sim.wok.ruined && sim.wok.contents.length > 0 && sim.selectedOrderId !== null;
  ctx.fillStyle = ready ? '#2a9d8f' : '#6b5a48';
  roundRect(ctx, plateBtn.x, plateBtn.y, plateBtn.w, plateBtn.h, 10);
  ctx.fill();
  text(ctx, 'TUANG', plateBtn.x + plateBtn.w / 2, plateBtn.y + 35, 17, '#ffffff', 'center');
  const clearBtn = LAYOUT.clearButton;
  ctx.fillStyle = '#8d2f2f';
  roundRect(ctx, clearBtn.x, clearBtn.y, clearBtn.w, clearBtn.h, 10);
  ctx.fill();
  text(ctx, 'BUANG (B)', clearBtn.x + clearBtn.w / 2, clearBtn.y + 35, 15, '#ffffff', 'center');
  // Flame buttons.
  text(ctx, 'API KOMPOR (F untuk ganti)', s.x + 16, 456, 12, '#d8c9a8');
  for (const button of LAYOUT.flameButtons) {
    const active = sim.wok.flame === button.flame;
    ctx.fillStyle = active ? FLAMES[button.flame].color : '#5a4028';
    roundRect(ctx, button.x, button.y - 4, button.w, button.h - 4, 10);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      roundRect(ctx, button.x, button.y - 4, button.w, button.h - 4, 10);
      ctx.stroke();
    }
    text(ctx, button.label, button.x + button.w / 2, button.y + 28, 12, '#ffffff', 'center');
  }
  // Stats.
  text(ctx, `Disajikan: ${sim.served}   Koin: ${sim.coins}   Combo terbaik: x${sim.bestCombo}`,
    s.x + s.w / 2, 534, 12, '#d8c9a8', 'center', false);
}

// ---- ingredient counter ----------------------------------------------------
function drawIngredientCounter(ctx, sim, ui) {
  const c = LAYOUT.counter;
  text(ctx, 'BAHAN DI COUNTER — klik atau tekan tombol keyboard', 24, c.y + 22, 14, '#fdf6e3');
  text(ctx, 'SPASI = toss  •  F = ganti api  •  B = buang isi wok  •  R = mulai ulang  •  M = suara',
    1264, c.y + 22, 12, '#f7e8c9', 'right', false);
  const binW = 100;
  const gap = 4;
  INGREDIENTS.forEach((item, i) => {
    const x = 16 + i * (binW + gap);
    const y = c.y + 32;
    const h = 118;
    const hovered = ui.hoverBin === item.id;
    ctx.fillStyle = hovered ? '#fff3d6' : '#fdf6e3';
    roundRect(ctx, x, y, binW, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#d8c9a8';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Drawn ingredient: a coloured mound with a label, no emoji needed.
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x + binW / 2, y + 34, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();
    if (item.kind === 'noodle') {
      ctx.strokeStyle = '#8a6d1b';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.arc(x + binW / 2, y + 34, 8 + k * 5, 0.5, Math.PI * 1.5);
        ctx.stroke();
      }
    } else if (item.kind === 'spice') {
      ctx.fillStyle = '#2a9d8f';
      ctx.fillRect(x + binW / 2 - 2, y + 8, 4, 10);
    }
    text(ctx, item.name, x + binW / 2, y + 78, 12, '#2b2118', 'center');
    text(ctx, `Rp${item.price}k`, x + binW / 2, y + 96, 11, '#8a6d1b', 'center', false);
    // Keyboard key badge.
    ctx.fillStyle = '#2b2118';
    roundRect(ctx, x + binW / 2 - 11, y + 100, 22, 14, 4);
    ctx.fill();
    text(ctx, item.key.toUpperCase(), x + binW / 2, y + 111, 10, '#ffd166', 'center');
  });
}

// ---- floating score text ---------------------------------------------------
function drawFloaters(ctx, sim) {
  for (const floater of sim.floaters) {
    ctx.globalAlpha = Math.min(1, floater.life);
    text(ctx, floater.text, floater.x, floater.y, 18, floater.color, 'center');
  }
  ctx.globalAlpha = 1;
}

// ---- title and game over ---------------------------------------------------
function drawTitle(ctx, sim) {
  ctx.fillStyle = 'rgba(43,33,24,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'WOK ON FIRE', 640, 170, 72, '#ffb347', 'center');
  text(ctx, '— Noodle Wok Rush —', 640, 212, 24, '#ffd166', 'center', false);
  text(ctx, 'Warung mie paling sibuk di kota. Pesanan datang, wajan panas,', 640, 268, 18, '#fdf6e3', 'center', false);
  text(ctx, 'pelanggan lapar. Masak cepat, toss tepat, sajikan sebelum mereka pergi!', 640, 294, 18, '#fdf6e3', 'center', false);
  // How to play, three steps.
  const steps = [
    ['1. KLIK TIKET', 'Pilih pesanan di order board'],
    ['2. KLIK BAHAN', 'Lempar bahan yang cocok ke wok'],
    ['3. SPASI = TOSS', 'Toss saat jarum di hijau, atur api, TUANG, antar!'],
  ];
  steps.forEach((step, i) => {
    const x = 280 + i * 260;
    ctx.fillStyle = '#fdf6e3';
    roundRect(ctx, x, 330, 240, 86, 12);
    ctx.fill();
    text(ctx, step[0], x + 120, 362, 15, '#e63946', 'center');
    text(ctx, step[1], x + 120, 388, 12, '#5a4028', 'center', false);
  });
  const blink = Math.sin(sim.time * 4) > -0.2;
  if (blink) text(ctx, 'KLIK DI MANA SAJA / TEKAN ENTER UNTUK MULAI', 640, 480, 20, '#ffffff', 'center');
  text(ctx, 'Satu shift: 180 detik • 3 pelanggan pergi = shift berakhir', 640, 520, 14, '#d8c9a8', 'center', false);
  drawNoodleBowl(ctx, 640, 600, 70, ['#f2c94c', '#e8a04c', '#58b368']);
}

function drawGameOver(ctx, sim) {
  ctx.fillStyle = 'rgba(43,33,24,0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'SHIFT SELESAI!', 640, 180, 56, '#ffb347', 'center');
  text(ctx, sim.strikes >= 3 ? 'Tiga pelanggan pergi dengan lapar...' : 'Wajan sudah dingin. Warung tutup!',
    640, 228, 18, '#fdf6e3', 'center', false);
  const rows = [
    ['Skor akhir', `${sim.score}`],
    ['Hidangan disajikan', `${sim.served}`],
    ['Combo terbaik', `x${sim.bestCombo}`],
    ['Koin didapat', `${sim.coins}`],
    ['Level tercapai', `${sim.level}`],
  ];
  rows.forEach((row, i) => {
    const y = 290 + i * 36;
    text(ctx, row[0], 480, y, 18, '#d8c9a8');
    text(ctx, row[1], 800, y, 18, '#ffd166', 'right');
  });
  const blink = Math.sin(sim.time * 4) > -0.2;
  if (blink) text(ctx, 'TEKAN R UNTUK MASAK LAGI', 640, 520, 20, '#ffffff', 'center');
}
