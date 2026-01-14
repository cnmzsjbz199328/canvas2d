import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the model
const SYSTEM_INSTRUCTION = `
You are an expert game developer agent specializing in HTML5 Canvas and pure JavaScript.
Your task is to generate single-file HTML games that are robust, performant, and visually pleasing.

RULES:
1. Output ONLY valid HTML code. No markdown backticks (e.g. \`\`\`html), no explanations before or after.
2. The entire game (CSS, HTML, JS) must be contained in a single file.
3. Use a window 'load' event listener or 'DOMContentLoaded' to ensure the script runs safely.
4. Implement a robust game loop using requestAnimationFrame.
5. Handle window resizing gracefully (update canvas width/height).
6. Ensure the game is playable with keyboard (Arrow keys/WASD) or Mouse depending on the genre.
7. Use 'Game' as a global namespace object if you need to store global state, but prefer closures.
8. Add comments explaining key parts of the logic.
9. Use a dark background (#111) for the canvas body by default unless specified otherwise.
10. If the user asks for a specific visual style (e.g. "retro", "neon"), apply it via CSS and Canvas rendering.
`;

export const generateGameCode = async (prompt: string): Promise<string> => {
  try {
    const fullPrompt = `Create a complete, single-file HTML5 Canvas game based on this description: "${prompt}". Ensure it has a score counter, game over state, and restart functionality.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for better coding capability
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        // Enable thinking to simulate agentic planning
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    let code = response.text || '';
    
    // Cleanup if model accidentally adds markdown
    code = code.replace(/```html/g, '').replace(/```/g, '');
    
    return code;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const iterateGameCode = async (currentCode: string, modificationPrompt: string): Promise<string> => {
  try {
    const fullPrompt = `
    Here is an existing HTML5 Canvas game code:
    
    ${currentCode}

    ---
    TASK: Modify the code above to fulfill this request: "${modificationPrompt}".
    Maintain the existing structure where possible but add the new features or fix the requested issues.
    Return the FULL updated HTML file. Do not return partial snippets.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5,
        // Enable thinking to simulate agentic planning
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    let code = response.text || '';
    code = code.replace(/```html/g, '').replace(/```/g, '');
    return code;

  } catch (error) {
    console.error("Gemini Iteration Error:", error);
    throw error;
  }
};