// Core functionality for Pump it Pure: timer, score, water meter, contamination, pump/purify

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

// State
let score = 0;
let timeLeft = 45;
let progress = 0;        // 0–100
let active = false;
let contaminated = false;
let timerId = null;
let contamTimeoutId = null;

// Settings (tweakable)
const PUMP_GAIN = 4;                  // % per pump tap
const SUCCESS_THRESHOLD = 100;        // fill meter to 100%
const CONTAM_MIN_DELAY_MS = 2500;     // earliest next contamination
const CONTAM_MAX_DELAY_MS = 7000;     // latest next contamination

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
  // Reset state
  active = true;
  setScore(0);
  setTime(45);
  setProgress(0);
  result.classList.add('hidden');

  pumpBtn.disabled = false;
  purifyBtn.disabled = true; // starts clean
  startBtn.disabled = true;

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

  const success = won || progress >= SUCCESS_THRESHOLD;
  if (success){
    resultMsg.textContent = `Great job! You filled the meter to ${Math.round(progress)}% and scored ${score}.`;
  } else {
    resultMsg.textContent = `Time's up! You reached ${Math.round(progress)}% with a score of ${score}. Try again!`;
  }
  result.classList.remove('hidden');
}

function handlePump(){
  if (!active) return;

  if (contaminated){
    // Block pumping; give visual feedback
    pumpBtn.classList.add('shake');
    setTimeout(() => pumpBtn.classList.remove('shake'), 350);
    return;
  }

  // Pump is allowed: increase progress & score
  setProgress(progress + PUMP_GAIN);
  setScore(score + 1);

  if (progress >= 100){
    setProgress(100);
    endGame(true);
  }
}

function handlePurify(){
  if (!active) return;
  if (!contaminated) return;

  // Clear contamination
  setContaminated(false);

  // Quick positive feedback on button press
  purifyBtn.classList.add('shake');
  setTimeout(() => purifyBtn.classList.remove('shake'), 300);
}

// Wire up controls
startBtn.addEventListener('click', startGame);
replayBtn.addEventListener('click', startGame);
pumpBtn.addEventListener('click', handlePump);
purifyBtn.addEventListener('click', handlePurify);

// Enable keyboard activation for accessibility
pumpBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePump(); }
});
purifyBtn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePurify(); }
});

console.log('Pump it Pure — pump/purify prototype loaded.');
