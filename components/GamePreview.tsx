import React, { useMemo, useRef, useEffect } from 'react';

interface GamePreviewProps {
  code: string;
}

/**
 * The HOST TEMPLATE is the fixed engine code that runs the variable AI script.
 * It handles:
 * 1. Canvas setup & Resizing
 * 2. Input normalization (Mouse/Touch/Keyboard)
 * 3. Game Loop (requestAnimationFrame)
 * 4. Error handling
 */
const createHostHTML = (aiScript: string) => {
  // If the code is already a full HTML document (legacy/database support), return it as is.
  if (aiScript.trim().startsWith('<!DOCTYPE html>') || aiScript.trim().startsWith('<html')) {
    return aiScript;
  }

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
// --- FOCUS MANAGEMENT ---
// Critical for keyboard events to work immediately
window.onload = () => {
    window.focus();
    document.getElementById('c').focus();
};
window.onclick = () => {
    window.focus();
    document.getElementById('c').focus();
};

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
let width, height;

// Input System
const input = { 
  x: 0, 
  y: 0, 
  isDown: false, 
  keys: {} 
};
input.pointer = input;
input.mouse = input;

// Event Listeners (Desktop)
window.addEventListener('mousemove', e => { input.x = e.clientX; input.y = e.clientY; });
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


// Resize Handler
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

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

if (gameLogic && gameLogic.init) {
  try {
    gameLogic.init(state, width, height);
  } catch (e) {
    console.error(e);
    window.onerror(e.message, null, null);
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  try {
    if (gameLogic && gameLogic.update) gameLogic.update(state, input, dt);
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

export const GamePreview: React.FC<GamePreviewProps> = ({ code }) => {
  const srcDoc = useMemo(() => createHostHTML(code), [code]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-focus when code changes (new game generated)
  useEffect(() => {
    const focusIframe = () => {
      if (iframeRef.current) {
        iframeRef.current.focus();
        // Also try to focus internal window
        iframeRef.current.contentWindow?.focus();
      }
    };
    
    // Slight delay to ensure DOM is ready
    const timer = setTimeout(focusIframe, 100);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="w-full h-full relative holo-container bg-black group">
      {/* 1. HOLO GRID FLOOR */}
      <div className="holo-floor z-0 opacity-40"></div>
      
      {/* 2. ATMOSPHERIC GLOW */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-transparent pointer-events-none"></div>

      {/* 3. IFRAME (Transparent background allows grid to show through) */}
      <div className="w-full h-full relative z-10">
        <iframe
          ref={iframeRef}
          title="Game Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-none block"
          style={{ background: 'transparent' }} 
          sandbox="allow-scripts allow-modals allow-pointer-lock allow-same-origin"
        />
        
        {/* Overlay hint */}
        <div className="absolute top-4 left-4 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
           <div className="flex flex-col gap-2">
              <span className="text-[10px] text-zinc-500 bg-black/80 px-2 py-1 rounded border border-zinc-800 backdrop-blur-sm">
                ENGINE: HYBRID
              </span>
              <span className="text-[10px] text-emerald-500 bg-black/80 px-2 py-1 rounded border border-emerald-500/20 animate-pulse backdrop-blur-sm">
                CLICK TO FOCUS
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};