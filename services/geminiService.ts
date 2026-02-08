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

--- 🔒 SANDBOX CONSTITUTION (NON-NEGOTIABLE) ---
1. **ENVIRONMENT**: 
   - Code runs in a strict \`new Function()\` sandbox.
   - **NO** access to \`window\`, \`document\`, or DOM (e.g. \`document.createElement\` is BANNED).
   - **NO** external libraries (p5.js, Three.js are NOT available).
   
2. **PROGRAMMING PARADIGM**:
   - **PURE FUNCTIONAL**: Use Factory Functions (returning Plain Objects) instead of Classes.
   - **NO 'THIs'**: The \`this\` keyword is BANNED (context is unstable). Use \`state\` passed as argument.
   - **NO GLOBAL VARS**: All mutable data MUST live inside the \`state\` object.

3. **API INJECTION (CLOSED LIST)**:
   The Sandbox injects EXACTLY these global tools. **DO NOT ASSUME OTHERS EXIST.**

   **A. Vector API (Static Methods Only)**:
   - \`Vector.add(v1, v2)\`, \`Vector.sub(v1, v2)\`, \`Vector.mult(v, n)\`, \`Vector.div(v, n)\`
   - \`Vector.distance(v1, v2)\`, \`Vector.dist(v1, v2)\`
   - \`Vector.mag(v)\`, \`Vector.magSq(v)\`, \`Vector.normalize(v)\`, \`Vector.setMag(v, n)\`, \`Vector.limit(v, max)\`
   - \`Vector.heading(v)\`, \`Vector.rotate(v, angle)\`, \`Vector.angleBetween(v1, v2)\`
   - \`Vector.lerp(v1, v2, amt)\`
   - \`Vector.dot(v1, v2)\`, \`Vector.cross(v1, v2)\`
   - \`Vector.random2D()\`, \`Vector.fromAngle(angle, len)\`
   
   *⚠️ WARNING: Instance methods (e.g. \`v.add()\`) are BANNED. Use \`state.pos = Vector.add(state.pos, vel)\`.*

   **B. COLORS**:
   - \`{ BG, PLAYER, ENEMY, ACCENT, TEXT }\`

   **C. AUDIO (sfx)**:
   - \`sfx.play('shoot' | 'hit' | 'jump' | 'collect' | 'explosion')\`

-----------------------------------

Define:
1. **State Schema**: Detailed JSON structure (Must use \`Vector\` for pos/vel).
2. **Helper Functions**: Logic utilizing ONLY the allowed Vector API.
3. **Update Logic**: Detailed steps using \`state\` and \`input\`.
4. **Draw Logic**: Rendering using standard \`ctx\` methods (fillRect, arc, etc.).

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

--- 🛡️ SANDBOX EXECUTION RULES ---

1. **STRICT ISOLATION**:
   - You are running in a \`new Function\` scope.
   - **DO NOT** use \`this\`. Use the provided \`state\` argument.
   - **DO NOT** create Classes (\`class Player {}\`). Use Factory Functions (\`const createPlayer = () => ({...})\`).

2. **API WHITELIST (CRITICAL)**:
   - **Vector**: YOU MUST USE STATIC METHODS ONLY.
     - ✅ \`state.pos = Vector.add(state.pos, state.vel)\`
     - ❌ \`state.pos.add(state.vel)\` (CRASHES)
     - ❌ \`Vector.clone(v)\` (NOT IN LIST -> Use \`new Vector(v.x, v.y)\`)
   
   - **Globals provided**: \`Vector\` (Static), \`COLORS\` (Hex codes), \`sfx\`. DO NOT define them.

3. **STATE MANAGEMENT**:
   - Initialize ALL state in \`init(state, w, h)\`.
   - \`state\` is your ONLY persistent memory.

4. **GAME LOOP INTERFACE**:
   return {
     init: (state, width, height) => { ... },
     update: (state, input, dt, width, height) => { ... }, // dt is in Seconds
     draw: (state, ctx, width, height) => { ... }
   };

5. **RULES**:
   - **NO HTML/DOM**: Do not create <div>, <button>, or use document.getElementById.
   - **NO External Assets**: Use ctx.fillRect, ctx.arc, ctx.lineTo.
   - **Input Handling**: 
     - Keyboard: \`if (input.keys['ArrowUp'])\`
     - Mouse: \`input.x\`, \`input.y\`, \`input.isDown\`
   - **UX**: Draw text instructions in \`draw\`.
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

    ⚠️ **SANDBOX COMPLIANCE CHECK**:
    1. **Verify Vector API**: Are you using ANY instance methods (e.g. \`v.add()\`)? -> **REWRITE** using \`Vector.add(v, ...)\`.
    2. **Verify 'this'**: Did you introduce a Class or \`this\`? -> **REFACTOR** to pure functions.
    3. **Verify Globals**: Did you define top-level vars? -> **MOVE** to \`state\`.

    Return the FULL updated JavaScript code block.
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
