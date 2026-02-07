import { LIB_COLORS } from './std/colors';
import { LIB_VECTOR } from './std/vector';
import { LIB_GAMEOBJECT } from './std/gameobject';
import { LIB_AUDIO } from './std/audio';

/**
 * The HOST TEMPLATE is the fixed engine code that runs the variable AI script.
 * It handles:
 * 1. Canvas setup & Resizing
 * 2. Input normalization (Mouse/Touch/Keyboard)
 * 3. Conditional Injection (Sandbox 2.0)
 * 4. Game Loop (requestAnimationFrame)
 * 5. Error handling
 */
export const createHostHTML = (aiScript: string) => {
  // If the code is already a full HTML document (legacy/database support), return it as is.
  if (aiScript.trim().startsWith('<!DOCTYPE html>') || aiScript.trim().startsWith('<html')) {
    return aiScript;
  }

  // --- SANDBOX 2.0 CONDITIONAL INJECTION ---
  const hasVector = /class\s+Vector\b/.test(aiScript);
  const hasColors = /const\s+COLORS\b/.test(aiScript);
  // GameObject removed - AI should define their own entity classes for flexibility
  // const hasGameObject = /class\s+GameObject\b/.test(aiScript);
  // We always inject audio to encourage usage, as it's a new feature
  
  let injection = "";
  if (!hasColors) injection += LIB_COLORS;
  if (!hasVector) injection += LIB_VECTOR;
  injection += LIB_AUDIO;
  // GameObject injection removed to align with main project architecture
  // Fallback: If AI uses GameObject but forgets to define it, we provide it.
  // if (!hasGameObject) injection += LIB_GAMEOBJECT;

  // Serialize the code to a JSON string literal.
  const serializedScript = JSON.stringify(aiScript)
    .replace(/<\/script>/g, '<\\/script>');

  // Otherwise, inject the script into our Engine Harness
  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  /* Set background to transparent so we can see the Holo-Grid behind the iframe */
  body { margin: 0; overflow: hidden; background: transparent; color: #fff; font-family: monospace; touch-action: none; user-select: none; -webkit-user-select: none; }
  canvas { display: block; touch-action: none; outline: none; }
  #err { position: fixed; top: 10px; left: 10px; color: #ff5555; background: rgba(0,0,0,0.8); padding: 10px; display: none; z-index: 1000; border: 1px solid #ff5555; }
  
  /* --- MOBILE CONTROLS --- */
  .mobile-controls {
    position: fixed; bottom: 20px; left: 0; right: 0;
    height: 140px;
    display: none; /* Hidden on desktop by default */
    pointer-events: none; /* Let touches pass through spacing */
    justify-content: space-between;
    padding: 0 40px;
    z-index: 100;
  }

  /* Show on touch devices or small screens */
  @media (hover: none) and (pointer: coarse), (max-width: 900px) {
    .mobile-controls { display: flex; }
  }

  .d-pad { position: relative; width: 120px; height: 120px; pointer-events: auto; }
  .d-btn { 
    position: absolute; width: 40px; height: 40px; 
    background: rgba(255,255,255,0.1); 
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.5);
    font-size: 20px;
    font-weight: bold;
    user-select: none;
  }
  .d-btn:active { background: rgba(255,255,255,0.4); color: #000; }
  
  .d-up { top: 0; left: 40px; }
  .d-down { bottom: 0; left: 40px; }
  .d-left { top: 40px; left: 0; }
  .d-right { top: 40px; left: 80px; }

  .action-area { position: relative; width: 100px; height: 120px; pointer-events: auto; display: flex; align-items: flex-end; justify-content: flex-end;}
  .a-btn {
    width: 80px; height: 80px;
    background: rgba(255, 50, 50, 0.15);
    border: 1px solid rgba(255, 50, 50, 0.4);
    border-radius: 50%;
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.7);
    font-size: 14px;
    font-weight: bold;
  }
  .a-btn:active { background: rgba(255, 50, 50, 0.5); color: #fff; }
</style>
</head>
<body>
<canvas id="c" tabindex="1"></canvas>
<div id="err"></div>

<!-- Virtual Controls Overlay -->
<div class="mobile-controls">
  <div class="d-pad">
    <div class="d-btn d-up" data-keys='["ArrowUp","KeyW"]'>▲</div>
    <div class="d-btn d-down" data-keys='["ArrowDown","KeyS"]'>▼</div>
    <div class="d-btn d-left" data-keys='["ArrowLeft","KeyA"]'>◀</div>
    <div class="d-btn d-right" data-keys='["ArrowRight","KeyD"]'>▶</div>
  </div>
  <div class="action-area">
    <div class="a-btn" data-keys='[" ","Enter"]'>FIRE</div>
  </div>
</div>

<script>
// --- STANDARD LIBRARY INJECTION ---
${injection}

// --- ENGINE INITIALIZATION ---
// Initialize Audio Engine (Global Access)
const sfx = new RetroAudio();

// --- FOCUS MANAGEMENT ---
window.onload = () => {
    window.focus();
    document.getElementById('c').focus();
};
// Resume audio context on user interaction
const resumeAudio = () => {
    if (sfx) sfx.resume();
    window.focus();
    document.getElementById('c').focus();
};
window.onclick = resumeAudio;
window.onkeydown = resumeAudio;

// --- ERROR REPORTING ---
window.onerror = function(msg, url, line) {
  const el = document.getElementById('err');
  el.style.display = 'block';
  el.innerText = 'RUNTIME ERROR: ' + msg + ' (Line ' + line + ')';
  return false;
};

// --- ENGINE CORE ---
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// CRITICAL: Safe defaults to prevent 'non-finite' errors in iframes before layout
let width = 800;
let height = 600;

// Input System
const input = { 
  x: width / 2, // Start in center to prevent 0,0 math errors
  y: height / 2, 
  isDown: false, 
  keys: {} 
};
input.pointer = input;
input.mouse = input;

// Event Listeners (Desktop)
window.addEventListener('mousemove', e => { 
    // We store raw values here, but clamp them in the loop
    input.x = e.clientX; 
    input.y = e.clientY; 
});
window.addEventListener('mousedown', () => { input.isDown = true; window.focus(); });
window.addEventListener('mouseup', () => input.isDown = false);
window.addEventListener('keydown', e => input.keys[e.key] = true);
window.addEventListener('keyup', e => input.keys[e.key] = false);
window.addEventListener('keydown', e => input.keys[e.code] = true);
window.addEventListener('keyup', e => input.keys[e.code] = false);

// --- MOBILE TOUCH HANDLING ---
document.querySelectorAll('.d-btn, .a-btn').forEach(btn => {
  const keys = JSON.parse(btn.dataset.keys);
  
  const handleStart = (e) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    keys.forEach(k => input.keys[k] = true);
  };
  
  const handleEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    keys.forEach(k => input.keys[k] = false);
  };

  btn.addEventListener('touchstart', handleStart, {passive: false});
  btn.addEventListener('touchend', handleEnd, {passive: false});
  btn.addEventListener('mousedown', handleStart);
  btn.addEventListener('mouseup', handleEnd);
});

