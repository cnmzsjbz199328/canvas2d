import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AGENT PROMPTS ---

const DESIGNER_SYSTEM_PROMPT = `
You are a Lead Game Designer for a Retro Arcade Engine.
Your goal is to take a simple user request and expand it into a Creative Game Concept.

CONSTRAINTS:
1. **Pure Canvas 2D**: NO HTML Elements (buttons, inputs, divs). Everything must be drawn on screen.
2. **Procedural Assets**: NO external images or sounds. All visuals must be drawn with shapes (rects, arcs, paths).
3. **Controls**: Optimized for Keyboard (Arrows/WASD) and Mouse (Click/Aim).

Output a concise design document:
1. Game Title (Catchy)
2. Core Mechanics (Input & Rules)
3. Visual Style (Neon, Pixel, Minimalist, etc.)
4. Unique Twist (Power-ups, Scoring, Physics)
`;

const ARCHITECT_SYSTEM_PROMPT = `
You are a Software Architect for a specific HTML5 Canvas Sandbox.
Your input is a "Game Concept". 
Your output is a TECHNICAL SPECIFICATION for the Engineer.

--- SANDBOX CONTRACT (STRICT) ---
1. **Environment**: A single full-screen <canvas>.
2. **Input Object**: 
   - \`input.x\`, \`input.y\` (Mouse coordinates).
   - \`input.isDown\` (Mouse button Boolean).
   - \`input.keys\` (Object map: e.g., \`{'ArrowUp': true, ' ': true}\`).
3. **Game Loop**: 
   - \`update(state, input, dt)\`: \`dt\` is delta time in SECONDS (e.g., 0.016).
4. **State**: Must contain \`width\` and \`height\` to handle window resizing.
-----------------------------------

Define:
1. The 'state' object structure.
2. Helper Functions list (Math helpers, Collision checks).
3. The Logic Flow for 'update' (Movement, Physics, Win/Loss conditions).
4. The Logic Flow for 'draw' (Render order, Shapes, **REQUIRED: On-screen Instructions**).

DO NOT write code. Write structure and requirements.
`;

const ENGINEER_SYSTEM_PROMPT = `
You are an expert Game Engineer.
Implement the provided SPEC into a raw JavaScript object for the Sandbox Engine.

--- ENGINE API ---
1. **Return Object**:
   return {
     init: (state, width, height) => { ... },
     update: (state, input, dt) => { ... }, // dt is in Seconds
     draw: (state, ctx, width, height) => { ... }
   };

2. **Rules**:
   - **NO HTML/DOM**: Do not create <div>, <button>, or use document.getElementById.
   - **NO External Assets**: Use ctx.fillRect, ctx.arc, ctx.lineTo.
   - **NO 'this'**: Use 'state' for all persistent data.
   - **Resizing**: Update state.width/height in \`init\`. 
   - **Restart**: Implement a soft restart inside \`update\` (e.g., if gameOver && input.isDown -> reset state).

3. **Input Handling**:
   - Keyboard: \`if (input.keys['ArrowUp'] || input.keys['KeyW']) ...\`
   - Mouse: \`state.player.x = input.x;\`

4. **UX Requirement**:
   - The game MUST draw text instructions on the screen (e.g., "WASD to Move", "Click to Start") in the \`draw\` function so the user knows how to play.
`;

// --- HELPERS ---

