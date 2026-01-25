# Intro Sequence Design Specification

> **Component:** `IntroSequence.tsx`
> **Purpose:** Brand identity, mood setting, and resource loading simulation.
> **Design Goal:** "Recording-Friendly" – High contrast and large typography optimized for video capture.

## 1. Visual Philosophy

The intro sequence serves as a diegetic interface (UI that exists within the game's world). It simulates a retro-futuristic neural link establishing a connection to the Gemini AI cluster.

**Key Aesthetic Pillars:**
*   **Terminal Brutalism:** Raw text, high contrast, monospace fonts.
*   **Cyber-Green:** Uses Tailwind's `emerald-500` (#10b981) as the primary accent color against a pure black background.
*   **Glitch Art:** CSS-based signal interference to simulate analog video connection.

---

## 2. Sequence Phases (State Machine)

The animation is controlled by a 3-stage state machine:

### Phase 1: KERNEL BOOT (Logging)
*   **Duration:** Variable (~1.5s - 2.0s).
*   **Content:** Rapid-fire terminal logs simulating system initialization.
*   **Typography:** `text-sm` to `text-xl` (Dynamic scaling).
*   **Visual Logic:**
    *   Logs appear one by one.
    *   Prefix `>` is `emerald-900`.
    *   Active log is `text-emerald-400`.
    *   History logs fade to `text-zinc-600`.
    *   Blinking cursor `_` at the bottom.

**Log Script:**
```text
> INITIALIZING KERNEL...
> LOADING NEURAL MODULES [OK]
> ESTABLISHING UPLINK TO GEMINI CLUSTER...
> ALLOCATING VRAM FOR CANVAS RENDERER...
> MOUNTING VIRTUAL DOM...
> SYSTEM INTEGRITY CHECK: 100%
> BOOT SEQUENCE COMPLETE.
```

### Phase 2: BRAND REVEAL (Title)
*   **Duration:** Fixed 2.0s (Progress bar fill time) + 0.5s dwell.
*   **Key Element:** Large Title Header.
    *   **Font Size:** `text-6xl` (Mobile) / `text-8xl` (Desktop).
    *   **Weight:** `font-black` (800).
    *   **Tracking:** `tracking-tighter`.
*   **Animation:**
    *   **Zoom In:** `animate-in zoom-in-95`.
    *   **Glitch Effect:** CSS `clip-path` animations (`glitch-anim`, `glitch-anim2`) create RGB split and tearing effects on the text.
*   **Progress Bar:**
    *   Width: `max-w-2xl`.
    *   Color: `bg-emerald-500` with `shadow-[0_0_20px_emerald]`.
    *   Fills from 0% to 100% using `requestAnimationFrame` for smooth interpolation.

### Phase 3: HANDOVER (Exit)
*   **Duration:** 0.8s.
*   **Transition:**
    *   The entire overlay container scales up (`scale-110`).
    *   Opacity fades to 0.
    *   Blur effect increases (`blur-sm`).
    *   `pointer-events-none` is applied immediately to allow interaction with the underlying app.

---

## 3. Typography & Accessibility

To ensure the intro is clear during screen recordings (e.g., Loom, OBS), specific font sizing rules are applied:

| Element | Tailwind Class | Size (px) | Purpose |
| :--- | :--- | :--- | :--- |
| **Main Title** | `text-8xl` | ~96px | Maximum impact, readable on small video embeds. |
| **Boot Logs** | `text-xl` | ~20px | Ensure technical text is legible without compression artifacts. |
| **Status Text** | `text-base` | ~16px | "SYSTEM LOADING" indicators. |
| **Footer** | `text-sm` | ~14px | "Proprietary Neural Interface" watermark. |

---

## 4. Technical Implementation Details

### Glitch CSS
The glitch effect is achieved without JavaScript using `::before` and `::after` pseudo-elements. They contain a copy of the text (`data-text` attribute) and are clipped/shifted using `@keyframes`.

```css
.glitch-wrapper::before {
  content: attr(data-text);
  position: absolute;
  left: 2px;
  text-shadow: -1px 0 #00ffff; /* Cyan Shift */
  clip: rect(44px, 450px, 56px, 0);
  animation: glitch-anim 5s infinite linear alternate-reverse;
}
```

### React Logic
*   **No External Libraries:** Pure React `useState` and `useEffect`.
*   **Performance:** Uses `requestAnimationFrame` for the progress bar to ensure it doesn't block the main thread while the browser is parsing the main application bundle.
*   **Cleanup:** All timers (`setInterval`, `setTimeout`) and animation frames are cleared on unmount to prevent memory leaks.
