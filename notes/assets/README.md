# Interactive dynamics notes

The 11 figures live directly in `../quadrotor-dynamics.html`, next to the theory they explain. The previous standalone preview redirects to the notes.

- `quadrotor-body.js`: shared, detailed X-layout aircraft in body NED coordinates: stacked control boards, vents, screws, amber nose, four diagonal arms with front trims, motor flanges, ribbed housings, caps, shafts and propellers.
- `quadrotor-scene.js` / `quadrotor-rig.js`: the attitude and motor-allocation pilot (Fig 11).
- `dynamics-instruments.js`: shared machined reference plate (rim, 48 scale ticks, feet, corner fasteners, label plate, vents), calibrated rings with bearing housings, and measuring rods with terminal joints and scale collars.
- `dynamics-model.js`: passive coordinate rotations, active axis-angle rotation, and the transport-theorem terms.
- `dynamics-demos.js`: Figs 1–10, native controls, time-based parameter following, keyboard/pointer camera controls, per-figure active time, offscreen/hidden cancellation and reduced-motion handling.
- `dynamics-demos.css`: the light inline card layout with reading task, model/legend, presets/controls and synchronized results; one column below 680px.

The mesh basis uses the rows of the passive rotation matrix as columns of the active body transform. The enclosing world group maps NED `(x,y,z)` to renderer coordinates `(x,-z,y)`. The Euler gimbal uses positive active `ZYX` rotations, matching that transform. Colour indicates the current angle channel and magnitude; the five aircraft coordinate figures use illustrative rotor motion, not motor dynamics. Fig 11 separately explains the bounded attitude response to motor allocation.

Transport growth uses the displayed observation interval 0–5 s and pauses at the endpoint. No vector is silently clamped. Camera distance adapts to vector magnitude; zero vectors hide their geometric arrows, and a zero projection axis is explicitly described as undefined.

Verification: `node scripts/check-dynamics-model.mjs` checks signed attitudes against the independent Three.js Euler implementation and Fig 11 model, rotation-chain composition, quaternion/Rodrigues agreement, and the transport derivative by centered finite differences. Browser verification covers all ten figures, key presets, gimbal lock, zero vectors, replay/reset, the existing pilot, desktop and 390px layouts.

The presentation follows Anatomy’s physical-object and motion principles using the website’s existing local Three.js r160 runtime. No external render library or hosting service is required.
