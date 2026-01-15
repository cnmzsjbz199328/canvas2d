import React, { useMemo } from 'react';

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

  // Otherwise, inject the script into our Engine Harness
  return `
<!DOCTYPE html>
<html>
<head>
<style>
  body { margin: 0; overflow: hidden; background: #050505; color: #fff; font-family: monospace; }
  canvas { display: block; }
  #err { position: fixed; top: 10px; left: 10px; color: #ff5555; background: rgba(0,0,0,0.8); padding: 10px; display: none; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="err"></div>
<script>
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

// Event Listeners
window.addEventListener('mousemove', e => { input.x = e.clientX; input.y = e.clientY; });
window.addEventListener('mousedown', () => input.isDown = true);
window.addEventListener('mouseup', () => input.isDown = false);
window.addEventListener('keydown', e => input.keys[e.code] = true);
window.addEventListener('keyup', e => input.keys[e.code] = false);

// Resize Handler
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- INJECT AI SCRIPT ---
// We wrap the object in parentheses to ensure it evaluates as an expression
let gameLogic;
try {
  gameLogic = (${aiScript});
} catch (e) {
  document.getElementById('err').style.display = 'block';
  document.getElementById('err').innerText = 'SYNTAX ERROR: ' + e.message;
  throw e;
}

// --- GAME LOOP ---
const state = {};
let lastTime = performance.now();

// Initialize
if (gameLogic.init) {
  try {
    gameLogic.init(state, width, height);
  } catch (e) {
    console.error(e);
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap dt at 0.1s
  lastTime = timestamp;

  if (gameLogic.update) gameLogic.update(state, input, dt);
  
  // Clear screen if not handled by game, but usually game draws bg
  // ctx.clearRect(0, 0, width, height);
  
  if (gameLogic.draw) gameLogic.draw(state, ctx, width, height);
  
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

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
      <div className="w-full h-full relative">
        <iframe
          title="Game Preview"
          srcDoc={srcDoc}
          className="w-full h-full border-none block"
          sandbox="allow-scripts allow-modals allow-pointer-lock"
        />
        {/* Overlay hint */}
        <div className="absolute bottom-4 right-4 pointer-events-none opacity-30 hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-zinc-500 bg-black/80 px-2 py-1 rounded border border-zinc-800">
            ENGINE: ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};
