// Countdown Target: 24 November 2026, 00:00:00 AM (Midnight)
const targetDate = new Date('2026-11-24T00:00:00');
let countdownInterval = null;
let isUnlocked = false;

// ================= VISITOR TRACKER (DISCORD ALERTS + LIVE WEB DASHBOARD) =================
const DISCORD_NOTIFICATIONS_ACTIVE = true; // Active
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1573776676494778518/ZylolRUGm18O-oK1V9h50-C2b1fzTmgusYF63ADqsWVkTPvtKUxY8wMaEa86pEQyoQ80';
const WEB_LOGGER_URL = 'https://webhook.site/507210d0-1062-4e76-87fd-5709e2181acb';

let cachedLocation = null;

async function fetchLocation() {
  if (cachedLocation) return cachedLocation;

  // Provider 1: ipwho.is (Accurate, fast, CORS enabled)
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (data && data.success && data.city) {
      const isp = data.connection?.isp || data.connection?.org || 'Net';
      cachedLocation = `${data.city}, ${data.region || ''}, ${data.country || ''} (${isp})`;
      return cachedLocation;
    }
  } catch (_) {}

  // Provider 2: get.geojs.io (Cloudflare CDN backed, CORS enabled fallback)
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    const data = await res.json();
    if (data && data.city) {
      cachedLocation = `${data.city}, ${data.region || ''}, ${data.country || ''} (${data.organization_name || 'Net'})`;
      return cachedLocation;
    }
  } catch (_) {}

  return 'Pakistan';
}

// Prefetch location immediately on page load
fetchLocation();

async function sendDiscordNotification(eventTitle, extraNote = '') {
  if (!DISCORD_NOTIFICATIONS_ACTIVE) return;
  try {
    // 1. Ignore automated bots, headless crawlers & security scanners
    if (navigator.webdriver) return;
    const ua = navigator.userAgent;
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('bot') || uaLower.includes('crawl') || uaLower.includes('spider') || uaLower.includes('headless') || uaLower.includes('lighthouse') || uaLower.includes('preview')) {
      return;
    }

    let device = 'PC / Laptop 💻';
    if (/android/i.test(ua)) device = 'Android Phone 📱';
    else if (/iphone|ipad|ipod/i.test(ua)) device = 'iPhone / iPad 🍎';

    const screenRes = `${window.innerWidth}x${window.innerHeight}`;
    const referrer = document.referrer ? document.referrer : 'Direct Link / QR Code 📲';

    const locationStr = await fetchLocation();

    // 2. Ignore cloud datacenter / server bots (DigitalOcean, M247, Hetzner, AWS, etc.)
    const locLower = locationStr.toLowerCase();
    if (locLower.includes('digitalocean') || locLower.includes('m247') || locLower.includes('hetzner') || locLower.includes('ovh') || locLower.includes('amazon') || locLower.includes('datacamp') || locLower.includes('linode') || locLower.includes('server')) {
      return;
    }

    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const payload = {
      username: 'Ahsan Birthday Tracker 🎂',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
      embeds: [
        {
          title: eventTitle,
          color: eventTitle.includes('Blew') ? 0x00ff88 : (eventTitle.includes('Open') ? 0xff7700 : 0x00c3ff),
          fields: [
            { name: '📍 Location', value: locationStr, inline: true },
            { name: '📱 Device', value: device, inline: true },
            { name: '🖥️ Screen', value: screenRes, inline: true },
            { name: '🔗 Source', value: referrer, inline: true },
            { name: '⏰ Time', value: nowStr, inline: true },
            ...(extraNote ? [{ name: '📝 Note', value: extraNote, inline: false }] : [])
          ],
          footer: { text: "Live Birthday Visitor Alert" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    // 1. Send Instant Push Alert to Discord
    fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // 2. Log to Private Web Logger Dashboard (Option 2)
    fetch(WEB_LOGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventTitle,
        device: device,
        location: locationStr,
        screen: screenRes,
        referrer: referrer,
        time: nowStr,
        note: extraNote,
        userAgent: ua
      })
    }).catch(() => {});
  } catch (_) {}
}

