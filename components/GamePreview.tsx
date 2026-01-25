import React, { useMemo, useRef, useEffect } from 'react';

interface GamePreviewProps {
  code: string;
}

// --- STANDARD LIBRARY V2.1 ---
// Injected only if the user code doesn't define them.

const STANDARD_LIB_COLORS = `
const COLORS = { 
    BG: '#050505', 
    PLAYER: '#00ffff', 
    ENEMY: '#ff3366', 
    ACCENT: '#ffcc00', 
    TEXT: '#ffffff' 
};
`;

const STANDARD_LIB_VECTOR = `
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    // Basic Arithmetic
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    
    multiply(s) { this.x *= s; this.y *= s; return this; }
    mult(s) { return this.multiply(s); } // Alias for AI consistency
    multiplyScalar(s) { return this.multiply(s); }
    scale(s) { return this.multiply(s); }
    
    divide(s) { if (s !== 0) { this.x /= s; this.y /= s; } return this; }
    div(s) { return this.divide(s); } // Alias for AI consistency

    // Magnitude & Normalization
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magSq() { return this.x * this.x + this.y * this.y; }
    
    normalize() { 
        const m = this.mag(); 
        if (m > 0) this.divide(m); 
        return this; 
    }
    
    setMag(n) { return this.normalize().multiply(n); }
    limit(max) { if (this.magSq() > max * max) this.setMag(max); return this; }
    
    // Direction & Rotation
    heading() { return Math.atan2(this.y, this.x); }
    rotate(angle) {
        const newHeading = this.heading() + angle;
        const mag = this.mag();
        this.x = Math.cos(newHeading) * mag;
        this.y = Math.sin(newHeading) * mag;
        return this;
    }

    // Relationship
    dist(v) { 
        const dx = this.x - v.x; 
        const dy = this.y - v.y; 
        return Math.sqrt(dx * dx + dy * dy); 
    }
    distSq(v) {
        const dx = this.x - v.x; 
        const dy = this.y - v.y; 
        return dx * dx + dy * dy;
    }
    
    dot(v) { return this.x * v.x + this.y * v.y; }
    cross(v) { return this.x * v.y - this.y * v.x; }
    
    angleBetween(v) {
        const dot = this.dot(v);
        const val = Math.max(-1, Math.min(1, dot / (this.mag() * v.mag())));
        return Math.acos(val);
    }
    
    lerp(v, amt) {
        this.x += (v.x - this.x) * amt;
        this.y += (v.y - this.y) * amt;
        return this;
    }

    copy() { return new Vector(this.x, this.y); }
    
    // Static Utilities
    static distance(v1, v2) { return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2)); }
    static add(v1, v2) { return new Vector(v1.x + v2.x, v1.y + v2.y); }
    static sub(v1, v2) { return new Vector(v1.x - v2.x, v1.y - v2.y); }
    static random2D() { const a = Math.random() * Math.PI * 2; return new Vector(Math.cos(a), Math.sin(a)); }
    static fromAngle(angle, length = 1) { return new Vector(length * Math.cos(angle), length * Math.sin(angle)); }
}
`;

const STANDARD_LIB_GAMEOBJECT = `
class GameObject {
    constructor(x, y, radius = 10, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.active = true;
        this.velocity = new Vector(0, 0);
    }
    
    update(dt, state, w, h) {
        if (!this.active) return;
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
    }
    
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
`;

/**
 * The HOST TEMPLATE is the fixed engine code that runs the variable AI script.
 * It handles:
 * 1. Canvas setup & Resizing
 * 2. Input normalization (Mouse/Touch/Keyboard)
 * 3. Conditional Injection (Sandbox 2.0)
 * 4. Game Loop (requestAnimationFrame)
 * 5. Error handling
 */
const createHostHTML = (aiScript: string) => {
  // If the code is already a full HTML document (legacy/database support), return it as is.
  if (aiScript.trim().startsWith('<!DOCTYPE html>') || aiScript.trim().startsWith('<html')) {
    return aiScript;
  }

  // --- SANDBOX 2.0 CONDITIONAL INJECTION ---
  const hasVector = /class\s+Vector\b/.test(aiScript);
  const hasColors = /const\s+COLORS\b/.test(aiScript);
  const hasGameObject = /class\s+GameObject\b/.test(aiScript);
  
  let injection = "";
  if (!hasColors) injection += STANDARD_LIB_COLORS;
  if (!hasVector) injection += STANDARD_LIB_VECTOR;
  // Fallback: If AI uses GameObject but forgets to define it, we provide it.
  if (!hasGameObject) injection += STANDARD_LIB_GAMEOBJECT;

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

// --- FOCUS MANAGEMENT ---
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
                ENGINE: SANDBOX 2.0
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