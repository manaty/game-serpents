# Serpents · Endless gardens 1.0.1 — acceptance evidence

Version 1.0.1 changes only the display overview and package artwork: a larger portrait rectangle, with the major circumference vertical and proportions derived from the rendered torus radii. EN/FR/TL phone/display layout and camera-target checks were rerun and the resulting display screenshot inspected. The gameplay engine is unchanged from 1.0.0; the CI workflow also repeats engine and host integration checks.

Automated tests were run by the implementing agent, not an independent human reviewer.

## Engine

The engine tests exercise authorized/invalid input, roster bounds, steering, simultaneous collisions, energy/length costs, expiry and release, scoring and ties, complete minimum- and maximum-player matches, saved-game restoration and the compiled QuickJS sandbox. Additional tests cross both toroidal seams, collect food and collide across seams, test respawn immunity, exclude bots from the human podium and run twelve serpents. State sent to the display omits world food and bodies; phones receive details in their camera region. Simulation uses 20 Hz physics and spatial collision indices.

## Browser and host

Two Playwright suites test eight-player EN/FR/TL layouts at 360×540 for phone and 1280×740 for display; audio preference messages, results and replay visibility; then a real SDK HTTP/WebSocket host with eight isolated phone browser contexts, joystick steering, simultaneous boost, release, pause/resume, a disconnected phone, finish, phone replay, a late spectator and admission on replay. Unique and tied result paths use saved-state score/deadline fixtures before resuming the real engine and host. The browser test shortens a saved timer for completion; engine tests independently simulate full-duration matches.

Screenshots with named players are fixtures. The phone layout asserts that the controls overlay the game camera. Torus and camera screenshots are inspected visually.

## Limits

Headless Edge/Chromium testing does not replace physical eight-phone Wi-Fi testing or an old smart-TV trial. Sound control/preference checks do not constitute a human listening test. Tagalog is supplied and rendered but has not received independent native-speaker review. No browser autoplay capability is assumed. Marketplace acceptance evidence is authenticated and pinned to the exact source commit and package hash; repository prose cannot grant publication approval.