const touchHandler = (e) => {
  if (e.target !== canvas) return;
  e.preventDefault();
  
  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  
  input.x = touch.clientX - rect.left;
  input.y = touch.clientY - rect.top;
  
  if (e.type === 'touchstart' || e.type === 'touchmove') input.isDown = true;
  if (e.type === 'touchend') input.isDown = false;
};

canvas.addEventListener('touchstart', touchHandler, {passive: false});
canvas.addEventListener('touchmove', touchHandler, {passive: false});
canvas.addEventListener('touchend', touchHandler, {passive: false});


// Resize Handler (ResizeObserver for robust Iframe support)
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    // Check ContentRect for actual size
    const w = entry.contentRect.width;
    const h = entry.contentRect.height;
    if (w > 0 && h > 0) {
        width = canvas.width = w;
        height = canvas.height = h;
    }
  }
});
resizeObserver.observe(document.body);
// Initial trigger
width = canvas.width = window.innerWidth || 800;
height = canvas.height = window.innerHeight || 600;


// --- LOADER STRATEGY ---
let gameLogic;
const rawCode = ${serializedScript};

try {
  const fn = new Function(rawCode);
  gameLogic = fn();
  if (!gameLogic || typeof gameLogic !== 'object') {
     throw new Error("No object returned");
  }
} catch (e1) {
  if (e1.message !== "No object returned") {
     console.warn("Standard execution failed.", e1);
  }
  try {
    const fn = new Function("return (" + rawCode + ");");
    gameLogic = fn();
  } catch (e2) {
    document.getElementById('err').style.display = 'block';
    const primaryError = (e1 instanceof SyntaxError) ? e1 : e2;
    document.getElementById('err').innerText = 'SYNTAX ERROR: ' + primaryError.message;
    throw primaryError;
  }
}

// --- GAME LOOP ---
const state = {};
let lastTime = performance.now();

// Initial call safety check
if (gameLogic && gameLogic.init) {
  try {
    const safeW = (Number.isFinite(width) && width > 0) ? width : 800;
    const safeH = (Number.isFinite(height) && height > 0) ? height : 600;
    gameLogic.init(state, safeW, safeH);
  } catch (e) {
    console.error(e);
    window.onerror(e.message, null, null);
  }
}

function loop(timestamp) {
  // Cap dt to 0.05 (20fps) to prevent tunneling on lag spikes
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  try {
    // 1. HARDENED LOOP GUARD: If dimensions are invalid, skip frame to prevent NaN
    if (width <= 0 || height <= 0) {
        requestAnimationFrame(loop);
        return;
    }

    // 2. INPUT CLAMPING: Ensure inputs are always within finite bounds
    // This prevents NaN propagation if mouse coordinates are somehow invalid or undefined
    if (typeof input.x !== 'number') input.x = width / 2;
    if (typeof input.y !== 'number') input.y = height / 2;
    input.x = Math.max(0, Math.min(width, input.x));
    input.y = Math.max(0, Math.min(height, input.y));

    if (gameLogic && gameLogic.update) gameLogic.update(state, input, dt, width, height);
    if (gameLogic && gameLogic.draw) gameLogic.draw(state, ctx, width, height);
  } catch (e) {
    throw e;
  }
  
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
</script>
</body>
</html>
  `;
};