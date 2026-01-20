export const DEMO_SNAKE = `// --- ULTRA-LIGHT DATA RUNNER (DEMO MODE) ---
// No pathfinding, just scripted behaviors for visual effect

// Helper: Simple Maze Generator
function generateMaze(state) {
    state.obstacles = [];
    const COLS = state.cols;
    const ROWS = state.rows;
    
    // Create a few simple wall patterns
    for (let i = 0; i < 12; i++) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        const horizontal = Math.random() > 0.5;
        const length = 4 + Math.floor(Math.random() * 5);
        
        for (let j = 0; j < length; j++) {
            const px = horizontal ? x + j : x;
            const py = horizontal ? y : y + j;
            if (px < COLS && py < ROWS) {
                state.obstacles.push({ x: px, y: py });
            }
        }
    }
    
    // Build fast lookup
    state.obstacleMap = new Set();
    state.obstacles.forEach(o => {
        state.obstacleMap.add(\`\${o.x},\${o.y}\`);
    });
}

// Helper: Spawn packet
function spawnDataPacket(state) {
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * state.cols);
        const y = Math.floor(Math.random() * state.rows);
        const key = \`\${x},\${y}\`;
        
        if (!state.obstacleMap.has(key) && 
            !state.snakeMap.has(key) &&
            !state.dataPackets.some(p => p.x === x && p.y === y)) {
            state.dataPackets.push({ x, y });
            return;
        }
    }
}

// Scripted "AI" - just moves toward nearest packet with simple obstacle avoidance
function updateScriptedAI(state) {
    if (state.dataPackets.length === 0) return;
    
    const head = state.snake[0];
    
    // Find nearest packet
    let nearest = state.dataPackets[0];
    let minDist = 999;
    state.dataPackets.forEach(p => {
        const dist = Math.abs(p.x - head.x) + Math.abs(p.y - head.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = p;
        }
    });
    
    state.targetPacket = nearest;
    
    // Simple greedy movement with basic lookahead
    const dx = nearest.x - head.x;
    const dy = nearest.y - head.y;
    
    // Prefer moving on the axis with greater distance
    let preferredDirs = [];
    if (Math.abs(dx) > Math.abs(dy)) {
        preferredDirs = [
            { x: Math.sign(dx), y: 0 },
            { x: 0, y: Math.sign(dy) },
            { x: 0, y: -Math.sign(dy) }
        ];
    } else {
        preferredDirs = [
            { x: 0, y: Math.sign(dy) },
            { x: Math.sign(dx), y: 0 },
            { x: -Math.sign(dx), y: 0 }
        ];
    }
    
    // Add all cardinal directions as fallback
    preferredDirs.push(
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
    );
    
    // Try each direction in order
    for (const dir of preferredDirs) {
        const nx = head.x + dir.x;
        const ny = head.y + dir.y;
        const key = \`\${nx},\${ny}\`;
        
        // Check if valid
        if (nx >= 0 && nx < state.cols && 
            ny >= 0 && ny < state.rows &&
            !state.obstacleMap.has(key) &&
            !state.snakeMap.has(key)) {
            
            // Additional check: don't move into a corner if possible
            // Look ahead 2 steps to avoid traps
            const nnx = nx + dir.x;
            const nny = ny + dir.y;
            
            // Count available neighbors from next position
            let exits = 0;
            const checkDirs = [{x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];
            checkDirs.forEach(cd => {
                const cx = nx + cd.x;
                const cy = ny + cd.y;
                if (cx >= 0 && cx < state.cols && cy >= 0 && cy < state.rows &&
                    !state.obstacleMap.has(\`\${cx},\${cy}\`)) {
                    exits++;
                }
            });
            
            // If we have at least 2 exits, it's safe
            if (exits >= 2) {
                state.dir = dir;
                return;
            }
        }
    }
    
    // Desperate fallback: any valid move
    for (const dir of preferredDirs) {
        const nx = head.x + dir.x;
        const ny = head.y + dir.y;
        const key = \`\${nx},\${ny}\`;
        
        if (nx >= 0 && nx < state.cols && 
            ny >= 0 && ny < state.rows &&
            !state.obstacleMap.has(key) &&
            !state.snakeMap.has(key)) {
            state.dir = dir;
            return;
        }
    }
}

return {
    init: (state, width, height) => {
        state.GRID_SIZE = 20;
        state.cols = Math.floor(width / state.GRID_SIZE);
        state.rows = Math.floor(height / state.GRID_SIZE);
        
        const cx = Math.floor(state.cols / 2);
        const cy = Math.floor(state.rows / 2);
        state.snake = [
            {x:cx, y:cy}, 
            {x:cx-1, y:cy}, 
            {x:cx-2, y:cy}, 
            {x:cx-3, y:cy}
        ];
        
        state.dir = {x: 1, y: 0};
        state.obstacles = [];
        state.obstacleMap = new Set();
        state.snakeMap = new Set();
        state.dataPackets = [];
        state.collected = 0;
        state.hue = 180;
        state.moveSpeed = 0.12;
        state.timer = 0;
        state.targetPacket = null;
        state.frameCount = 0;
        state.gameOver = false;
        
        generateMaze(state);
        for (let i = 0; i < 5; i++) spawnDataPacket(state);
    },
    
    update: (state, input, dt) => {
        if (state.gameOver) return;
        
        state.timer += dt;
        state.frameCount++;
        
        if (state.timer >= state.moveSpeed) {
            state.timer = 0;
            
            // Update snake position map for collision checks
            state.snakeMap.clear();
            state.snake.forEach(s => {
                state.snakeMap.add(\`\${s.x},\${s.y}\`);
            });
            
            // Run simple scripted AI
            updateScriptedAI(state);
            
            const head = state.snake[0];
            const newHead = { 
                x: head.x + state.dir.x, 
                y: head.y + state.dir.y 
            };
            
            const newHeadKey = \`\${newHead.x},\${newHead.y}\`;
            
            // --- COLLISION LOGIC ---
            // 1. Wall Check
            const wallHit = newHead.x < 0 || newHead.x >= state.cols || 
                            newHead.y < 0 || newHead.y >= state.rows;
            
            // 2. Obstacle Check
            const obstacleHit = state.obstacleMap.has(newHeadKey);
            
            // 3. Self Check (Key check works because snakeMap was updated at start of tick)
            const selfHit = state.snakeMap.has(newHeadKey);

            if (wallHit || obstacleHit || selfHit) {
                state.gameOver = true;
                return;
            }
            
            state.snake.unshift(newHead);
            
            // Check if collected packet
            const pIndex = state.dataPackets.findIndex(
                p => p.x === newHead.x && p.y === newHead.y
            );
            
            if (pIndex !== -1) {
                state.dataPackets.splice(pIndex, 1);
                state.collected++;
                state.hue = (state.hue + 45) % 360;
                
                // Speed up slightly
                if (state.moveSpeed > 0.06) {
                    state.moveSpeed *= 0.97;
                }
                
                spawnDataPacket(state);
            } else {
                state.snake.pop();
            }
        }
        
        // Maintain packet count
        while (state.dataPackets.length < 5) {
            spawnDataPacket(state);
        }
    },
    
    draw: (state, ctx, width, height) => {
        const now = state.frameCount * 16;
        
        // Black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Minimal grid (every 5th line)
        ctx.strokeStyle = 'rgba(10, 20, 30, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= state.cols; x += 5) {
            ctx.beginPath();
            ctx.moveTo(x * state.GRID_SIZE, 0);
            ctx.lineTo(x * state.GRID_SIZE, height);
            ctx.stroke();
        }
        for (let y = 0; y <= state.rows; y += 5) {
            ctx.beginPath();
            ctx.moveTo(0, y * state.GRID_SIZE);
            ctx.lineTo(width, y * state.GRID_SIZE);
            ctx.stroke();
        }
        
        ctx.globalCompositeOperation = 'lighter';
        
        // Obstacles
        ctx.fillStyle = '#2a2a2a';
        state.obstacles.forEach(o => {
            ctx.fillRect(
                o.x * state.GRID_SIZE + 2, 
                o.y * state.GRID_SIZE + 2, 
                state.GRID_SIZE - 4, 
                state.GRID_SIZE - 4
            );
        });

        // Data packets
        state.dataPackets.forEach((p, i) => {
            const pulse = Math.sin(now * 0.005 + i) * 0.5 + 0.5;
            const isTarget = state.targetPacket && 
                           state.targetPacket.x === p.x && 
                           state.targetPacket.y === p.y;
            
            if (isTarget) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ffff00';
            }
            
            ctx.fillStyle = \`rgba(255, 255, 0, \${0.6 + pulse * 0.4})\`;
            
            const size = (state.GRID_SIZE - 10) * (0.5 + pulse * 0.5);
            const offset = (state.GRID_SIZE - size) / 2;
            
            ctx.fillRect(
                p.x * state.GRID_SIZE + offset, 
                p.y * state.GRID_SIZE + offset, 
                size, 
                size
            );
            
            if (isTarget) {
                ctx.shadowBlur = 0;
            }
        });

        // Snake
        state.snake.forEach((s, i) => {
            const alpha = 1 - (i / state.snake.length) * 0.5;
            
            if (i === 0) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = \`hsl(\${state.hue}, 100%, 50%)\`;
                ctx.fillStyle = \`hsla(\${state.hue}, 100%, 60%, \${alpha})\`;
                ctx.fillRect(
                    s.x * state.GRID_SIZE + 1, 
                    s.y * state.GRID_SIZE + 1, 
                    state.GRID_SIZE - 2, 
                    state.GRID_SIZE - 2
                );
                ctx.shadowBlur = 0;
            } else {
                if (i % 4 === 0) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = \`hsl(\${state.hue}, 100%, 50%)\`;
                }
                
                ctx.fillStyle = \`hsla(\${state.hue}, 100%, 50%, \${alpha})\`;
                ctx.fillRect(
                    s.x * state.GRID_SIZE + 3, 
                    s.y * state.GRID_SIZE + 3, 
                    state.GRID_SIZE - 6, 
                    state.GRID_SIZE - 6
                );
                
                if (i % 4 === 0) {
                    ctx.shadowBlur = 0;
                }
            }
        });

        ctx.globalCompositeOperation = 'source-over';
        
        // UI
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('◉ PATHFINDING_ACTIVE', 40, 40);
        
        ctx.fillStyle = 'rgba(74, 222, 128, 0.8)'; 
        ctx.font = '13px monospace';
        ctx.fillText(\`▸ DATA_COLLECTED: \${state.collected}\`, 40, 62);
        
        ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
        ctx.fillText(\`▸ STREAM_LENGTH: \${state.snake.length}\`, 40, 79);
        
        // FAILURE OVERLAY
        if (state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, width, height);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('✖ SYSTEM FAILURE', width / 2, height / 2);
            
            ctx.font = '14px monospace';
            ctx.fillStyle = '#ffaaaa';
            ctx.fillText('COLLISION DETECTED // STREAM SEVERED', width / 2, height / 2 + 25);
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
        } else {
             ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
             ctx.font = '11px monospace';
             ctx.textAlign = 'right';
             ctx.fillText('A*_ALGORITHM // AUTO_NAVIGATE', width - 20, height - 20);
             ctx.textAlign = 'left';
        }
    }
}
`;

export const getRandomDemo = () => {
    return DEMO_SNAKE;
};
// --- END OF FILE ---