(() => {
  'use strict';

  const nav = document.querySelector('.gallery-nav');
  if (!nav) return;
  const control = nav.querySelector('.gallery-nav-control');
  const lens = control.querySelector('.gallery-nav-lens');
  const hoverLens = control.querySelector('.gallery-nav-hover');
  const links = Array.from(control.querySelectorAll('a[href^="#"]'));
  const sections = links.map((link) => document.getElementById(link.hash.slice(1)));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let activeId = '';
  let pendingId = '';
  let pendingTimer = 0;
  let scrollFrame = 0;
  let springFrame = 0;
  let previousTime = 0;
  let state = null;
  let target = null;
  let bounds = null;
  let hoveredLink = null;
  let hoverState = null;
  let hoverTarget = null;
  let hoverBounds = null;
  let hoverFrame = 0;
  let hoverPreviousTime = 0;
  let hoverExitTime = -Infinity;

  function paintLens() {
    // The material stretches slightly with velocity; label geometry stays fixed.
    const stretch = motion.matches ? 0 : Math.min(Math.abs(state.vx) * 0.006, 6);
    const left = Math.max(bounds.left, state.x - stretch / 2);
    const right = Math.min(bounds.right, state.x + state.width + stretch / 2);
    lens.style.transform = `translate3d(${left.toFixed(3)}px, 0, 0)`;
    lens.style.width = `${Math.max(0, right - left).toFixed(3)}px`;
  }

  function snapLens() {
    cancelAnimationFrame(springFrame);
    springFrame = 0;
    previousTime = 0;
    state = { ...target, vx: 0, vw: 0 };
    paintLens();
  }

  function animateLens(time) {
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 1 / 30) : 1 / 60;
    previousTime = time;
    const stiffness = 360;
    const damping = 34;
    state.vx += ((target.x - state.x) * stiffness - state.vx * damping) * dt;
    state.vw += ((target.width - state.width) * stiffness - state.vw * damping) * dt;
    state.x += state.vx * dt;
    state.width += state.vw * dt;
    paintLens();
    if (Math.abs(target.x - state.x) < 0.1 && Math.abs(target.width - state.width) < 0.1 &&
        Math.abs(state.vx) < 1 && Math.abs(state.vw) < 1) {
      snapLens();
      return;
    }
    springFrame = requestAnimationFrame(animateLens);
  }

  function positionLens(immediate = false) {
    const link = links.find((item) => item.hash === '#' + activeId);
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const container = control.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(control).paddingLeft);
    target = { x: rect.left - container.left, width: rect.width };
    bounds = { left: inset, right: container.width - inset };
    lens.style.top = `${rect.top - container.top}px`;
    lens.style.height = `${rect.height}px`;
    if (!state || immediate || motion.matches) {
      snapLens();
    } else if (!springFrame) {
      previousTime = 0;
      springFrame = requestAnimationFrame(animateLens);
    }
    control.classList.add('is-ready');
  }

  function paintHover() {
    const stretch = motion.matches ? 0 : Math.min(Math.abs(hoverState.vx) * 0.008, 8);
    const left = Math.max(hoverBounds.left, hoverState.x - stretch / 2);
    const right = Math.min(hoverBounds.right, hoverState.x + hoverState.width + stretch / 2);
    hoverLens.style.transform = `translate3d(${left.toFixed(3)}px, 0, 0)`;
    hoverLens.style.width = `${Math.max(0, right - left).toFixed(3)}px`;
  }

  function snapHover() {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverPreviousTime = 0;
    hoverState = { ...hoverTarget, vx: 0, vw: 0 };
    paintHover();
  }

  function animateHover(time) {
    const dt = hoverPreviousTime ? Math.min((time - hoverPreviousTime) / 1000, 1 / 30) : 1 / 60;
    hoverPreviousTime = time;
    const stiffness = 540;
    const damping = 44;
    hoverState.vx += ((hoverTarget.x - hoverState.x) * stiffness - hoverState.vx * damping) * dt;
    hoverState.vw += ((hoverTarget.width - hoverState.width) * stiffness - hoverState.vw * damping) * dt;
    hoverState.x += hoverState.vx * dt;
    hoverState.width += hoverState.vw * dt;
    paintHover();
    if (Math.abs(hoverTarget.x - hoverState.x) < 0.1 &&
        Math.abs(hoverTarget.width - hoverState.width) < 0.1 &&
        Math.abs(hoverState.vx) < 1 && Math.abs(hoverState.vw) < 1) {
      snapHover();
      return;
    }
    hoverFrame = requestAnimationFrame(animateHover);
  }

  function positionHover(link, immediate = false) {
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const container = control.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(control).paddingLeft);
    hoverTarget = { x: rect.left - container.left, width: rect.width };
    hoverBounds = { left: inset, right: container.width - inset };
    hoverLens.style.top = `${rect.top - container.top}px`;
    hoverLens.style.height = `${rect.height}px`;
    if (!hoverState || immediate || motion.matches) {
      snapHover();
    } else if (!hoverFrame) {
      hoverPreviousTime = 0;
      hoverFrame = requestAnimationFrame(animateHover);
    }
  }

  function setHoveredLink(link) {
    if (link === hoveredLink) return;
    if (!control.classList.contains('is-hovering') && performance.now() - hoverExitTime > 190) {
      hoverState = null;
    }
    hoveredLink = link;
    links.forEach((item) => item.classList.toggle('is-hovered', item === link));
    positionHover(link);
    control.classList.add('is-hovering');
  }

  function clearHover() {
    hoveredLink = null;
    links.forEach((link) => link.classList.remove('is-hovered'));
    control.classList.remove('is-hovering');
    hoverExitTime = performance.now();
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverPreviousTime = 0;
  }

  function selectCategory(id) {
    if (id === activeId) return;
    activeId = id;
    links.forEach((link) => {
      const active = link.hash === '#' + id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    positionLens();
  }

  function updateFromScroll() {
    scrollFrame = 0;
    if (pendingId) return;
    const marker = nav.getBoundingClientRect().bottom + Math.min(200, window.innerHeight * 0.2);
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= marker) current = section;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1];
    }
    selectCategory(current.id);
  }

  function scheduleScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFromScroll);
  }

  function releasePendingSelection() {
    clearTimeout(pendingTimer);
    pendingId = '';
    scheduleScrollUpdate();
  }

  function finishAnchorScroll() {
    if (pendingId) {
      const section = sections.find((item) => item.id === pendingId);
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const destination = Math.max(0, Math.min(maximum,
        section.getBoundingClientRect().top + window.scrollY - padding - margin));
      const arrived = Math.abs(window.scrollY - destination) < 3;
      // A previous scroll can finish just after the user clicks a new destination.
      if (!arrived) return;
    }
    releasePendingSelection();
  }

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      pendingId = link.hash.slice(1);
      selectCategory(pendingId);
      clearTimeout(pendingTimer);
      // Keep native anchor navigation, focus and history. Ignore intermediate sections.
      // The timeout also covers browsers without scrollend and clicks already at the target.
      pendingTimer = setTimeout(releasePendingSelection, 1800);
    });
  });

  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('scrollend', finishAnchorScroll);
  ['wheel', 'touchstart', 'pointerdown'].forEach((type) => {
    window.addEventListener(type, releasePendingSelection, { passive: true });
  });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Escape', ' '].includes(event.key)) {
      releasePendingSelection();
    }
  });
  window.addEventListener('hashchange', () => {
    if (pendingId !== location.hash.slice(1)) releasePendingSelection();
    scheduleScrollUpdate();
  });
  window.addEventListener('resize', () => {
    positionLens(true);
    positionHover(hoveredLink, true);
    scheduleScrollUpdate();
  });
  window.addEventListener('load', scheduleScrollUpdate);
  motion.addEventListener('change', () => {
    if (target) snapLens();
    if (hoverTarget && hoveredLink) snapHover();
    if (motion.matches) {
      cancelAnimationFrame(lightFrame);
      lightFrame = 0;
      lightPosition = lightTarget;
      lightVelocity = 0;
      control.style.setProperty('--glass-light-x', `${lightPosition.toFixed(1)}%`);
    }
  });

  // Subpixel measurements keep the rim aligned after font loading and responsive layout.
  const observer = new ResizeObserver(() => {
    positionLens(true);
    positionHover(hoveredLink, true);
  });
  observer.observe(control);
  document.fonts.ready.then(() => {
    positionLens(true);
    positionHover(hoveredLink, true);
  });

  let lightFrame = 0;
  let lightPreviousTime = 0;
  let lightPosition = 35;
  let lightTarget = 35;
  let lightVelocity = 0;

  function animateLight(time) {
    const dt = lightPreviousTime ? Math.min((time - lightPreviousTime) / 1000, 1 / 30) : 1 / 60;
    lightPreviousTime = time;
    lightVelocity += ((lightTarget - lightPosition) * 420 - lightVelocity * 38) * dt;
    lightPosition += lightVelocity * dt;
    control.style.setProperty('--glass-light-x', `${lightPosition.toFixed(2)}%`);
    if (Math.abs(lightTarget - lightPosition) < 0.1 && Math.abs(lightVelocity) < 1) {
      lightPosition = lightTarget;
      lightVelocity = 0;
      control.style.setProperty('--glass-light-x', `${lightPosition.toFixed(1)}%`);
      lightFrame = 0;
      lightPreviousTime = 0;
      return;
    }
    lightFrame = requestAnimationFrame(animateLight);
  }

  function moveLightTo(x) {
    lightTarget = Math.max(0, Math.min(100, x));
    if (motion.matches) {
      lightPosition = lightTarget;
      lightVelocity = 0;
      control.style.setProperty('--glass-light-x', `${lightPosition.toFixed(1)}%`);
    } else if (!lightFrame) {
      lightPreviousTime = 0;
      lightFrame = requestAnimationFrame(animateLight);
    }
  }

  control.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const link = event.target.closest('a[href^="#"]');
    if (link && control.contains(link)) setHoveredLink(link);
    const rect = control.getBoundingClientRect();
    moveLightTo((event.clientX - rect.left) / rect.width * 100);
  });
  control.addEventListener('pointerleave', () => {
    clearHover();
    moveLightTo(35);
  });

  updateFromScroll();
})();
