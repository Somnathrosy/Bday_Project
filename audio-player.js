(function () {
  // audio-player.js
  // Provides a single persistent audio experience across pages in the same tab.
  // - Restores currentTime and playing state using sessionStorage
  // - Persists volume in localStorage
  // - Uses existing audio element with id="birthday-song" if present; otherwise creates one with id="global-audio"
  // - Hooks up controls if a .audio-controls or .music-controls exists, otherwise creates a minimal control UI

  const KEY_TIME = 'global-audio-time';
  const KEY_PLAYING = 'global-audio-playing';
  const KEY_VOLUME = 'global-audio-volume';
  const KEY_USER_GESTURE = 'global-audio-user-gesture';

  function $(sel) { return document.querySelector(sel); }

  // find or create audio element
  let audio = document.getElementById('birthday-song') || document.getElementById('global-audio');
  const createdAudio = !audio;
  let countdownMode = false;
  let countdownSong = 'audio/countdown-song.mp3';
  let mainSong = 'audio/main-song.mp3';
  let currentSong = mainSong;

  // Helper to set audio source
  function setAudioSource(srcUrl) {
    if (!audio) return;
    audio.pause();
    audio.src = srcUrl;
    audio.load();
    audio.currentTime = 0;
  }

  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'global-audio';
    audio.loop = true;
    audio.preload = 'auto';
    audio.style.display = 'none';
    document.body.appendChild(audio);
  }
  // Always start with main song unless countdownMode is set
  setAudioSource(mainSong);
  window.__globalAudio = audio;
  window.__setCountdownMode = function (isCountdown) {
    countdownMode = isCountdown;
    if (countdownMode) {
      audio.loop = false;
      setAudioSource(countdownSong);
    } else {
      audio.loop = true;
      setAudioSource(mainSong);
    }
  };
  window.__playCountdownSong = function () {
    setAudioSource(countdownSong);
    audio.play().catch(() => {});
  };

  // restore volume
  const savedVol = parseFloat(localStorage.getItem(KEY_VOLUME));
  if (!Number.isNaN(savedVol)) {
    audio.volume = savedVol;
  }

  // restore time
  const savedTime = parseFloat(sessionStorage.getItem(KEY_TIME));
  if (!Number.isNaN(savedTime) && savedTime > 0) {
    try { audio.currentTime = savedTime; } catch (e) { /* some browsers may throw until metadata loaded */ }
  }

  // find or create controls
  let controls = $('.audio-controls') || $('.music-controls');
  let playBtn, volInput;
  if (controls) {
    // try to map existing ids
    playBtn = controls.querySelector('#play-pause') || controls.querySelector('#global-play-pause') || controls.querySelector('button');
    volInput = controls.querySelector('#volume') || controls.querySelector('#global-volume') || controls.querySelector('input[type="range"]');
  } else {
    // create a minimal control UI
    controls = document.createElement('div');
    controls.className = 'audio-controls';
    controls.style.position = 'fixed';
    controls.style.bottom = '20px';
    controls.style.right = '20px';
    controls.style.backgroundColor = 'rgba(255,255,255,0.8)';
    controls.style.padding = '8px';
    controls.style.borderRadius = '50px';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.zIndex = '9999';

    playBtn = document.createElement('button');
    playBtn.id = 'global-play-pause';
    playBtn.style.fontSize = '18px';
    playBtn.style.border = 'none';
    playBtn.style.background = 'none';
    playBtn.style.cursor = 'pointer';
    playBtn.textContent = '▶️';

    volInput = document.createElement('input');
    volInput.id = 'global-volume';
    volInput.type = 'range';
    volInput.min = 0; volInput.max = 1; volInput.step = 0.01;
    volInput.style.marginLeft = '8px';
    volInput.style.width = '110px';
    volInput.value = audio.volume;

    controls.appendChild(playBtn);
    controls.appendChild(volInput);
    document.body.appendChild(controls);
  }

  // If controls existed and didn't contain playBtn/volInput, create buttons inside them
  if (!playBtn) {
    playBtn = document.createElement('button');
    playBtn.id = 'global-play-pause';
    playBtn.style.border = 'none';
    playBtn.style.background = 'none';
    playBtn.style.cursor = 'pointer';
    playBtn.textContent = audio.paused ? '▶️' : '⏸️';
    controls.insertBefore(playBtn, controls.firstChild);
  }
  if (!volInput) {
    volInput = document.createElement('input');
    volInput.id = 'global-volume';
    volInput.type = 'range';
    volInput.min = 0; volInput.max = 1; volInput.step = 0.01;
    volInput.style.marginLeft = '8px';
    volInput.style.width = '110px';
    volInput.value = audio.volume;
    controls.appendChild(volInput);
  }

  // update button icon
  function updatePlayIcon() {
    if (!playBtn) return;
    playBtn.textContent = audio.paused ? '▶️' : '⏸️';
  }

  // hook events
  playBtn.addEventListener('click', function (e) {
    e.preventDefault();
    // If countdown mode, play countdown song
    if (typeof window.__countdownRunning === 'function' && window.__countdownRunning()) {
      window.__playCountdownSong();
    } else {
      if (audio.paused) {
        audio.play().catch(() => { /* autoplay blocked */ });
      } else {
        audio.pause();
      }
    }
    updatePlayIcon();
  });

  volInput.addEventListener('input', function () {
    audio.volume = parseFloat(volInput.value);
    try { localStorage.setItem(KEY_VOLUME, audio.volume); } catch (e) {}
  });

  audio.addEventListener('play', updatePlayIcon);
  audio.addEventListener('pause', updatePlayIcon);

  // Always attempt to play music on every page load and user interaction
  window.addEventListener('load', function () {
    function tryPlayOnce() {
      audio.play().then(() => {
        updatePlayIcon();
      }).catch(() => {
        updatePlayIcon();
      });
    }
    tryPlayOnce();
    updatePlayIcon();
    // Add global click/touchstart event to force music playback
    function forcePlayMusic() {
      if (audio.paused) {
        audio.play().then(() => {
          updatePlayIcon();
        }).catch(() => {});
      }
    }
    window.addEventListener('click', forcePlayMusic, { once: true });
    window.addEventListener('touchstart', forcePlayMusic, { once: true });
    // Also keep the prompt for visibility
    setTimeout(() => {
      // Only show the enable music icon on index.html
      const isIndex = /index(\.html)?$/i.test(window.location.pathname);
      if (isIndex && audio.paused) {
        if (!document.getElementById('enable-sound-prompt')) {
          const btn = document.createElement('button');
          btn.id = 'enable-sound-prompt';
          btn.textContent = '🔊 Click anywhere to enable music';
          btn.style.position = 'fixed';
          btn.style.bottom = '24px';
          btn.style.right = '24px';
          btn.style.zIndex = '10001';
          btn.style.padding = '10px 14px';
          btn.style.borderRadius = '999px';
          btn.style.border = 'none';
          btn.style.background = 'linear-gradient(45deg,#ff9a9e,#8A2BE2)';
          btn.style.color = 'white';
          btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '14px';
          btn.addEventListener('click', forcePlayMusic);
          document.body.appendChild(btn);
        }
      }
    }, 800);
  });

  // Save current time and playing state periodically
  const saveState = function () {
    try {
      sessionStorage.setItem(KEY_TIME, audio.currentTime.toString());
      sessionStorage.setItem(KEY_PLAYING, (!audio.paused).toString());
    } catch (e) {}
  };

  const saveInterval = setInterval(saveState, 500);
  window.addEventListener('beforeunload', saveState);

  // If metadata not loaded yet, try to set time once it's available
  audio.addEventListener('loadedmetadata', function () {
    const t = parseFloat(sessionStorage.getItem(KEY_TIME));
    if (!Number.isNaN(t) && t > 0 && t < audio.duration) {
      try { audio.currentTime = t; } catch (e) {}
    }
  });

  // Hide the play/pause control so it doesn't always show; user asked audio should play without the button.
  try {
    if (playBtn && playBtn.style) {
      playBtn.style.display = 'none';
    }
    // If there is a music toggle container, keep it but hide any inner play button
    const musicToggle = document.querySelector('.music-controls');
    if (musicToggle) {
      const innerBtn = musicToggle.querySelector('button');
      if (innerBtn && innerBtn.style) innerBtn.style.display = 'none';
    }
  } catch (e) {
    // ignore styling issues
  }

  // --- Extras: persistent mute/unmute icon, indicator, and settings to clear gesture ---
  const KEY_MUTED = 'global-audio-muted';

  // Restore muted state
  try {
    const savedMuted = localStorage.getItem(KEY_MUTED);
    if (savedMuted === 'true') audio.muted = true;
  } catch (e) {}

  // Create persistent UI container (bottom-left) and a small toast helper
  (function createPersistentUI() {
    if (document.getElementById('global-music-ui')) return;

    const ui = document.createElement('div');
    ui.id = 'global-music-ui';
    ui.style.position = 'fixed';
    ui.style.left = '16px';
    ui.style.bottom = '16px';
    ui.style.zIndex = '10002';
    ui.style.display = 'flex';
    ui.style.alignItems = 'center';
    ui.style.gap = '8px';

    // small toast helper
    function showToast(text) {
      try {
        let t = document.getElementById('global-music-toast');
        if (!t) {
          t = document.createElement('div');
          t.id = 'global-music-toast';
          t.style.position = 'fixed';
          t.style.left = '50%';
          t.style.bottom = '32px';
          t.style.transform = 'translateX(-50%)';
          t.style.background = 'linear-gradient(45deg,#ff9a9e,#8A2BE2)';
          t.style.color = 'white';
          t.style.padding = '8px 14px';
          t.style.borderRadius = '999px';
          t.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
          t.style.zIndex = '20000';
          t.style.fontSize = '13px';
          document.body.appendChild(t);
        }
        t.textContent = text;
        t.style.opacity = '1';
        clearTimeout(t._hideTimeout);
        t._hideTimeout = setTimeout(() => { t.style.opacity = '0'; }, 2500);
      } catch (e) {}
    }

    // Mute/unmute button
    const muteBtn = document.createElement('button');
    muteBtn.id = 'global-mute-btn';
    muteBtn.style.border = 'none';
    muteBtn.style.background = 'linear-gradient(45deg,#ff9a9e,#8A2BE2)';
    muteBtn.style.borderRadius = '50%';
    muteBtn.style.width = '44px';
    muteBtn.style.height = '44px';
    muteBtn.style.display = 'flex';
    muteBtn.style.alignItems = 'center';
    muteBtn.style.justifyContent = 'center';
    muteBtn.style.cursor = 'pointer';
    muteBtn.style.boxShadow = '0 8px 24px rgba(138,43,226,0.18)';
    muteBtn.style.fontSize = '18px';
    muteBtn.textContent = audio.muted ? '🔇' : '🔈';

    // Indicator text
    const indicator = document.createElement('div');
    indicator.id = 'music-indicator';
  indicator.style.background = 'linear-gradient(45deg,#ff9a9e,#8A2BE2)';
  indicator.style.padding = '6px 10px';
  indicator.style.borderRadius = '18px';
  indicator.style.fontSize = '13px';
  indicator.style.color = 'white';
  indicator.style.boxShadow = '0 8px 24px rgba(138,43,226,0.12)';
    indicator.style.display = (sessionStorage.getItem(KEY_USER_GESTURE) === 'true' || localStorage.getItem(KEY_USER_GESTURE) === 'true') ? 'block' : 'none';
    indicator.textContent = 'Music enabled';

    // Settings button (small)
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'global-music-settings';
    settingsBtn.style.border = 'none';
    settingsBtn.style.background = 'none';
    settingsBtn.style.cursor = 'pointer';
    settingsBtn.style.fontSize = '18px';
    settingsBtn.textContent = '⚙️';

    // Settings popup
    const popup = document.createElement('div');
    popup.id = 'global-music-popup';
    popup.style.position = 'absolute';
    popup.style.bottom = '56px';
    popup.style.left = '0';
    popup.style.background = 'white';
    popup.style.padding = '8px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
    popup.style.display = 'none';
    popup.style.minWidth = '160px';

    const disableBtn = document.createElement('button');
    disableBtn.textContent = 'Disable music (clear preference)';
    disableBtn.style.width = '100%';
    disableBtn.style.padding = '8px';
    disableBtn.style.border = 'none';
    disableBtn.style.background = '#ff6b8a';
    disableBtn.style.color = 'white';
    disableBtn.style.borderRadius = '6px';
    disableBtn.style.cursor = 'pointer';

  popup.appendChild(disableBtn);

    // Wire events
    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      try { localStorage.setItem(KEY_MUTED, audio.muted ? 'true' : 'false'); } catch (e) {}
      muteBtn.textContent = audio.muted ? '🔇' : '🔈';
    });

    settingsBtn.addEventListener('click', () => {
      popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });

    disableBtn.addEventListener('click', () => {
      try { sessionStorage.removeItem(KEY_USER_GESTURE); } catch (e) {}
      try { localStorage.removeItem(KEY_USER_GESTURE); } catch (e) {}
      try { sessionStorage.setItem(KEY_PLAYING, 'false'); } catch (e) {}
      audio.pause();
      indicator.style.display = 'none';
      // remove enable prompt if present
      const prompt = document.getElementById('enable-sound-prompt');
      if (prompt) prompt.remove();
      popup.style.display = 'none';
      // show confirmation toast
      showToast('Music disabled. You can re-enable from any page.');
    });

    ui.appendChild(muteBtn);
    ui.appendChild(indicator);
    ui.appendChild(settingsBtn);
    ui.appendChild(popup);
    document.body.appendChild(ui);
  })();

  // expose for debugging
  window.__globalAudio = audio;

})();
