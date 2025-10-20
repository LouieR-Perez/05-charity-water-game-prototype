// Core functionality for Pump it Pure: timer, score, water meter, contamination, pump/purify
// Feedback classes summary (for students):
//   .shake       -> added when a button is used at the wrong time (error feedback)
//   .pump-glow   -> brief success glow when a pump action is valid
//   .purify-glow -> brief success glow when purification is valid
// We add a class, wait a short time, then remove it. This keeps code simple.

// DOM refs
const startBtn   = document.getElementById('startBtn');
const pumpBtn    = document.getElementById('pumpBtn');
const purifyBtn  = document.getElementById('purifyBtn');
const timeEl     = document.getElementById('time');
const scoreEl    = document.getElementById('score');
const meterFill  = document.getElementById('meterFill');
const meterPctEl = document.getElementById('meterPct');
const statusBadge= document.getElementById('statusBadge');
const result     = document.getElementById('resultPanel');
const resultMsg  = document.getElementById('resultMsg');
const replayBtn  = document.getElementById('replayBtn');
const resetBtn   = document.getElementById('resetBtn');
// confirmResetBtn is added later; safer to grab after DOMContentLoaded
let confirmResetBtn = null;

// State
let score = 0;
let timeLeft = 45;
let progress = 0;        // 0–100
let active = false;
let contaminated = false;
let timerId = null;
let contamTimeoutId = null;

// Settings (tweakable)
let PUMP_GAIN = 4;                    // % gained per pump tap (will be recalculated each game)
const SUCCESS_THRESHOLD = 100;        // always fill meter to 100%
const CONTAM_MIN_DELAY_MS = 900;      // earliest next contamination
const CONTAM_MAX_DELAY_MS = 2500;     // latest next contamination

function setProgress(next){
  progress = Math.max(0, Math.min(100, next));
  meterFill.style.width = `${progress}%`;
  meterPctEl.textContent = `${Math.round(progress)}%`;
}

function setScore(next){
  score = Math.max(0, next);
  scoreEl.textContent = String(score);
}

function setTime(next){
  timeLeft = Math.max(0, next);
  timeEl.textContent = String(timeLeft);
}

function setContaminated(flag){
  contaminated = flag;
  if (contaminated){
    statusBadge.textContent = 'Water: Contaminated';
    statusBadge.classList.remove('safe');
    statusBadge.classList.add('contaminated');
    pumpBtn.classList.add('pump-blocked');
  } else {
    statusBadge.textContent = 'Water: Clean';
    statusBadge.classList.remove('contaminated');
    statusBadge.classList.add('safe');
    pumpBtn.classList.remove('pump-blocked');
    scheduleNextContamination(); // plan the next one
  }
  // Ensure Purify is only meaningful when contaminated
  purifyBtn.disabled = !contaminated || !active;
}

