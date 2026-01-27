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
2. **Procedural Assets**: NO external images. All visuals must be drawn with shapes.
3. **Controls**: Optimized for Keyboard (Arrows/WASD) and Mouse (Click/Aim).
4. **Audio**: Plan for sound effects (Shoot, Hit, Jump, Collect, Explosion).

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
5. **Globals**: 
   - \`Vector\` class is provided (Mutable/Chainable).
   - \`COLORS\` object is provided.
   - \`sfx\` object is provided (Audio).
-----------------------------------

Define:
1. The 'state' object structure.
2. Helper Functions list (Math helpers, Collision checks).
   *NOTE: Do not specify a Vector class, it is built-in.*
3. The Logic Flow for 'update' (Movement, Physics, Win/Loss conditions).
   *IMPORTANT: Specify where to play sound effects (e.g., "Play 'shoot' sound on fire").*
4. The Logic Flow for 'draw' (Render order, Shapes, **REQUIRED: On-screen Instructions**).
   *NOTE: Do not use input logic here. Only rendering based on state.*

DO NOT write code. Write structure and requirements.
`;

const ENGINEER_SYSTEM_PROMPT = `
You are an expert Game Engineer.
Implement the provided SPEC into a raw JavaScript object for the Sandbox Engine (v2.0).

--- OUTPUT FORMAT ---
You must output the response in this EXACT format:
TITLE: [Game Title]
DESCRIPTION: [1 sentence summary]
CODE:
\`\`\`javascript
// code here...
\`\`\`

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

3. **Core Classes (Conditional Injection)**:
   - **Vector**: Available globally. **Mutable & Chainable**.
     *   API: \`set(x,y)\`, \`add(v)\`, \`sub(v)\`, \`mult(s)\`, \`div(s)\`, \`mag()\`, \`limit(max)\`, \`normalize()\`, \`heading()\`, \`rotate(rad)\`, \`lerp(v, t)\`, \`dist(v)\`, \`copy()\`.
     *   *Example*: \`pos.add(vel)\` modifies \`pos\` in place. Use \`copy()\` if you need to preserve original.
   - **COLORS**: Available globally: \`{ BG, PLAYER, ENEMY, ACCENT, TEXT }\`.
   - **sfx**: Available globally for Audio.
     *   API: \`sfx.play(type)\`
     *   Types: \`'shoot'\`, \`'hit'\`, \`'jump'\`, \`'collect'\`, \`'explosion'\`.
     *   *Usage*: Call inside \`update\` when an event occurs.

4. **CRITICAL: State Management**:
   - **NO Global State**: Do NOT define a top-level \`const state = ...\`. The \`state\` object is passed into \`init\`.
   - **Initialization**: You MUST initialize ALL game variables (arrays, player, score, etc.) INSIDE the \`init\` function attached to the \`state\` argument.

5. **Input Handling**:
   - Keyboard: \`if (input.keys['ArrowUp'] || input.keys['KeyW']) ...\`
   - Mouse: \`state.player.x = input.x;\`

6. **UX Requirement**:
   - The game MUST draw text instructions on the screen (e.g., "WASD to Move", "Click to Start") in the \`draw\` function so the user knows how to play.

7. **Strict MVC Separation**:
   - **NEVER** use \`input\` inside the \`draw\` function.
   - Perform all hover/click detection in \`update\`.
   - Store visual states (e.g., \`state.isHovered\`) in \`state\`.
   - \`draw\` should ONLY render based on \`state\`.
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
  
  // MVC Validation
  const drawIndex = cleanCode.indexOf('draw:');
  if (drawIndex !== -1) {
    const drawBlock = cleanCode.slice(drawIndex);
    if (/\binput\./.test(drawBlock)) {
      errors.push("MVC Violation: 'input' accessed inside 'draw' function. You MUST move interaction logic (hover/click) to 'update' and store the result in 'state'.");
    }
  }

  // State Definition Validation (New)
  if (/const\s+state\s*=\s*{/.test(cleanCode) || /let\s+state\s*=\s*{/.test(cleanCode)) {
      errors.push("Global 'state' definition detected. You must initialize properties INSIDE the 'init' function using the provided 'state' argument.");
  }

  if (/document\.create/.test(cleanCode) || /document\.get/.test(cleanCode)) {
    errors.push("DOM Manipulation detected. Use Canvas API only (ctx.fillRect, etc).");
  }
  if (/window\.addEventListener/.test(cleanCode)) {
    errors.push("Event Listeners detected. Use the provided 'input' object in the update loop.");
  }

  return errors;
};

interface GeneratedGame {
    code: string;
    title: string;
    description: string;
}

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
async function runEngineerAgent(spec: string, onStatusUpdate?: (s: string) => void): Promise<GeneratedGame> {
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

      const rawText = response.text || '';
      
      // PARSE RESPONSE (Sandbox 2.0 Format)
      const titleMatch = rawText.match(/TITLE:\s*(.+)/);
      const descMatch = rawText.match(/DESCRIPTION:\s*(.+)/);
      const codeMatch = rawText.match(/CODE:\s*```(?:javascript|js)?\s*([\s\S]*?)```/);
      
      let code = '';
      if (codeMatch && codeMatch[1]) {
          code = codeMatch[1].trim();
      } else {
          // Fallback for malformed output: try to find the code block anyway
          code = rawText.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
          // Remove metadata headers if they exist in the raw dump
          code = code.replace(/TITLE:.*\n/, '').replace(/DESCRIPTION:.*\n/, '');
      }

      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Game';
      const description = descMatch ? descMatch[1].trim() : 'Generated by Canvas 2D Engine';

      const errors = validateCode(code);
      if (errors.length === 0) {
          return { code, title, description };
      }

      attempts++;
      if (attempts > MAX_RETRIES) {
          return { code, title, description };
      }

      if (onStatusUpdate) onStatusUpdate(`Self-Correcting Architecture (Attempt ${attempts})...`);
      
      currentPrompt = `Here is the broken code:\n${code}\n\nFIX ERRORS:\n${errors.join('\n')}`;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  return { code: "", title: "Error", description: "Failed to generate" };
}

// --- ORCHESTRATOR ---

export const orchestrateGameGeneration = async (
  userPrompt: string, 
  onStageChange: (stage: string, content?: string) => void
): Promise<GeneratedGame> => {

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
  const result = await runEngineerAgent(techSpec, (status) => onStageChange('coding_status', status));
  
  return result;
};

export const iterateGameCode = async (currentCode: string, modificationPrompt: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const fullPrompt = `
    Here is the existing game logic:
    ${currentCode}
    ---
    TASK: "${modificationPrompt}".
    Return the FULL updated JavaScript code.
    CRITICAL: Ensure strict adherence to the NO 'this' keyword rule.
    Output ONLY the code block.
    `;
    
    // We reuse the engineer logic but with a direct modification prompt
    // Note: Iterate loop doesn't strictly follow the TITLE/DESCRIPTION format for now, 
    // it usually just returns code. We wrap it to match signature.
    
    // Reuse specific call for iteration (simpler prompt usually yields simpler output)
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
        config: { temperature: 0.5, thinkingConfig: { thinkingBudget: 1024 } }
    });
    
    let code = response.text || '';
    code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
    // remove any markdown text that might have leaked
    code = code.replace(/TITLE:.*\n/, '').replace(/DESCRIPTION:.*\n/, '');
    
    return code;
};