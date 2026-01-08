// release-gate.js
// Client-side release gate: shows a countdown until a target date and reveals the site
(function () {
  
  // --- 1. FIRST PAGE CHECK ---
  // This ensures the code ONLY runs on the homepage ('/' or '/index.html')
  // If the user is on any other page, the script stops here.
  const path = window.location.pathname;
  // We check if path is root "/" OR ends with "/index.html"
  if (path !== '/' && !path.endsWith('/index.html')) {
    return; 
  }

  // --- CONFIGURATION ---
  // Set to Jan 4, 2026, 20:59 local time
  // MONTHS ARE 0-INDEXED (0 = Jan, 1 = Feb, etc.)
  const TARGET = new Date(2026, 0, 10, 00, 40, 0);
  const REVEAL_KEY = 'project_revealed';

  function qParam(name) {
    try {
      const params = new URLSearchParams(location.search);
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  // OPTIONAL: If user already revealed locally or provided ?reveal=1, skip the gate
  // Uncomment lines below if you want the gate to disappear forever after opening once
  // if (localStorage.getItem(REVEAL_KEY) === '1' || qParam('reveal') === '1') {
  //   return;
  // }

  // Build overlay
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.5); } 50% { box-shadow: 0 0 30px rgba(255,255,255,0.8); } }
    
    #release-gate-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(255,255,255,0.1); backdrop-filter: blur(25px);
      display: flex; align-items: center; justify-content: center;
      padding: 24px; color: #000; font-family: 'Arial Black', Arial, sans-serif;
    }
    #release-gate-box {
      max-width: 800px; width: 100%; text-align: center;
      background: rgba(255,255,255,0.1); backdrop-filter: blur(30px);
      border: 1px solid rgba(255,255,255,0.5); border-radius: 25px;
      padding: 50px 30px; box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      animation: fadeIn 1s ease-out;
    }
    #release-gate-title { font-size: 36px; margin-bottom: 25px; font-weight: 700; text-shadow: 0 0 15px rgba(0,0,0,0.8); }
    #release-gate-sub { opacity: 0.9; margin-bottom: 30px; font-size: 20px; text-shadow: 0 0 5px rgba(0,0,0,0.5); }
    
    /* COUNTDOWN CONTAINER */
    #release-gate-count { display: flex; justify-content: center; gap: 25px; margin: 25px 0; }
    
    .time-unit {
      text-align: center; border: 3px solid; border-radius: 20px; padding: 20px;
      min-width: 100px; background: linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
      backdrop-filter: blur(20px); box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      animation: pulse 3s infinite ease-in-out;
    }
    .time-unit:nth-child(1){border-color:rgba(255,255,255,0.8)}
    .time-unit:nth-child(2){border-color:rgba(255,255,255,0.8)}
    .time-unit:nth-child(3){border-color:rgba(255,255,255,0.8)}
    .time-unit:nth-child(4){border-color:rgba(255,255,255,0.8)}

    /* VERTICAL FLIP STYLES */
    .flip-card {
      position: relative; width: 100%; height: 50px; perspective: 1000px;
    }
    .flip-card-inner {
      position: relative; width: 100%; height: 100%; text-align: center;
      transition: transform 0.6s; transform-style: preserve-3d;
    }
    .flip-card.flipped .flip-card-inner { transform: rotateX(-180deg); }
    
    .flip-card-front, .flip-card-back {
      position: absolute; width: 100%; height: 100%; backface-visibility: hidden;
      display: flex; align-items: center; justify-content: center;
      font-size: 40px; font-weight: 800; color: #000;
      text-shadow: 0 0 10px rgba(255,255,255,0.3);
    }
    .flip-card-back { transform: rotateX(-180deg); }

    .time-label { font-size: 16px; opacity: 0.95; margin-top: 10px; color: #000; font-weight: 500; }
    
    #release-open-btn {
      background: linear-gradient(90deg, #FF1493 0%, #8A2BE2 100%);
      border: none;
      color: #fff;
      padding: 18px 35px;
      border-radius: 20px;
      font-size: 20px;
      cursor: pointer;
      font-weight: 700;
      box-shadow: 0 8px 25px rgba(255, 105, 180, 0.18);
      animation: glow 2s infinite ease-in-out;
      transform: scale(1);
      transition: transform 0.3s, box-shadow 0.3s;
      letter-spacing: 1px;
    }
    #release-open-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 32px rgba(138,43,226,0.25);
      background: linear-gradient(90deg, #8A2BE2 0%, #FF1493 100%);
    }
    
    #days-unit { display: none; }

    /* --- POPUP MODAL STYLES --- */
    #msg-modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 100000;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(5px);
      display: none; /* Hidden by default */
      align-items: center; justify-content: center;
    }
    #msg-box {
      background: rgba(255, 255, 255, 0.9);
      padding: 30px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      max-width: 400px;
      width: 85%;
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    #msg-text { font-size: 22px; color: #333; margin-bottom: 20px; line-height: 1.4; }
    #msg-close-btn {
      background: #000; color: #fff; border: none; padding: 10px 25px;
      border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;
      transition: transform 0.2s;
    }
    #msg-close-btn:hover { transform: scale(1.05); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'release-gate-overlay';

  const box = document.createElement('div');
  box.id = 'release-gate-box';
  
  box.innerHTML = `
    <div id="release-gate-title">This site will open on Jan 4, 2026</div>
    <div id="release-gate-sub">So Please Wait Birthday Baby</div>
    <div id="release-gate-count">
      <div class="time-unit" id="days-unit">
        <div class="flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-front">--</div>
            <div class="flip-card-back">--</div>
          </div>
        </div>
        <div class="time-label">Days</div>
      </div>
      <div class="time-unit">
        <div class="flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-front">--</div>
            <div class="flip-card-back">--</div>
          </div>
        </div>
        <div class="time-label">Hours</div>
      </div>
      <div class="time-unit">
        <div class="flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-front">--</div>
            <div class="flip-card-back">--</div>
          </div>
        </div>
        <div class="time-label">Minutes</div>
      </div>
      <div class="time-unit">
        <div class="flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-front">--</div>
            <div class="flip-card-back">--</div>
          </div>
        </div>
        <div class="time-label">Seconds</div>
      </div>
    </div>
      <div style="margin-top:24px;">
        <button id="release-open-btn"> Surprise </button>
        <!-- Play Countdown Song button removed -->
      </div>
  `;

  // Create the hidden modal element
  const msgModal = document.createElement('div');
  msgModal.id = 'msg-modal';
  msgModal.innerHTML = `
    <div id="msg-box">
      <div id="msg-text">Don't try! 🤫<br>Open panriya da Bodysoda</div>
      <button id="msg-close-btn">wait panra</button>
    </div>
  `;

  overlay.appendChild(box);
  // Append modal to overlay so it sits on top
  overlay.appendChild(msgModal);
  
  document.documentElement.appendChild(overlay);

  // Prevent scrolling / interaction behind overlay
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  // Play countdown song while countdown is running
  try {
    if (window.__setCountdownMode) window.__setCountdownMode(true);
    window.__countdownRunning = () => true;
    if (window.__globalAudio) {
      window.__globalAudio.currentTime = 0;
      window.__globalAudio.play().catch(() => {});
    }
  } catch (e) {}

  const daysCard = document.querySelector('#days-unit .flip-card');
  const hoursCard = document.querySelector('.time-unit:nth-child(2) .flip-card');
  const minutesCard = document.querySelector('.time-unit:nth-child(3) .flip-card');
  const secondsCard = document.querySelector('.time-unit:nth-child(4) .flip-card');
  const daysUnitEl = document.getElementById('days-unit');
  const btn = document.getElementById('release-open-btn');
    // Play Countdown Song button removed
    const msgCloseBtn = document.getElementById('msg-close-btn');
  // Play Countdown Song button removed

  let prevDays = '--', prevHours = '--', prevMinutes = '--', prevSeconds = '--';

  function flipCard(card, newValue) {
    const front = card.querySelector('.flip-card-front');
    const back = card.querySelector('.flip-card-back');
    back.textContent = newValue;
    card.classList.add('flipped');
    setTimeout(() => {
      front.textContent = newValue;
      card.classList.remove('flipped');
    }, 300);
  }

  function pad(n) { return ('0' + n).slice(-2); }

  function reveal(auto) {
    // remove overlay and restore scrolling
    clearInterval(interval);
    try { overlay.remove(); } catch (e) {}
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    // Switch to main song after reveal
    try {
      if (window.__setCountdownMode) window.__setCountdownMode(false);
      window.__countdownRunning = () => false;
      if (window.__globalAudio) {
        window.__globalAudio.__userTriggered = false;
        window.__globalAudio.play().catch(() => {});
      }
    } catch (e) {}
    // persist reveal so returning visitors won't see the gate
    if (auto) localStorage.setItem(REVEAL_KEY, '1');
  }

  function update() {
    const now = new Date();
    let diff = TARGET - now;
    if (diff <= 0) {
      // Auto-reveal at/after target time
      flipCard(daysCard, '00');
      flipCard(hoursCard, '00');
      flipCard(minutesCard, '00');
      flipCard(secondsCard, '00');
      // Start main song only after timer ends
      reveal(true);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * 24 * 60 * 60 * 1000;
    // Do not restart countdown song every second
    // Only play on overlay show or Surprise button
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * 60 * 1000;
    const seconds = Math.floor(diff / 1000);

    daysUnitEl.style.display = days > 0 ? 'block' : 'none';
    if (days !== prevDays) flipCard(daysCard, days > 0 ? days : '--');
    if (pad(hours) !== prevHours) flipCard(hoursCard, pad(hours));
    if (pad(minutes) !== prevMinutes) flipCard(minutesCard, pad(minutes));
    if (pad(seconds) !== prevSeconds) flipCard(secondsCard, pad(seconds));

    prevDays = days > 0 ? days : '--';
    prevHours = pad(hours);
    prevMinutes = pad(minutes);
    prevSeconds = pad(seconds);
  }

  const interval = setInterval(update, 1000);
  update();

  // Button Click Logic
  let countdownSongTimeout;
  btn.addEventListener('click', function () {
    const now = new Date();
    if (now >= TARGET) {
      reveal(false);
    } else {
      // Play countdown song on Surprise button click before countdown ends
      console.log('Surprise button clicked before countdown ends');
      try {
        if (window.__setCountdownMode) window.__setCountdownMode(true);
        window.__countdownRunning = () => true;
        if (window.__globalAudio) {
          window.__globalAudio.__userTriggered = true;
          // Always reset and play countdown song from start
          window.__globalAudio.pause();
          window.__globalAudio.currentTime = 0;
          window.__globalAudio.play().then(() => {
            console.log('Countdown song playback started');
            // Clear previous timeout if exists
            if (countdownSongTimeout) clearTimeout(countdownSongTimeout);
            // Pause or switch song after 2 seconds
            countdownSongTimeout = setTimeout(() => {
              // After 2 seconds, just pause countdown song and reset userTriggered
              window.__globalAudio.__userTriggered = false;
              window.__globalAudio.pause();
              console.log('Countdown song stopped after 2 seconds, main song will NOT resume until timer ends');
            }, 2000);
          }).catch((err) => {
            console.error('Countdown song playback error:', err);
          });
        } else {
          console.warn('window.__globalAudio not found');
        }
      } catch (e) {
        console.error('Error in Surprise button handler:', e);
      }
      // Show custom popup after 2 seconds
      setTimeout(function() {
        msgModal.style.display = 'flex';
      }, 2000);
    }
  });

  // Close Popup Logic
  msgCloseBtn.addEventListener('click', function() {
    msgModal.style.display = 'none';
  });
  
  // Also close if clicking outside the white box
  msgModal.addEventListener('click', function(e) {
    if(e.target === msgModal) {
      msgModal.style.display = 'none';
    }
  });

  // If someone adds ?reveal=1 treat as revealed for this session
  if (qParam('reveal') === '1') {
    localStorage.setItem(REVEAL_KEY, '1');
    reveal(false);
  }

})();