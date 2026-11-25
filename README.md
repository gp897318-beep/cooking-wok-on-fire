[![Make.fun competition](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/gp897318-beep/cooking-wok-on-fire/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/gp897318-beep/cooking-wok-on-fire/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

# Wok On Fire — Noodle Wok Rush

A complete, original 2D cooking game for the [Make the best cooking game](https://make.fun/c/best-cooking-game-20261125-0137) competition on make.fun. You run the busiest noodle stall in town: tickets land on the order board, you toss ingredients into a steel wok over a live flame, time your tosses on the green, mind the burn, plate the dish and serve it before the customer walks away.

## How to play

- **Click a ticket** on the order board to cook that order.
- **Click ingredients** on the counter (or press `1`–`0`, `Q`, `W`) to throw them into the wok. Each ticket shows its recipe: noodle, protein, vegetable, sauce and chilli level.
- **Press Space (or click the wok)** to toss when the needle is in the green — a perfect toss cooks faster and cools the burn.
- **F** cycles the flame (low / medium / high). High flame cooks fast but burns fast.
- **TUANG** (or Enter) plates a finished dish; **click the bowl** on the serving counter to serve it.
- **B** empties the wok. **R** restarts after a shift ends. **M** mutes. One shift lasts 180 seconds; three customers walking away ends it.

## What is in the game

- 8 original recipes across 5 levels: timers shorten, orders arrive faster and the menu grows.
- A real cooking loop: recipe matching, toss timing, flame management, burn risk, combo scoring.
- Synthesized WebAudio sounds (sizzle, toss chimes, order bell, serve ding) — no audio files.
- Title screen, live HUD (score, combo, level, day timer, strikes), game-over tally and restart.
- Deterministic screenshot scenes via `?shot=start|play|rush|end` (see `game/src/shots.js`).

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome. Locally:

```sh
node serve.ts   # then open http://localhost:8080
```

No network request is made: every script is a local file, every sound is synthesized.

## Layout

- `game/index.html` — the page, one canvas.
- `game/src/config.js` — recipes, customers, levels, tuning.
- `game/src/orders.js` — the order board: tickets, matching, serving, scoring.
- `game/src/wok.js` — the wok: flame, toss timing, cooking, burning, plating.
- `game/src/sim.js` — the simulation: one state object, one fixed step, the autopilot.
- `game/src/audio.js` — synthesized WebAudio effects.
- `game/src/render.js` — all canvas drawing: kitchen, board, stove, counter.
- `game/src/input.js` — mouse and keyboard, turned into actions.
- `game/src/shots.js` — deterministic screenshot staging.
- `game/src/main.js` — the frame loop and screenshot mode.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — real renders of the game in a browser (cover first).

## License

MIT — see `LICENSE`.
