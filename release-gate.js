// release-gate.js
// Client-side release gate: shows a countdown until a target date and reveals the site
(function () {
  // Set to today (Jan 4, 2026) 19:00 local time
  const TARGET = new Date(2026, 0, 4, 19, 0, 0);
  const REVEAL_KEY = 'project_revealed';

  function qParam(name) {
    try {
      const params = new URLSearchParams(location.search);
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  // If user already revealed locally or provided ?reveal=1, skip the gate
  if (localStorage.getItem(REVEAL_KEY) === '1' || qParam('reveal') === '1') {
    return;
  }

  // Build overlay
  const style = document.createElement('style');
  style.textContent = `
    #release-gate-overlay{position:fixed;inset:0;z-index:99999;background:linear-gradient(180deg,rgba(0,0,0,0.8),rgba(0,0,0,0.9));display:flex;align-items:center;justify-content:center;padding:24px;color:#fff;font-family:Segoe UI,Arial,helvetica,sans-serif}
    #release-gate-box{max-width:780px;width:100%;text-align:center}
    #release-gate-title{font-size:28px;margin-bottom:12px}
    #release-gate-count{font-size:40px;font-weight:700;margin:12px 0}
    #release-gate-sub{opacity:0.9;margin-bottom:18px}
    #release-open-btn{background:#ff6ec4;border:none;color:white;padding:12px 22px;border-radius:10px;font-size:18px;cursor:pointer}
    #release-open-btn[disabled]{opacity:0.5;cursor:not-allowed}
    #release-gate-footer{margin-top:12px;font-size:13px;opacity:0.85}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'release-gate-overlay';

  const box = document.createElement('div');
  box.id = 'release-gate-box';
  box.innerHTML = `
    <div id="release-gate-title">This site will open on Jan 4, 2026</div>
    <div id="release-gate-sub">Countdown to release (local time)</div>
    <div id="release-gate-count">--:--:--</div>
    <div><button id="release-open-btn" disabled>Open project</button></div>
    <div id="release-gate-footer">If you are the author, add <code>?reveal=1</code> to the URL to bypass locally.</div>
  `;

  overlay.appendChild(box);
  document.documentElement.appendChild(overlay);

  // Prevent scrolling / interaction behind overlay
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  const countEl = document.getElementById('release-gate-count');
  const btn = document.getElementById('release-open-btn');

  function pad(n) { return String(n).padStart(2, '0'); }

  function reveal(auto) {
    // remove overlay and restore scrolling
    clearInterval(interval);
    try { overlay.remove(); } catch (e) {}
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    // persist reveal so returning visitors won't see the gate
    if (auto) localStorage.setItem(REVEAL_KEY, '1');
  }

  function update() {
    const now = new Date();
    let diff = TARGET - now;
    if (diff <= 0) {
      // Auto-reveal at/after target time
      countEl.textContent = '00:00:00';
      reveal(true);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);

    const pieces = (days > 0) ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    countEl.textContent = pieces;
  }

  const interval = setInterval(update, 1000);
  update();

  btn.addEventListener('click', function () {
    // If someone clicks and the target has been reached, reveal immediately.
    if (new Date() >= TARGET) {
      reveal(false); // do not set auto flag (but we could)
    }
  });

  // If someone adds ?reveal=1 treat as revealed for this session (but not persisted)
  if (qParam('reveal') === '1') {
    // explicit reveal via query param
    localStorage.setItem(REVEAL_KEY, '1');
    reveal(false);
  }

})();