// Track initial website visit once per browser session
if (!sessionStorage.getItem('ahsan_opened_alert')) {
  sessionStorage.setItem('ahsan_opened_alert', 'true');
  sendDiscordNotification('🚨 Website Just Opened!');
}

// Anti-Cheat Security: Monotonic elapsed timer + Server time sync
let serverOffset = 0;
let initialPerf = performance.now();
let initialRealTime = Date.now();

function syncServerTime() {
  fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
    .then(res => {
      const serverDateHeader = res.headers.get('date');
      if (serverDateHeader) {
        const serverTime = new Date(serverDateHeader).getTime();
        serverOffset = serverTime - Date.now();
        initialRealTime = serverTime;
        initialPerf = performance.now();
      }
    })
    .catch(() => {});
}
syncServerTime();

function getSecureCurrentTime() {
  // Monotonic elapsed time cannot be manipulated by changing phone system clock
  const elapsedMs = performance.now() - initialPerf;
  const monotonicTime = new Date(initialRealTime + elapsedMs);
  const deviceTimeWithOffset = new Date(Date.now() + serverOffset);

  // If system clock was manually forwarded ahead, fall back to tamper-proof monotonic time
  if (deviceTimeWithOffset.getTime() - monotonicTime.getTime() > 60000) {
    return monotonicTime;
  }
  return deviceTimeWithOffset;
}

function updateCountdown() {
  if (isUnlocked) return;

  const now = getSecureCurrentTime();
  const diff = targetDate - now;

  if (diff <= 0) {
    onCountdownComplete();
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const elHours = document.getElementById('cdHours');
  const elMinutes = document.getElementById('cdMinutes');
  const elSeconds = document.getElementById('cdSeconds');

  if (elHours) elHours.innerText = String(hours).padStart(2, '0');
  if (elMinutes) elMinutes.innerText = String(minutes).padStart(2, '0');
  if (elSeconds) elSeconds.innerText = String(seconds).padStart(2, '0');
}

// When Countdown finishes at 12:00 AM
function onCountdownComplete() {
  if (countdownInterval) clearInterval(countdownInterval);

  const elHours = document.getElementById('cdHours');
  const elMinutes = document.getElementById('cdMinutes');
  const elSeconds = document.getElementById('cdSeconds');
  if (elHours) elHours.innerText = '00';
  if (elMinutes) elMinutes.innerText = '00';
  if (elSeconds) elSeconds.innerText = '00';

  const badge = document.querySelector('.cd-badge');
  if (badge) badge.innerText = 'UNLOCKED';

  const title = document.querySelector('.cd-title');
  if (title) title.innerText = "It's 12:00 AM! 🎉";

  const actionArea = document.getElementById('countdownActionArea');
  if (actionArea) actionArea.classList.remove('hidden');
}

// User clicks button to reveal the 1st page
function revealFirstPage() {
  if (isUnlocked) return;
  isUnlocked = true;
  if (countdownInterval) clearInterval(countdownInterval);

  sendDiscordNotification('🎁 Visitor Clicked "Open Gift" & Started Birthday Story!');

  initAudio();
  playPopSound();

  const overlay = document.getElementById('countdownScreen');
  if (overlay) {
    overlay.classList.add('unlocked');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 700);
  }

  if (typeof confetti === 'function') {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  }
}

// ONLY SECRET UNLOCK: Type 'ahsan' or 'ahmad' on keyboard
let typedKeys = '';
window.addEventListener('keydown', (e) => {
  if (e.key) {
    typedKeys = (typedKeys + e.key.toLowerCase()).slice(-10);
    if (typedKeys.includes('ahsan') || typedKeys.includes('ahmad')) {
      revealFirstPage();
    }
  }
});

// Secret Test URLs (Mobile & PC Test Links for Creator):
if (window.location.search.includes('12am')) {
  setTimeout(onCountdownComplete, 150);
}
if (window.location.search.includes('ahsan') || window.location.search.includes('ahmad')) {
  setTimeout(revealFirstPage, 150);
}

