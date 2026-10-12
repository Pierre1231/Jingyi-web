// Swarm hero — a small boids simulation with cursor repulsion and click-to-converge.
// Reduced motion: renders one static scatter. Pauses when offscreen or tab hidden.
(function () {
  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const hero = canvas.closest('.hero') || canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0, raf = null, running = false;
  const boids = [];

  function resize() {
    const previousW = W, previousH = H;
    W = hero.clientWidth;
    H = hero.clientHeight;
    if (previousW && previousH) {
      boids.forEach((b) => {
        b.x = b.x / previousW * W;
        b.y = b.y / previousH * H;
      });
    }
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, W, H);
    if (reduced) boids.forEach(drawBoid);
  }
  resize();
  window.addEventListener('resize', resize);

  const isMobile = matchMedia('(max-width: 700px)').matches;
  const N = isMobile ? 34 : 72;
  for (let i = 0; i < N; i++) {
    boids.push({
      x: Math.random() * (W || 1200),
      y: Math.random() * (H || 700),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }

  const mouse = { x: -9999, y: -9999 };
  let attractor = null, attractUntil = 0;

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const r = hero.getBoundingClientRect();
    attractor = { x: e.clientX - r.left, y: e.clientY - r.top };
    attractUntil = performance.now() + 3500;
    const rip = document.createElement('div');
    rip.className = 'ripple';
    rip.style.left = attractor.x + 'px';
    rip.style.top = attractor.y + 'px';
    hero.appendChild(rip);
    setTimeout(() => rip.remove(), 750);
  });

  function drawBoid(b) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(168, 199, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(5.5, 0);
    ctx.lineTo(-3.5, 2.7);
    ctx.lineTo(-3.5, -2.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.fillStyle = 'rgba(7, 9, 13, 0.16)';
    ctx.fillRect(0, 0, W, H);
    const now = performance.now();
    if (attractor && now > attractUntil) attractor = null;

    for (const b of boids) {
      let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, cnt = 0;
      for (const o of boids) {
        if (o === b) continue;
        const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 3600) {
          cnt++; cx += o.x; cy += o.y; ax += o.vx; ay += o.vy;
          if (d2 < 900) { const d = Math.sqrt(d2) || 1; sx -= dx / d; sy -= dy / d; }
        }
      }
      let fx = 0, fy = 0;
      if (cnt) {
        fx += (ax / cnt - b.vx) * 0.06 + (cx / cnt - b.x) * 0.004 + sx * 0.12;
        fy += (ay / cnt - b.vy) * 0.06 + (cy / cnt - b.y) * 0.004 + sy * 0.12;
      }
      const mdx = b.x - mouse.x, mdy = b.y - mouse.y, md2 = mdx * mdx + mdy * mdy;
      if (md2 < 14400) {
        const d = Math.sqrt(md2) || 1, f = (120 - d) / 120 * 0.9;
        fx += mdx / d * f;
        fy += mdy / d * f;
      }
      if (attractor) {
        const adx = attractor.x - b.x, ady = attractor.y - b.y, ad = Math.hypot(adx, ady) || 1;
        if (ad > 26) { fx += adx / ad * 0.38; fy += ady / ad * 0.38; }
      }
      b.vx += fx; b.vy += fy;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      if (sp > 2.1) { b.vx = b.vx / sp * 2.1; b.vy = b.vy / sp * 2.1; }
      else if (sp < 0.8) { b.vx = b.vx / sp * 0.8; b.vy = b.vy / sp * 0.8; }
      b.x += b.vx; b.y += b.vy;
      if (b.x < -20) b.x = W + 20; if (b.x > W + 20) b.x = -20;
      if (b.y < -20) b.y = H + 20; if (b.y > H + 20) b.y = -20;
      drawBoid(b);
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  function start() { if (!running && !reduced) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf !== null) cancelAnimationFrame(raf); raf = null; }

  if (reduced) {
    boids.forEach(drawBoid);
  } else {
    let inView = false;
    const updateAnimation = () => (inView && !document.hidden ? start() : stop());
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { inView = entry.isIntersecting; });
        updateAnimation();
      }, { threshold: 0.05 }).observe(hero);
    } else {
      inView = true;
      updateAnimation();
    }
    document.addEventListener('visibilitychange', updateAnimation);
  }
})();