function scheduleNextContamination(){
  // Clear any pending timer
  if (contamTimeoutId) clearTimeout(contamTimeoutId);
  if (!active) return;

  const delay = randInt(CONTAM_MIN_DELAY_MS, CONTAM_MAX_DELAY_MS);
  contamTimeoutId = setTimeout(() => {
    // Trigger contamination only if still active and currently clean
    if (active && !contaminated) setContaminated(true);
  }, delay);
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startGame(){
  // Randomize the number of clicks needed to win (between 25 and 35)
  // Instead of raising the threshold above 100%, we adjust how much each click adds.
  // This keeps the visual meter consistent (0–100%) and still varies difficulty.
  const minClicks = 25;
  const maxClicks = 35;
  const randomClicks = randInt(minClicks, maxClicks);
  // Each click should add just enough so randomClicks fills to 100%.
  // Example: if randomClicks = 25, PUMP_GAIN = 4%. If 35, PUMP_GAIN ≈ 2.857%.
  PUMP_GAIN = 100 / randomClicks;
  console.log(`Game start: need ${randomClicks} pumps. Each pump adds ${PUMP_GAIN.toFixed(2)}%.`);

  // Reset state
  active = true;
  setScore(0);
  setTime(45);
  setProgress(0);
  result.classList.add('hidden');

  pumpBtn.disabled = false;
  purifyBtn.disabled = true; // starts clean
  startBtn.disabled = true;
  resetBtn.classList.remove('hidden'); // show reset when game active

  setContaminated(false);    // starts clean and schedules next contamination

  // Timer tick
  clearInterval(timerId);
  timerId = setInterval(() => {
    if (!active) return;
    setTime(timeLeft - 1);
    if (timeLeft <= 0){
      endGame(false); // time out
    }
  }, 1000);
}

function endGame(won){
  active = false;
  clearInterval(timerId);
  if (contamTimeoutId) clearTimeout(contamTimeoutId);

  pumpBtn.disabled = true;
  purifyBtn.disabled = true;
  startBtn.disabled = false;
  resetBtn.classList.add('hidden'); // hide reset after game ends

  const success = won || progress >= SUCCESS_THRESHOLD;
  if (success){
    resultMsg.textContent = `Great job! You filled the meter to ${Math.round(progress)}% and scored ${score}.`;
  } else {
    resultMsg.textContent = `Time's up! You reached ${Math.round(progress)}% with a score of ${score}. Try again!`;
  }
  result.classList.remove('hidden');
}

// Reset the game mid-play without starting a new round immediately.
// This is different from endGame because we don't show a result message; we simply clear state.
function resetGame(){
  // Stop timers
  active = false;
  clearInterval(timerId);
  if (contamTimeoutId) clearTimeout(contamTimeoutId);

  // Clear state values
  setScore(0);
  setTime(45);
  setProgress(0);
  contaminated = false; // direct flag change; we'll call setContaminated below for UI sync
  setContaminated(false); // ensures badge resets and Purify disabled

  // Disable action buttons until player starts again
  pumpBtn.disabled = true;
  purifyBtn.disabled = true;
  startBtn.disabled = false;
  resetBtn.classList.add('hidden'); // hide until a new game starts

  // Hide any result panel if visible
  result.classList.add('hidden');
  console.log('Game reset to initial state.');
}

function handlePump(){
  if (!active) return;

  if (contaminated){
    // Block pumping when water is contaminated.
    // We add the 'shake' class briefly so the player learns they must Purify first.
    pumpBtn.classList.add('shake');
    setTimeout(() => pumpBtn.classList.remove('shake'), 350);
    return;
  }

  // Pump is allowed: increase progress & score by dynamic gain
  setProgress(progress + PUMP_GAIN);
  setScore(score + 1);

  // Success feedback: a brief outward glow so players feel progress.
  pumpBtn.classList.add('pump-glow');
  setTimeout(() => pumpBtn.classList.remove('pump-glow'), 500);

  // Check if player reached 100% (win condition)
  if (progress >= SUCCESS_THRESHOLD){
    setProgress(SUCCESS_THRESHOLD); // ensure progress shows exactly 100%
    endGame(true);
  }
}

function handlePurify(){
  if (!active) return;
  if (!contaminated){
    // If the water is already clean, Purify does nothing.
    // We shake to signal "not needed right now".
    purifyBtn.classList.add('shake');
    setTimeout(() => purifyBtn.classList.remove('shake'), 300);
    return;
  }

  // Valid purification: clear contamination
  setContaminated(false);
  // Success glow feedback (similar to pump). Helps differentiate from error shake.
  purifyBtn.classList.add('purify-glow');
  setTimeout(() => purifyBtn.classList.remove('purify-glow'), 500);
}

// Wire up controls
startBtn.addEventListener('click', startGame);
replayBtn.addEventListener('click', startGame);
pumpBtn.addEventListener('click', handlePump);
purifyBtn.addEventListener('click', handlePurify);
// Attach modal confirm listener once DOM is fully parsed
document.addEventListener('DOMContentLoaded', () => {
  confirmResetBtn = document.getElementById('confirmResetBtn');
  if (confirmResetBtn){
    confirmResetBtn.addEventListener('click', () => {
      // Run reset BEFORE modal dismiss animation completes
      resetGame();
      console.log('Reset confirmed via modal.');
    });
  }
});

// Enable keyboard activation for accessibility
pumpBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePump(); }
});
purifyBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePurify(); }
});

console.log('Pump it Pure — pump/purify prototype loaded.');