// Start Countdown & Pre-warm Audios Immediately
countdownInterval = setInterval(updateCountdown, 1000);
document.addEventListener('DOMContentLoaded', () => {
  updateCountdown();
  warmUpAudioClips();
  // Start gentle background preloading after 2.5 seconds (idle time)
  setTimeout(() => {
    preloadVaultVideosSequentially(false);
  }, 2500);
});
updateCountdown();

// State Management
let currentStep = 1;
const totalSteps = 6;
let soundEnabled = true;
let audioCtx = null;
let bgMusicInterval = null;

// Initialize Audio Context on First Interaction
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

// Unlock mobile hardware audio on very first user touch/tap
let mobileAudioUnlocked = false;
function unlockMobileAudio() {
  if (mobileAudioUnlocked) return;
  mobileAudioUnlocked = true;

  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  // Prime HTML audio elements silently so mobile decoder holds them in RAM
  ['ohMyYesSound', 'fahhSound', 'heheSound', 'treatSound'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const prevVol = el.volume;
      el.volume = 0;
      const p = el.play();
      if (p !== undefined) {
        p.then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = prevVol || 1;
        }).catch(() => {
          el.volume = prevVol || 1;
        });
      }
    }
  });

  window.removeEventListener('pointerdown', unlockMobileAudio);
  window.removeEventListener('touchstart', unlockMobileAudio);
  window.removeEventListener('click', unlockMobileAudio);
}

window.addEventListener('pointerdown', unlockMobileAudio, { passive: true });
window.addEventListener('touchstart', unlockMobileAudio, { passive: true });
window.addEventListener('click', unlockMobileAudio, { passive: true });

// Simple Web Audio Synthesizer for Fun SFX
function playTone(freq, type = 'sine', duration = 0.15, volume = 0.2) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log("Audio play error", e);
  }
}

// Sound effects
function playPopSound() {
  playTone(520, 'sine', 0.08, 0.15);
  setTimeout(() => playTone(680, 'triangle', 0.12, 0.2), 60);
}

function playWrongSound() {
  playTone(220, 'sawtooth', 0.2, 0.2);
  setTimeout(() => playTone(180, 'sawtooth', 0.3, 0.2), 100);
}

function playCheerChime() {
  const notes = [440, 554, 659, 880];
  notes.forEach((note, index) => {
    setTimeout(() => playTone(note, 'sine', 0.25, 0.2), index * 80);
  });
}

function playFanfareSound() {
  const notes = [392, 523, 659, 784, 1046];
  notes.forEach((note, index) => {
    setTimeout(() => playTone(note, 'triangle', 0.3, 0.25), index * 100);
  });
}

// Quote Soundboard handler
function playQuoteSound(type) {
  initAudio();
  if (type === 'behtreen') {
    playTone(523, 'sine', 0.1, 0.3);
    setTimeout(() => playTone(659, 'sine', 0.15, 0.3), 100);
    setTimeout(() => playTone(784, 'triangle', 0.35, 0.3), 200);
    // Mini confetti burst
    if (typeof confetti === 'function') {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
  } else if (type === 'kiahibaat') {
    playTone(440, 'triangle', 0.15, 0.3);
    setTimeout(() => playTone(554, 'triangle', 0.15, 0.3), 120);
    setTimeout(() => playTone(659, 'triangle', 0.15, 0.3), 240);
    setTimeout(() => playTone(880, 'sine', 0.4, 0.3), 360);
    if (typeof confetti === 'function') {
      confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
    }
  }
}

function playRichTone(freq, duration = 0.5, volume = 0.45) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Warm octave overtone for richer acoustic presence
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + duration);
    osc2.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log("Audio play error", e);
  }
}

let birthdayMusicLoopTimer = null;

