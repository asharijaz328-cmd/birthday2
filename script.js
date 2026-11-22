// Countdown Target: 24 November 2026, 00:00:00 AM (Midnight)
const targetDate = new Date('2026-11-24T00:00:00');
let countdownInterval = null;
let isUnlocked = false;

// ================= VISITOR TRACKER (DISCORD ALERTS + LIVE WEB DASHBOARD) =================
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

// Start Countdown Immediately
countdownInterval = setInterval(updateCountdown, 1000);
document.addEventListener('DOMContentLoaded', updateCountdown);
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

function playAudioClip(id) {
  if (!soundEnabled) return;
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
const VAULT_PASSWORD = "1";
let vaultUnlocked = false;

function checkVaultPassword() {
  initAudio();
  const input = document.getElementById('vaultPasswordInput');
  const errorEl = document.getElementById('vaultError');
  if (!input) return;

  const entered = input.value.trim();
  if (entered === VAULT_PASSWORD) {
    vaultUnlocked = true;
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

// Navigation between steps
function goToStep(stepNumber) {
  initAudio();
  playPopSound();

  // Clear music loop if navigating away from finale (Step 6)
  if (stepNumber !== 6 && birthdayMusicLoopTimer) {
    clearTimeout(birthdayMusicLoopTimer);
    birthdayMusicLoopTimer = null;
  }

  // Stop treat audio if navigating away from Step 4
  const treatEl = document.getElementById('treatSound');
  if (treatEl && stepNumber !== 4) {
    treatEl.pause();
    treatEl.currentTime = 0;
  }

  // Stop private voice note if navigating away from Step 5
  const privateVoiceEl = document.getElementById('privateVoiceNote');
  if (privateVoiceEl && stepNumber !== 5) {
    privateVoiceEl.pause();
    privateVoiceEl.currentTime = 0;
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
      // Step 4: Treat page voice clip
      playAudioClip('treatSound');
    } else if (currentStep === 5) {
      // Step 5: Secret Vault Gate
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
