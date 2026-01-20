# Canvas 2D Game Generator (GenAI Native)

> **Status:** Active / Experimental
> **Engine:** Google Gemini 3 (Flash Lite + Flash Preview)
> **Stack:** React 19, Tailwind, Neon Serverless Postgres

## 1. Project Overview

**Canvas 2D Game Generator** is a natural language interface that turns text descriptions into playable HTML5 Canvas games in seconds. It leverages a **Multi-Agent System** to break down complex game requests into structured design documents, technical specifications, and finally, executable JavaScript code.

The application features a "Cyberpunk / Retro-Terminal" aesthetic, complete with a self-playing "Attract Mode" (AI Snake), global leaderboards, and code transparency.

---

## 2. Core Features

### 🎮 Multi-Agent Orchestration
Instead of a single prompt, the system uses a pipeline of specialized agents:
1.  **Designer Agent (Flash Lite)**: Brainstorms mechanics, visual style, and "fun factors."
2.  **Architect Agent (3-Flash)**: Converts the design into a strict Technical Specification (JSON structure, State management).
3.  **Engineer Agent (3-Flash)**: Writes the actual implementation using a "Thinking Budget" to solve complex logic before coding.

### ⚡ The "Host Engine" Architecture
To ensure performance and security, games are **not** generated as full HTML files.
*   **The Host**: A fixed React component (`GamePreview`) that handles the DOM, `requestAnimationFrame`, and Input Normalization (Mouse/Touch/Keyboard).
*   **The Script**: The AI generates *only* a standardized JS object (`{ init, update, draw }`).
*   **Hot Reloading**: The engine injects the new script into a sandboxed `iframe` instantly.

### 💾 Persistence & Community
*   **Neon Serverless DB**: Stores game code and metadata.
*   **Global Leaderboard**: Browse, play, and "Like" games created by others.
*   **Optimization Loop**: Users can ask the AI to "Iterate" or "Optimize" an existing game (e.g., "Make the player faster", "Add particle effects").

---

## 3. UI/UX & Motion Design

### 🚀 Recording-Friendly Intro Sequence
To support high-quality content creation and screen recording, the boot sequence uses an **oversized typography** system:

*   **Logging Phase**: Uses `text-xl` (20px+) for terminal logs, ensuring technical text is legible even on compressed video streams.
*   **Title Phase**: The main brand header scales to `text-8xl` (96px+) with a high-contrast white/emerald color palette.
*   **Glitch Layer**: A `clip-path` based CSS animation simulates visual interference without affecting text sharpess.
*   **Timing**: A 3-phase state machine (`logging` -> `title` -> `exit`) ensures a consistent 3.5s transition into the main app.

### 🎨 Visual Theme: "Deep Cyber"
*   **Holo-Grid**: A CSS 3D transform animation (`rotateX(70deg)`) creates a moving floor effect behind the game canvas.
*   **Leaderboard Strips**: High-end ranking board design with distinct visual hierarchies for Top 3 (Gold/Silver/Bronze) using glow filters and custom SVG medals.
*   **Terminal Interface**: The chat panel mimics a developer console, showing the internal monologue of the agent system using `ReactMarkdown` for structured data.

---

## 4. Technical Architecture

### 4.1 The Engine Contract
The AI is strictly forbidden from touching the DOM. It must adhere to this interface:

```javascript
return {
    // Called once on load or resize
    init: (state, width, height) => {
        state.player = { x: width/2, y: height/2 };
        state.score = 0;
    },

    // Called ~60 times per second
    // dt is Delta Time in seconds (e.g., 0.016)
    update: (state, input, dt) => {
        if (input.keys['ArrowUp']) state.player.y -= 100 * dt;
        if (input.isDown) fireLaser(state);
    },

    // Render logic
    draw: (state, ctx, width, height) => {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        // ... draw game ...
    }
};
```

### 4.2 Sandboxing Strategy
*   **Execution**: Code is serialized and injected into a `srcDoc` iframe.
*   **Input Normalization**: A unified `input` object (`x, y, isDown, keys`) ensures cross-platform compatibility (Touch/Mouse).
*   **Error Handling**: Runtime errors in the generated code are caught by a global `window.onerror` in the host template and displayed as a red debug overlay.

---

## 5. Gemini Model Configuration

| Agent | Model | Config | Role |
| :--- | :--- | :--- | :--- |
| **Designer** | `gemini-flash-lite-latest` | `temp: 0.7` | High creativity, low latency. |
| **Architect** | `gemini-3-flash-preview` | `temp: 0.2` | High structural precision. |
| **Engineer** | `gemini-3-flash-preview` | `thinkingBudget: 2048` | Math & physics logic solver. |

---

## 6. Database Schema (Neon Postgres)

```sql
CREATE TABLE "SavedGame" (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL, 
  likes INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```