// Complete, Harmonized & Continuous Happy Birthday Song (Loud & Extended Loop)
function playHappyBirthdayMelody() {
  if (!soundEnabled || currentStep !== 6) return;
  initAudio();
  if (!audioCtx) return;

  if (birthdayMusicLoopTimer) clearTimeout(birthdayMusicLoopTimer);

  const melody = [
    // Phrase 1: Happy Birthday to you
    { f: 261.63, b: 130.81, d: 400 },
    { f: 261.63, b: 130.81, d: 400 },
    { f: 293.66, b: 146.83, d: 750 },
    { f: 261.63, b: 130.81, d: 750 },
    { f: 349.23, b: 174.61, d: 750 },
    { f: 329.63, b: 164.81, d: 1500 },
    
    // Phrase 2: Happy Birthday to you
    { f: 261.63, b: 130.81, d: 400 },
    { f: 261.63, b: 130.81, d: 400 },
    { f: 293.66, b: 146.83, d: 750 },
    { f: 261.63, b: 130.81, d: 750 },
    { f: 392.00, b: 196.00, d: 750 },
    { f: 349.23, b: 174.61, d: 1500 },

    // Phrase 3: Happy Birthday dear Ahsan
    { f: 261.63, b: 130.81, d: 400 },
    { f: 261.63, b: 130.81, d: 400 },
    { f: 523.25, b: 261.63, d: 750 },
    { f: 440.00, b: 220.00, d: 750 },
    { f: 349.23, b: 174.61, d: 750 },
    { f: 329.63, b: 164.81, d: 750 },
    { f: 293.66, b: 146.83, d: 1500 },

    // Phrase 4: Happy Birthday to you!
    { f: 466.16, b: 233.08, d: 400 },
    { f: 466.16, b: 233.08, d: 400 },
    { f: 440.00, b: 220.00, d: 750 },
    { f: 349.23, b: 174.61, d: 750 },
    { f: 392.00, b: 196.00, d: 750 },
    { f: 349.23, b: 174.61, d: 2200 }
  ];

  let cumulativeTime = 0;
  melody.forEach((note) => {
    setTimeout(() => {
      if (soundEnabled && currentStep === 6) {
        playRichTone(note.f, note.d / 1000, 0.48);
        if (note.b) {
          playTone(note.b, 'sine', (note.d / 1000) * 1.1, 0.22);
        }
      }
    }, cumulativeTime);
    cumulativeTime += note.d + 70;
  });

  // Automatically Loop Continuously While on Final Page
  birthdayMusicLoopTimer = setTimeout(() => {
    if (soundEnabled && currentStep === 6) {
      playHappyBirthdayMelody();
    }
  }, cumulativeTime + 1800);
}

const activeAudioSources = {};

function stopAudioClip(id) {
  // 1. Stop Web Audio API buffer node if actively playing
  if (activeAudioSources[id]) {
    try {
      activeAudioSources[id].stop(0);
      activeAudioSources[id].disconnect();
    } catch (_) {}
    delete activeAudioSources[id];
  }

  // 2. Stop HTML Audio element
  const audioEl = document.getElementById(id);
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}

function playAudioClip(id) {
  if (!soundEnabled) return;
  stopAudioClip(id); // Stop previous instance if already playing
  initAudio();

  // Priority 1: Instant Web Audio API RAM buffer playback (0 millisecond delay!)
  if (audioCtx && pcmBuffers[id] && audioCtx.state !== 'suspended') {
    try {
      const source = audioCtx.createBufferSource();
      source.buffer = pcmBuffers[id];
      const gain = audioCtx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      
      source.onended = () => {
        if (activeAudioSources[id] === source) {
          delete activeAudioSources[id];
        }
      };

      activeAudioSources[id] = source;
      source.start(0);
      return;
    } catch (_) {}
  }

  // Priority 2: In-Memory Blob HTML Audio element
  const audioEl = document.getElementById(id);
  if (audioEl) {
    audioEl.currentTime = 0;
    audioEl.play().catch(e => console.log('Audio error:', e));
  } else {
    const audioObj = new Audio('audio/ohmyyes.mpeg');
    audioObj.play().catch(() => {});
  }
}

// ================= SECRET VAULT PASSWORD LOGIC =================
const VAULT_PASSWORD = "kfueit328";
let vaultUnlocked = false;

