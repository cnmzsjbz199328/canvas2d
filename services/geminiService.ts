import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the model
const SYSTEM_INSTRUCTION = `
You are an expert game developer agent specializing in HTML5 Canvas.
Your task is to generate the LOGIC for a 2D game engine.

ARCHITECTURAL RULES:
1. DO NOT output HTML. Output ONLY a valid JavaScript object literal.
2. The object MUST strictly adhere to this interface:
   {
     // Called once at startup. Use this to set up state.
     init: (state, width, height) => { ... },
     
     // Called every frame. 'dt' is delta time in seconds. 'input' contains { x, y, isDown, keys: { Code: bool } }.
     update: (state, input, dt) => { ... },
     
     // Called every frame after update. Use 'ctx' to draw.
     draw: (state, ctx, width, height) => { ... }
   }
3. 'state' is an empty object passed to init. Store ALL game state (player, enemies, score) inside 'state'.
4. Do NOT use global variables (window.x). Everything must be in 'state'.
5. Do NOT use requestAnimationFrame or event listeners. The host engine handles the loop and input.
6. For colors, use bright "Neon" hex codes by default.
7. Return raw JavaScript code. Do not wrap in markdown \`\`\`.
`;

export const generateGameCode = async (prompt: string): Promise<string> => {
  try {
    const fullPrompt = `Create a new game: "${prompt}". Return the Javascript Logic Object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    let code = response.text || '';
    
    // Cleanup
    code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '');
    
    return code.trim();
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const iterateGameCode = async (currentCode: string, modificationPrompt: string): Promise<string> => {
  try {
    const fullPrompt = `
    Here is the existing game logic:
    
    ${currentCode}

    ---
    TASK: "${modificationPrompt}".
    Return the FULL updated JavaScript object. Do not return partial snippets.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    let code = response.text || '';
    code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '');
    return code.trim();

  } catch (error) {
    console.error("Gemini Iteration Error:", error);
    throw error;
  }
};
