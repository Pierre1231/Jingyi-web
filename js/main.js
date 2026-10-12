// Shared behaviors across all pages
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Hero entrance: trigger once on load (home only; harmless elsewhere) */
const instantArrival = document.documentElement.classList.contains('instant-arrival');
const restoringArrival = document.documentElement.classList.contains('restoring-arrival');
if (!instantArrival && !restoringArrival) document.body.classList.add('playing');
if (instantArrival) {
  const targetId = decodeURIComponent(location.hash.slice(1));
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) target.scrollIntoView({ block: 'start' });
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete('instant');
  cleanUrl.searchParams.delete('fromGallery');
  try {
    history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  } catch (_) {}
  document.documentElement.classList.remove('instant-arrival');
}
if (!document.body.classList.contains('gallery-body')) {
  window.addEventListener('pagehide', () => document.documentElement.classList.add('restoring-arrival'));
  window.addEventListener('pageshow', () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove('restoring-arrival');
    }));
  });
}

/* Keep the fixed nav readable once it overlaps page content. */
const topNav = document.querySelector('.topnav');
const hero = document.querySelector('.hero');
if (topNav && !document.body.classList.contains('gallery-body')) {
  const updateNavBackground = () => {
    topNav.classList.toggle('is-solid', !hero || hero.getBoundingClientRect().bottom <= topNav.offsetHeight);
  };
  window.addEventListener('scroll', updateNavBackground, { passive: true });
  window.addEventListener('resize', updateNavBackground);
  window.addEventListener('load', updateNavBackground);
  updateNavBackground();
}

/* ===== Mobile menu ===== */
const menuToggle = document.querySelector('.menu-toggle');
const menuOverlay = document.querySelector('.menu-overlay');

function setMenu(open) {
  if (!menuToggle || !menuOverlay) return;
  document.body.classList.toggle('menu-open', open);
  menuOverlay.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? 'CLOSE' : 'MENU';
}

if (menuToggle && menuOverlay) {
  menuToggle.addEventListener('click', () => {
    setMenu(!menuOverlay.classList.contains('open'));
  });
  menuOverlay.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });
}

/* ===== Scroll reveal ===== */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  let io = null;
  const revealNow = (el) => {
    el.classList.remove('pending');
    el.classList.add('in');
    if (io) io.unobserve(el);
  };
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(revealNow);
  } else {
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) revealNow(entry.target);
      });
    }, { threshold: 0.08 });
    revealEls.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        revealNow(el);
      } else {
        el.classList.add('pending');
        io.observe(el);
      }
    });
    // Loading with a hash (or restoring scroll) can land mid-page before the
    // observer reports: reveal anything already at or above the fold.
    const settle = () => revealEls.forEach((el) => {
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight * 0.95) {
        revealNow(el);
      }
    });
    window.addEventListener('load', () => setTimeout(settle, 80));
    window.addEventListener('hashchange', () => setTimeout(settle, 80));
  }
}

/* ===== Scroll spy (top nav) ===== */
const spySections = document.querySelectorAll('section[id]');
const spyLinks = document.querySelectorAll('.topnav ul a[href^="#"]');
if (spySections.length && spyLinks.length) {
  let ticking = false;
  const updateSpy = () => {
    ticking = false;
    let current = '';
    const scrollPos = window.scrollY;
    spySections.forEach((section) => {
      if (scrollPos >= section.offsetTop - 160) current = section.id;
    });
    // Force-highlight the last section near the bottom of the page
    const last = spySections[spySections.length - 1];
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (last && current !== last.id && scrollPos >= maxScroll - 100) current = last.id;
    spyLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateSpy);
    }
  }, { passive: true });
  updateSpy();
}

/* ===== Collapsible code blocks (project pages) ===== */
function toggleCode(btn) {
  const block = btn.closest('.code-block');
  const pre = block ? block.querySelector('pre') : btn.nextElementSibling;
  if (!pre) return;
  const isOpen = pre.classList.toggle('open');
  btn.textContent = isOpen ? 'Hide code' : 'Show code';
}