function checkVaultPassword() {
  initAudio();
  const input = document.getElementById('vaultPasswordInput');
  const errorEl = document.getElementById('vaultError');
  if (!input) return;

  const entered = input.value.trim();
  if (entered.toLowerCase() === VAULT_PASSWORD.toLowerCase()) {
    vaultUnlocked = true;
    preloadVaultVideos();
    if (errorEl) errorEl.classList.add('hidden');

    // Play fanfare / celebration
    playFanfareSound();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }

    // Discord Alert
    sendDiscordNotification('🔓 Secret Vault Unlocked by Visitor (Password Entered)!');

    // Smooth transition from Lock Gate to Unlocked Content
    const lockScreen = document.getElementById('vaultLockScreen');
    const unlockedContent = document.getElementById('vaultUnlockedContent');
    if (lockScreen && unlockedContent) {
      lockScreen.style.opacity = '0';
      lockScreen.style.transition = 'opacity 0.35s ease';
      setTimeout(() => {
        lockScreen.classList.add('hidden');
        unlockedContent.classList.remove('hidden');
        unlockedContent.style.opacity = '0';
        unlockedContent.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          unlockedContent.style.opacity = '1';
        }, 50);
      }, 350);
    }
  } else {
    // Wrong password
    playAudioClip('fahhSound');
    if (errorEl) errorEl.classList.remove('hidden');
    input.parentElement.classList.add('shake-input');
    setTimeout(() => input.parentElement.classList.remove('shake-input'), 450);
    input.value = '';
    input.focus();
  }
}

function toggleVaultPasswordVisibility() {
  const input = document.getElementById('vaultPasswordInput');
  const eyeBtn = document.getElementById('vaultEyeIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (eyeBtn) eyeBtn.innerText = '🙈';
  } else {
    input.type = 'password';
    if (eyeBtn) eyeBtn.innerText = '👁️';
  }
}

// Automatically re-lock the secret vault whenever visitor exits Step 5
function relockVault() {
  vaultUnlocked = false;

  const lockScreen = document.getElementById('vaultLockScreen');
  const unlockedContent = document.getElementById('vaultUnlockedContent');
  const vaultInput = document.getElementById('vaultPasswordInput');
  const errorEl = document.getElementById('vaultError');
  const eyeBtn = document.getElementById('vaultEyeIcon');

  if (lockScreen) {
    lockScreen.classList.remove('hidden');
    lockScreen.style.opacity = '1';
  }
  if (unlockedContent) {
    unlockedContent.classList.add('hidden');
    unlockedContent.style.opacity = '0';
  }
  if (vaultInput) {
    vaultInput.value = '';
    vaultInput.type = 'password';
  }
  if (eyeBtn) {
    eyeBtn.innerText = '👁️';
  }
  if (errorEl) {
    errorEl.classList.add('hidden');
  }

  // Reset tab to Photos
  const firstTabBtn = document.querySelector('.vault-tab-btn');
  if (firstTabBtn && typeof switchVaultTab === 'function') {
    switchVaultTab('photos', firstTabBtn);
  }
}

// In-Memory RAM Audio Buffers (Decoded PCM for 0ms latency)
const pcmBuffers = {};

function warmUpAudioClips() {
  const audioMap = [
    { id: 'ohMyYesSound', url: 'audio/ohmyyes.mpeg' },
    { id: 'fahhSound', url: 'audio/Fahh.mpeg' },
    { id: 'heheSound', url: 'audio/hehe.mpeg' },
    { id: 'treatSound', url: 'audio/treat.mpeg' }
  ];

  audioMap.forEach(({ id, url }) => {
    const el = document.getElementById(id);
    if (el) {
      el.preload = 'auto';
      try { el.load(); } catch (_) {}
    }

    // Fetch original audio file into RAM arrayBuffer and decode for instant playback
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        // Blob URL for HTML audio element
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);
        if (el) {
          el.src = blobUrl;
          try { el.load(); } catch (_) {}
        }

        // Web Audio API decoding for 0ms playback
        initAudio();
        if (audioCtx) {
          audioCtx.decodeAudioData(buffer.slice(0), decoded => {
            pcmBuffers[id] = decoded;
          }, () => {});
        }
      })
      .catch(() => {});
  });
}