const validateCode = (code: string): string[] => {
  const errors: string[] = [];
  const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  if (/\bthis\./.test(cleanCode)) {
    errors.push("Forbidden usage of 'this' keyword detected. Use 'state' or local variables.");
  }
  if (!cleanCode.includes('return {') || !cleanCode.includes('init:') || !cleanCode.includes('update:') || !cleanCode.includes('draw:')) {
    errors.push("Code must return an object with init, update, and draw methods.");
  }
  const drawIndex = cleanCode.indexOf('draw:');
  if (drawIndex !== -1) {
    const drawBlock = cleanCode.slice(drawIndex);
    if (/\binput\./.test(drawBlock)) {
      errors.push("MVC Violation: 'input' accessed inside 'draw' function. Move input logic to 'update'.");
    }
  }
  if (/document\.create/.test(cleanCode) || /document\.get/.test(cleanCode)) {
    errors.push("DOM Manipulation detected. Use Canvas API only (ctx.fillRect, etc).");
  }
  if (/window\.addEventListener/.test(cleanCode)) {
    errors.push("Event Listeners detected. Use the provided 'input' object in the update loop.");
  }

  return errors;
};

// --- AGENT FUNCTIONS ---

/**
 * AGENT 1: DESIGNER
 * Model: gemini-flash-lite-latest
 */
async function runDesignerAgent(userPrompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: `User Request: "${userPrompt}"\n\nCreate a game design.`,
    config: {
      systemInstruction: DESIGNER_SYSTEM_PROMPT,
      temperature: 0.7, // Higher creativity
    }
  });
  return response.text || "Design failed.";
}

/**
 * AGENT 2: ARCHITECT
 * Model: gemini-3-flash-preview
 */
async function runArchitectAgent(designDoc: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this design, create a Technical Spec:\n\n${designDoc}`,
    config: {
      systemInstruction: ARCHITECT_SYSTEM_PROMPT,
      temperature: 0.2, // Structural precision
    }
  });
  return response.text || "Spec failed.";
}

/**
 * AGENT 3: ENGINEER
 * Model: gemini-3-flash-preview (Updated from Pro to Flash for speed + thinking)
 */
async function runEngineerAgent(spec: string, onStatusUpdate?: (s: string) => void): Promise<string> {
  let currentPrompt = `Implement this Spec:\n\n${spec}`;
  let attempts = 0;
  const MAX_RETRIES = 2;

  while (attempts <= MAX_RETRIES) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: currentPrompt,
        config: {
          systemInstruction: ENGINEER_SYSTEM_PROMPT,
          temperature: 0.5,
          thinkingConfig: { thinkingBudget: 2048 } // Flash supports thinking too!
        }
      });

      let code = response.text || '';
      code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();

      const errors = validateCode(code);
      if (errors.length === 0) return code;

      attempts++;
      if (attempts > MAX_RETRIES) return code;

      if (onStatusUpdate) onStatusUpdate(`Self-Correcting Architecture (Attempt ${attempts})...`);
      
      currentPrompt = `Here is the broken code:\n${code}\n\nFIX ERRORS:\n${errors.join('\n')}`;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  return "";
}

// --- ORCHESTRATOR ---

export const orchestrateGameGeneration = async (
  userPrompt: string, 
  onStageChange: (stage: string, content?: string) => void
): Promise<string> => {

  // 1. Designer
  onStageChange('designing');
  const designDoc = await runDesignerAgent(userPrompt);
  onStageChange('design_complete', designDoc);

  // 2. Architect
  onStageChange('architecting');
  const techSpec = await runArchitectAgent(designDoc);
  onStageChange('architect_complete', techSpec);

  // 3. Engineer
  onStageChange('coding');
  const code = await runEngineerAgent(techSpec, (status) => onStageChange('coding_status', status));
  
  return code;
};

// Keep the old function for "Optimize" and "Iterate" requests, 
// as those are direct modifications to existing code and don't need a full redesign loop.
export const iterateGameCode = async (currentCode: string, modificationPrompt: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const fullPrompt = `
    Here is the existing game logic:
    ${currentCode}
    ---
    TASK: "${modificationPrompt}".
    Return the FULL updated JavaScript code.
    CRITICAL: Ensure strict adherence to the NO 'this' keyword rule.
    `;
    // We reuse the engineer logic but with a direct modification prompt
    return runEngineerAgent(fullPrompt, onStatusUpdate);
};