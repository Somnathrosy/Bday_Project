"use strict";

(function () {
  // audio-player.js
  // Provides a single persistent audio experience across pages in the same tab.
  // - Restores currentTime and playing state using sessionStorage
  // - Persists volume in localStorage
  // - Uses existing audio element with id="birthday-song" if present; otherwise creates one with id="global-audio"
  // - Hooks up controls if a .audio-controls or .music-controls exists, otherwise creates a minimal control UI
  var KEY_TIME = 'global-audio-time';
  var KEY_PLAYING = 'global-audio-playing';
  var KEY_VOLUME = 'global-audio-volume';
  var KEY_USER_GESTURE = 'global-audio-user-gesture';

  function $(sel) {
    return document.querySelector(sel);
  } // find or create audio element


  var audio = document.getElementById('birthday-song') || document.getElementById('global-audio');
  var createdAudio = !audio;

  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'global-audio';
    audio.loop = true;
    audio.preload = 'auto';
    var src = document.createElement('source');
    src.src = 'audio/song.mp3';
    src.type = 'audio/mp3';
    audio.appendChild(src);
    audio.style.display = 'none';
    document.body.appendChild(audio);
  } // restore volume


  var savedVol = parseFloat(localStorage.getItem(KEY_VOLUME));

  if (!Number.isNaN(savedVol)) {
    audio.volume = savedVol;
  } // restore time


  var savedTime = parseFloat(sessionStorage.getItem(KEY_TIME));

  if (!Number.isNaN(savedTime) && savedTime > 0) {
    try {
      audio.currentTime = savedTime;
    } catch (e) {
      /* some browsers may throw until metadata loaded */
    }
  } // find or create controls


  var controls = $('.audio-controls') || $('.music-controls');
  var playBtn, volInput;

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
    volInput.min = 0;
    volInput.max = 1;
    volInput.step = 0.01;
    volInput.style.marginLeft = '8px';
    volInput.style.width = '110px';
    volInput.value = audio.volume;
    controls.appendChild(playBtn);
    controls.appendChild(volInput);
    document.body.appendChild(controls);
  } // If controls existed and didn't contain playBtn/volInput, create buttons inside them


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
    volInput.min = 0;
    volInput.max = 1;
    volInput.step = 0.01;
    volInput.style.marginLeft = '8px';
    volInput.style.width = '110px';
    volInput.value = audio.volume;
    controls.appendChild(volInput);
  } // update button icon


  function updatePlayIcon() {
    if (!playBtn) return;
    playBtn.textContent = audio.paused ? '▶️' : '⏸️';
  } // hook events


  playBtn.addEventListener('click', function (e) {
    e.preventDefault();

    if (audio.paused) {
      audio.play()["catch"](function () {
        /* autoplay blocked */
      });
    } else {
      audio.pause();
    }

    updatePlayIcon();
  });
  volInput.addEventListener('input', function () {
    audio.volume = parseFloat(volInput.value);

    try {
      localStorage.setItem(KEY_VOLUME, audio.volume);
    } catch (e) {}
  });
  audio.addEventListener('play', updatePlayIcon);
  audio.addEventListener('pause', updatePlayIcon); // if saved as playing, try to resume — attempt autoplay on load
  // Also consider whether the user previously enabled sound (user gesture) so autoplay can be attempted

  var wasPlaying = sessionStorage.getItem(KEY_PLAYING) === 'true' || sessionStorage.getItem(KEY_USER_GESTURE) === 'true' || localStorage.getItem(KEY_USER_GESTURE) === 'true';
  window.addEventListener('load', function () {
    // Try to play; browsers may block autoplay with sound. We still attempt once.
    function tryPlayOnce() {
      audio.play().then(function () {
        sessionStorage.setItem(KEY_PLAYING, 'true');
        updatePlayIcon();
      })["catch"](function () {
        // Autoplay blocked — mark as not playing for now
        sessionStorage.setItem(KEY_PLAYING, 'false');
        updatePlayIcon();
      });
    }

    if (wasPlaying) {
      tryPlayOnce();
    } else {
      // still try to start automatically once
      tryPlayOnce();
    }

    updatePlayIcon(); // If audio is still paused after a short delay, autoplay was likely blocked.
    // Show a small unobtrusive prompt so the user can enable sound with a click.

    setTimeout(function () {
      if (audio.paused) {
        // create prompt if not already present
        if (!document.getElementById('enable-sound-prompt')) {
          var btn = document.createElement('button');
          btn.id = 'enable-sound-prompt';
          btn.textContent = '🔊 Enable sound';
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
          btn.addEventListener('click', function () {
            audio.play().then(function () {
              // mark as playing and as having received a user gesture so subsequent pages will attempt to resume
              try {
                sessionStorage.setItem(KEY_PLAYING, 'true');
              } catch (e) {}

              try {
                sessionStorage.setItem(KEY_USER_GESTURE, 'true');
              } catch (e) {}

              try {
                localStorage.setItem(KEY_USER_GESTURE, 'true');
              } catch (e) {}

              updatePlayIcon();
              btn.remove();
            })["catch"](function () {
              // still blocked or error; keep the button so user can try again
              console.log('Playback attempt failed on user click');
            });
          });
          document.body.appendChild(btn);
        }
      }
    }, 800);
  }); // Save current time and playing state periodically

  var saveState = function saveState() {
    try {
      sessionStorage.setItem(KEY_TIME, audio.currentTime.toString());
      sessionStorage.setItem(KEY_PLAYING, (!audio.paused).toString());
    } catch (e) {}
  };

  var saveInterval = setInterval(saveState, 500);
  window.addEventListener('beforeunload', saveState); // If metadata not loaded yet, try to set time once it's available

  audio.addEventListener('loadedmetadata', function () {
    var t = parseFloat(sessionStorage.getItem(KEY_TIME));

    if (!Number.isNaN(t) && t > 0 && t < audio.duration) {
      try {
        audio.currentTime = t;
      } catch (e) {}
    }
  }); // Hide the play/pause control so it doesn't always show; user asked audio should play without the button.

  try {
    if (playBtn && playBtn.style) {
      playBtn.style.display = 'none';
    } // If there is a music toggle container, keep it but hide any inner play button


    var musicToggle = document.querySelector('.music-controls');

    if (musicToggle) {
      var innerBtn = musicToggle.querySelector('button');
      if (innerBtn && innerBtn.style) innerBtn.style.display = 'none';
    }
  } catch (e) {} // ignore styling issues
  // --- Extras: persistent mute/unmute icon, indicator, and settings to clear gesture ---


  var KEY_MUTED = 'global-audio-muted'; // Restore muted state

  try {
    var savedMuted = localStorage.getItem(KEY_MUTED);
    if (savedMuted === 'true') audio.muted = true;
  } catch (e) {} // Create persistent UI container (bottom-left)


  (function createPersistentUI() {
    if (document.getElementById('global-music-ui')) return;
    var ui = document.createElement('div');
    ui.id = 'global-music-ui';
    ui.style.position = 'fixed';
    ui.style.left = '16px';
    ui.style.bottom = '16px';
    ui.style.zIndex = '10002';
    ui.style.display = 'flex';
    ui.style.alignItems = 'center';
    ui.style.gap = '8px'; // Mute/unmute button

    var muteBtn = document.createElement('button');
    muteBtn.id = 'global-mute-btn';
    muteBtn.style.border = 'none';
    muteBtn.style.background = 'linear-gradient(45deg,#fff,#f0f0f0)';
    muteBtn.style.borderRadius = '50%';
    muteBtn.style.width = '44px';
    muteBtn.style.height = '44px';
    muteBtn.style.display = 'flex';
    muteBtn.style.alignItems = 'center';
    muteBtn.style.justifyContent = 'center';
    muteBtn.style.cursor = 'pointer';
    muteBtn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    muteBtn.style.fontSize = '18px';
    muteBtn.textContent = audio.muted ? '🔇' : '🔈'; // Indicator text

    var indicator = document.createElement('div');
    indicator.id = 'music-indicator';
    indicator.style.background = 'rgba(255,255,255,0.9)';
    indicator.style.padding = '6px 10px';
    indicator.style.borderRadius = '18px';
    indicator.style.fontSize = '13px';
    indicator.style.color = '#333';
    indicator.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
    indicator.style.display = sessionStorage.getItem(KEY_USER_GESTURE) === 'true' || localStorage.getItem(KEY_USER_GESTURE) === 'true' ? 'block' : 'none';
    indicator.textContent = 'Music enabled'; // Settings button (small)

    var settingsBtn = document.createElement('button');
    settingsBtn.id = 'global-music-settings';
    settingsBtn.style.border = 'none';
    settingsBtn.style.background = 'none';
    settingsBtn.style.cursor = 'pointer';
    settingsBtn.style.fontSize = '18px';
    settingsBtn.textContent = '⚙️'; // Settings popup

    var popup = document.createElement('div');
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
    var disableBtn = document.createElement('button');
    disableBtn.textContent = 'Disable music (clear preference)';
    disableBtn.style.width = '100%';
    disableBtn.style.padding = '8px';
    disableBtn.style.border = 'none';
    disableBtn.style.background = '#ff6b8a';
    disableBtn.style.color = 'white';
    disableBtn.style.borderRadius = '6px';
    disableBtn.style.cursor = 'pointer';
    popup.appendChild(disableBtn); // Wire events

    muteBtn.addEventListener('click', function () {
      audio.muted = !audio.muted;

      try {
        localStorage.setItem(KEY_MUTED, audio.muted ? 'true' : 'false');
      } catch (e) {}

      muteBtn.textContent = audio.muted ? '🔇' : '🔈';
    });
    settingsBtn.addEventListener('click', function () {
      popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    });
    disableBtn.addEventListener('click', function () {
      try {
        sessionStorage.removeItem(KEY_USER_GESTURE);
      } catch (e) {}

      try {
        localStorage.removeItem(KEY_USER_GESTURE);
      } catch (e) {}

      try {
        sessionStorage.setItem(KEY_PLAYING, 'false');
      } catch (e) {}

      audio.pause();
      indicator.style.display = 'none'; // remove enable prompt if present

      var prompt = document.getElementById('enable-sound-prompt');
      if (prompt) prompt.remove();
      popup.style.display = 'none';
    });
    ui.appendChild(muteBtn);
    ui.appendChild(indicator);
    ui.appendChild(settingsBtn);
    ui.appendChild(popup);
    document.body.appendChild(ui);
  })(); // expose for debugging


  window.__globalAudio = audio;
})();