// Smart Sequential Background Preloader for Videos (Zero Lag on Audio & Timer)
let vaultVideosPreloadStarted = false;
function preloadVaultVideosSequentially(forceAll = false) {
  const videos = Array.from(document.querySelectorAll('.vault-video'));
  if (forceAll) {
    videos.forEach(v => {
      v.preload = 'auto';
      try { if (v.readyState < 2) v.load(); } catch (_) {}
    });
    return;
  }

  if (vaultVideosPreloadStarted) return;
  vaultVideosPreloadStarted = true;

  let currentIndex = 0;
  function loadNextVideo() {
    if (currentIndex >= videos.length) return;
    const vid = videos[currentIndex++];
    vid.preload = 'auto';
    try { vid.load(); } catch (_) {}

    let advanced = false;
    const onNext = () => {
      if (advanced) return;
      advanced = true;
      vid.removeEventListener('loadeddata', onNext);
      vid.removeEventListener('canplay', onNext);
      setTimeout(loadNextVideo, 250);
    };

    vid.addEventListener('loadeddata', onNext);
    vid.addEventListener('canplay', onNext);
    setTimeout(onNext, 1000); // Safety fallback so queue continues smoothly
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadNextVideo, { timeout: 3500 });
  } else {
    setTimeout(loadNextVideo, 1200);
  }
}

function preloadVaultVideos() {
  preloadVaultVideosSequentially(false);
}

// Switch tabs inside Secret Vault (Photos, Videos, Special Note)
function switchVaultTab(tabName, btn) {
  document.querySelectorAll('.vault-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const tabPhotos = document.getElementById('vaultTabPhotos');
  const tabVideos = document.getElementById('vaultTabVideos');
  const tabNote = document.getElementById('vaultTabNote');

  if (tabPhotos) tabPhotos.classList.toggle('hidden', tabName !== 'photos');
  if (tabVideos) {
    tabVideos.classList.toggle('hidden', tabName !== 'videos');
    if (tabName === 'videos') {
      preloadVaultVideosSequentially(true); // User opened tab -> buffer immediately!
    }
  }
  if (tabNote) tabNote.classList.toggle('hidden', tabName !== 'note');

  // Pause playing videos when switching away from videos tab
  if (tabName !== 'videos') {
    document.querySelectorAll('.vault-video').forEach(v => v.pause());
  }
}

// Lightbox for Photos
function openVaultLightbox(imgSrc) {
  const modal = document.getElementById('vaultLightboxModal');
  const modalImg = document.getElementById('vaultLightboxImg');
  if (modal && modalImg) {
    modalImg.src = imgSrc;
    modal.classList.remove('hidden');
  }
}

function closeVaultLightbox() {
  const modal = document.getElementById('vaultLightboxModal');
  if (modal) modal.classList.add('hidden');
}

// Navigation between steps
function goToStep(stepNumber) {
  initAudio();
  playPopSound();

  // Close lightbox if open
  closeVaultLightbox();

  // Clear music loop if navigating away from finale (Step 6)
  if (stepNumber !== 6 && birthdayMusicLoopTimer) {
    clearTimeout(birthdayMusicLoopTimer);
    birthdayMusicLoopTimer = null;
  }

  // Stop treat audio immediately if navigating away from Step 4
  if (stepNumber !== 4) {
    stopAudioClip('treatSound');
  }

  // When leaving Step 5 (Secret Vault), stop videos and automatically RE-LOCK the vault
  if (stepNumber !== 5) {
    document.querySelectorAll('.vault-video').forEach(v => v.pause());
    relockVault();
  }

  // Play hehe on Step 1 -> Step 2
  if (stepNumber === 2) {
    playAudioClip('heheSound');
  }

  const slides = document.querySelectorAll('.step-slide');
  slides.forEach(slide => {
    slide.classList.remove('active');
  });

  const nextSlide = document.querySelector(`.step-slide[data-step="${stepNumber}"]`);
  if (nextSlide) {
    nextSlide.classList.add('active');
    currentStep = stepNumber;

    // Update Progress Bar
    const percent = (currentStep / totalSteps) * 100;
    const barFill = document.getElementById('progressBarFill');
    if (barFill) barFill.style.width = `${percent}%`;

    // Update Step Counter
    const counter = document.getElementById('stepCounter');
    if (counter) counter.innerText = `${currentStep} of ${totalSteps}`;

    // Step-Specific Triggers
    if (currentStep === 3) {
      // Option B clicked (Step 2 -> Step 3)
      playAudioClip('ohMyYesSound');
    } else if (currentStep === 4) {
      // Step 4: Treat page voice clip & start background preloading videos early
      playAudioClip('treatSound');
      preloadVaultVideos();
    } else if (currentStep === 5) {
      // Step 5: Secret Vault Gate (Start preloading videos in background)
      preloadVaultVideos();
      const vaultInput = document.getElementById('vaultPasswordInput');
      if (vaultInput && !vaultUnlocked) {
        setTimeout(() => vaultInput.focus(), 350);
      }
    } else if (currentStep === 6) {
      // GRAND FINALE
      fireCelebrationConfetti();
      playFanfareSound();
      setTimeout(playHappyBirthdayMelody, 600);
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Step 2 Wrong Choice Handler
function wrongChoice(button) {
  playAudioClip('fahhSound');
  button.style.transform = 'translateX(8px)';
  setTimeout(() => button.style.transform = 'translateX(-8px)', 100);
  setTimeout(() => button.style.transform = 'translateX(0)', 200);
  
  const feedback = document.getElementById('choiceFeedback');
  if (feedback) feedback.classList.remove('hidden');
}

// Step 5: Blowing out the candles
function blowCandles() {
  initAudio();
  playTone(200, 'sine', 0.4, 0.3); // Blow whoosh sound
  
  const candles = document.querySelectorAll('.candle');
  candles.forEach(candle => candle.classList.add('blown'));

  const hint = document.getElementById('cakeInstruction');
  if (hint) hint.innerText = "Candles blown out!";

  fireCelebrationConfetti();
  playFanfareSound();
  sendDiscordNotification('🎂 Candles Blown Out on Step 6 (Finale reached)!');
}

// Confetti blast
function fireCelebrationConfetti() {
  if (typeof confetti === 'function') {
    // Left cannon
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    // Right cannon
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
    // Center fountain
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 }
      });
    }, 250);
  }
}

