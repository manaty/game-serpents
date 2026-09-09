# Serpents · Endless gardens 1.1.0 — acceptance evidence

Version 1.1.0 reduces phone traffic using a 128-unit spatial grid, the actual phone viewport plus 200-unit margin, and 128-unit cell hysteresis. Both wrapped seams are covered; offscreen heads do not hide a visible part of their body. Stable food and path-point IDs support acknowledged per-client JSON deltas in SDK 1.10. Reconnects and baseline mismatch receive a full state. Old clients still receive full snapshots. Input, physics and send cadence are unchanged.

Five additional interest tests cover viewport coverage at both seams, distant head/visible body, removals, hysteresis, death/reset, stable IDs and migration from older saves, bounded viewport input and distinct phone/display snapshots. SDK 1.10 adds four protocol tests, including real sockets with distinct private views, legacy clients and resynchronisation.

The deterministic network benchmark uses eight humans, four bots, 20 seconds, 870×1600 logical phone viewports and one forced reconnect per client. Every decoded frame is compared to its complete authoritative state; every physical trajectory, score and death is compared to game 1.0.2. Mean phone JSON payload: 25,570 → 2,837 bytes (9.01× smaller). Display: 8,866 → 1,757 bytes (5.05× smaller). These are application payload measurements, not actual Wi-Fi latency or transport overhead. JSON encoding averaged 1–3 ms per frame on the development PC, varying with concurrent browser tests. See [the recorded results](network-bandwidth.json). Run `npm run benchmark:network` with git history containing commit `69bc7bd` (fetch full history first if needed).

Version 1.0.2 makes own-body collisions lethal using the same spatial index and radius as other body hits. The head and its first two neck samples are excluded; ordinary movement and turns remain safe. Dedicated tests cover own-body hits on both wrapped seams, with and without boost, a single crash event, and safe straight/turning motion. Automatic opponents also avoid their own trailing bodies. The existing respawn protection applies as before. Rules are updated in English, French and Tagalog.

Version 1.0.1 adds a larger portrait overview and a perspective drone camera following the largest living serpent. Camera tests cover the entire torus at varied heights/headings, the inner hole, wrapped crossings, a changing leader, interpolated camera paths and near-plane clipping. EN/FR/TL phone/display layout and camera-target checks were rerun and the resulting screenshots inspected. Game rules are unchanged; display snapshots now include a bounded, sampled body for the leader only. The CI workflow also repeats engine and host integration checks.

Automated tests were run by the implementing agent, not an independent human reviewer.

Phone rendering now interpolates head, body and heading between received snapshots, using wrapped coordinates and a short adaptive jitter buffer. Prediction is capped at 100 ms during a missing packet; deaths, respawns and pauses reset motion. Four motion tests check 60 visual samples from 10 network snapshots per second, immutable inputs, seam/angle interpolation, bounded prediction/reset behavior and local head turn-rate limits while a target slides. This does not change the network send cadence. Phone animation uses the device animation clock (up to 60 fps), while the heavier display remains capped around 30 fps.

A third browser suite switches between joystick and touch steering in the sandboxed frame, drags one pointer from right to up to left, holds boost with a second pointer, cancels/releases both, checks the language change retains the selected mode and returns to joystick. It checks actual outgoing game actions and rejects browser errors. Durable preference storage across a page reload depends on the embedding host allowing session storage; the current sandbox preserves the selected mode within the open game frame.

## Engine

The engine tests exercise authorized/invalid input, roster bounds, steering, simultaneous collisions, energy/length costs, expiry and release, scoring and ties, complete minimum- and maximum-player matches, saved-game restoration and the compiled QuickJS sandbox. Additional tests cross both toroidal seams, collect food and collide across seams, test respawn immunity, exclude bots from the human podium and run twelve serpents. State sent to the display omits world food and nonleader bodies; phones receive details in their camera region. Simulation uses 20 Hz physics and spatial collision indices.

## Browser and host

Two Playwright suites test eight-player EN/FR/TL layouts at 360×540 for phone and 1280×740 for display; audio preference messages, results and replay visibility; then a real SDK HTTP/WebSocket host with eight isolated phone browser contexts, joystick steering, simultaneous boost, release, pause/resume, a disconnected phone, finish, phone replay, a late spectator and admission on replay. Unique and tied result paths use saved-state score/deadline fixtures before resuming the real engine and host. The browser test shortens a saved timer for completion; engine tests independently simulate full-duration matches.

Screenshots with named players are fixtures. The phone layout asserts that the controls overlay the game camera. Torus and camera screenshots are inspected visually.

## Limits

Headless Edge/Chromium testing does not replace physical eight-phone Wi-Fi testing or an old smart-TV trial. Sound control/preference checks do not constitute a human listening test. Tagalog is supplied and rendered but has not received independent native-speaker review. No browser autoplay capability is assumed. Marketplace acceptance evidence is authenticated and pinned to the exact source commit and package hash; repository prose cannot grant publication approval.
