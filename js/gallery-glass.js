(() => {
  'use strict';

  const control = document.querySelector('.gallery-nav-control');
  // Some engines accept url() syntactically but do not render SVG backdrop filters.
  // Chromium gets the optical enhancement; other engines keep the CSS material.
  const chromium = navigator.userAgentData?.brands.some(({ brand }) => brand === 'Chromium') ||
    /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent);
  if (!control || !chromium || !CSS.supports('backdrop-filter', 'url("#gallery-glass-refraction")')) return;

  const namespace = 'http://www.w3.org/2000/svg';
  function svgElement(name, attributes) {
    const element = document.createElementNS(namespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }
  const svg = svgElement('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.pointerEvents = 'none';
  const defs = svgElement('defs', {});
  const filter = svgElement('filter', {
    id: 'gallery-glass-refraction', filterUnits: 'userSpaceOnUse',
    primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB'
  });
  const map = svgElement('feImage', { result: 'edge-map', preserveAspectRatio: 'none' });
  const displacement = svgElement('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'edge-map', scale: 18,
    xChannelSelector: 'R', yChannelSelector: 'G'
  });
  filter.append(map, displacement);
  defs.append(filter);
  svg.append(defs);
  document.body.append(svg);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) { svg.remove(); return; }
  const reference = new URL(location.href);
  reference.hash = 'gallery-glass-refraction';
  const filterValue = `url("${reference.href}") blur(2px) saturate(155%) brightness(0.96)`;
  let lastSize = '';
  let generation = 0;

  function updateOptics() {
    const width = Math.ceil(control.getBoundingClientRect().width);
    const height = Math.ceil(control.getBoundingClientRect().height);
    const size = `${width}:${height}`;
    if (!width || !height || size === lastSize) return;
    lastSize = size;
    const currentGeneration = ++generation;
    const padding = 20;
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;
    const pixels = context.createImageData(canvas.width, canvas.height);
    const radius = height / 2;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const px = x - padding + 0.5;
        const py = y - padding + 0.5;
        const centerX = Math.max(radius, Math.min(width - radius, px));
        const dx = px - centerX;
        const dy = py - radius;
        const distance = Math.hypot(dx, dy);
        const depth = radius - distance;
        // Bend only the outer 14px of the capsule, at most 7.1px, along its normal.
        // The centre stays neutral, so the photographs do not wobble or magnify.
        const bend = depth >= 0 && depth < 14 ? Math.pow(1 - depth / 14, 2) * 100 : 0;
        const index = (y * canvas.width + x) * 4;
        pixels.data[index] = 128 - (distance ? dx / distance * bend : 0);
        pixels.data[index + 1] = 128 - (distance ? dy / distance * bend : 0);
        pixels.data[index + 2] = 128;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    const uri = canvas.toDataURL();
    [filter, map].forEach((element) => {
      element.setAttribute('x', -padding);
      element.setAttribute('y', -padding);
      element.setAttribute('width', canvas.width);
      element.setAttribute('height', canvas.height);
    });
    map.setAttribute('href', uri);
    const decodedMap = new Image();
    decodedMap.onload = () => {
      if (currentGeneration === generation) control.style.setProperty('--gallery-glass-filter', filterValue);
    };
    decodedMap.src = uri;
  }

  // Rebuild the small displacement map only on size changes, never while scrolling.
  new ResizeObserver(updateOptics).observe(control);
  updateOptics();
})();