// Sound toggle button
const soundBtn = document.getElementById('soundToggleBtn');
if (soundBtn) {
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const soundIcon = document.getElementById('soundIcon');
    if (soundIcon) {
      soundIcon.innerText = soundEnabled ? '🔊' : '🔇';
    }
    if (!soundEnabled) {
      if (birthdayMusicLoopTimer) {
        clearTimeout(birthdayMusicLoopTimer);
        birthdayMusicLoopTimer = null;
      }
      document.querySelectorAll('audio').forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
    } else if (soundEnabled && currentStep === 6) {
      playHappyBirthdayMelody();
    }
  });
}

// ================= MOBILE ANTI-SAVE & PRIVACY BLACKOUT LOGIC =================
const vaultSlide = document.getElementById('vaultSlide');
if (vaultSlide) {
  vaultSlide.addEventListener('contextmenu', (e) => e.preventDefault());
}

function showPrivacyScreen() {
  if (currentStep === 5 && vaultUnlocked) {
    const screen = document.getElementById('privacyBlackoutScreen');
    if (screen) screen.classList.remove('hidden');
  }
}

function hidePrivacyScreen() {
  const screen = document.getElementById('privacyBlackoutScreen');
  if (screen) screen.classList.add('hidden');
}

window.addEventListener('blur', showPrivacyScreen);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    showPrivacyScreen();
  } else {
    hidePrivacyScreen();
  }
});
window.addEventListener('focus', hidePrivacyScreen);

// Auto-pause other videos when one video plays
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.vault-video').forEach(video => {
    video.addEventListener('play', () => {
      document.querySelectorAll('.vault-video').forEach(other => {
        if (other !== video) other.pause();
      });
    });
  });
});

