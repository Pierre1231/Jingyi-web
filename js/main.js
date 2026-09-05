// Shared behaviors across all pages
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleCode(btn) {
  const pre = btn.nextElementSibling;
  pre.classList.toggle('open');
  const isOpen = pre.classList.contains('open');
  btn.textContent = isOpen ? 'Hide code' : 'Show code';
  btn.style.borderRadius = isOpen ? '6px 6px 0 0' : '6px';
}
