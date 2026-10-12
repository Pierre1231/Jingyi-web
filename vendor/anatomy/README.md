Selected drawing and build-time audit files from Anatomy by Ryan (wheresryan22).

Source: https://github.com/wheresryan22/anatomy
Pinned commit: 689dcf966e63d92be10a5d593c6e19e10acd4422
License: MIT (see LICENSE).

`iso-kit.mjs` and `iso.css` render the quadrotor Figure. The other modules support
the build-time geometry audit; they are not loaded by the page.

Rebuild the inline static SVG fallback with:

    node scripts/build-quadrotor-rig.mjs --audit
