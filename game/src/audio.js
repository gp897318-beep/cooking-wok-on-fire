// Wok On Fire — sound: every effect is synthesized live with WebAudio, so the
// game ships no audio files at all. A short noise burst is a sizzle, a sine blip
// is a ding, a filtered sweep is a toss whoosh.

let audioContext = null;
let muted = false;
let sizzleNodes = null;

/** Create (or resume) the audio context on the first user gesture. */
export function ensureAudio() {
  if (!audioContext) {
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctor();
    } catch {
      audioContext = null;
    }
  }
  if (audioContext && audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopSizzle();
  return muted;
}

function tone(frequency, duration, type, gainValue, slideTo) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function noiseBurst(duration, gainValue, filterFrequency) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

/** A single ingredient landing in the wok: a soft thock. */
export function playDrop() {
  tone(220, 0.09, 'triangle', 0.18, 140);
  noiseBurst(0.05, 0.08, 900);
}

/** A perfect toss: a bright two-note chime. */
export function playTossPerfect() {
  tone(660, 0.12, 'sine', 0.2);
  setTimeout(() => tone(990, 0.18, 'sine', 0.2), 70);
}

/** A good toss: one warm note. */
export function playTossGood() {
  tone(520, 0.12, 'sine', 0.16);
}

/** A missed toss: a dull buzz. */
export function playTossMiss() {
  tone(140, 0.18, 'sawtooth', 0.1, 90);
}

/** The order bell: a new ticket just arrived. */
export function playOrderBell() {
  tone(880, 0.15, 'sine', 0.18);
  setTimeout(() => tone(1174, 0.22, 'sine', 0.18), 120);
}

/** A dish served: coins and a happy ding. */
export function playServe() {
  tone(784, 0.1, 'sine', 0.2);
  setTimeout(() => tone(1046, 0.14, 'sine', 0.2), 80);
  setTimeout(() => tone(1318, 0.22, 'sine', 0.2), 160);
}

/** Something burned: a low sad buzz. */
export function playBurn() {
  tone(110, 0.4, 'sawtooth', 0.14, 70);
}

/** The end-of-shift whistle. */
export function playShiftEnd() {
  tone(523, 0.2, 'sine', 0.2);
  setTimeout(() => tone(392, 0.2, 'sine', 0.2), 180);
  setTimeout(() => tone(523, 0.35, 'sine', 0.2), 360);
}

/** The wok's continuous sizzle while food cooks, tied to the flame level. */
export function startSizzle(flameLevel) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx || sizzleNodes) return;
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2500;
  const gain = ctx.createGain();
  gain.gain.value = 0.02 + flameLevel * 0.015;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
  sizzleNodes = { source, gain };
}

export function setSizzleLevel(flameLevel, cooking) {
  if (!sizzleNodes) return;
  const target = cooking ? 0.02 + flameLevel * 0.015 : 0;
  sizzleNodes.gain.gain.setTargetAtTime(target, audioContext.currentTime, 0.1);
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try {
    sizzleNodes.source.stop();
  } catch {
    // Already stopped.
  }
  sizzleNodes = null;
}
