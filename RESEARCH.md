# Research Report: Generative Pipeline Analysis (v2)

**Subject:** Root Cause Analysis of Generative Success Rates
**Comparison:** Current Project (High Success) vs. Traditional Single-Pass Generation (Low Success)
**Context:** Both systems generate core JS logic (not full HTML), yet the Current Project performs significantly better.

---

## 1. Critical Finding: The "Illusion" of First-Shot Success

Reviewing the provided logs (`[API/CREATE] ...`), we see a crucial event sequence that explains the perceived quality difference:

1.  **Engineer Generation:** The AI generated the code for "Rocket Descent".
2.  **Runtime Error:** The generated code crashed immediately with `Runtime Error: "Vector is not defined"`.
3.  **Silent Recovery:** The system **automatically** triggered a `[FIXER]` agent.
4.  **Final Result:** The user received a working game.

**Conclusion:** The high success rate is **not** because the model writes perfect code every time. It is because the system **treats runtime errors as a prompt, not a failure state.** If your other project lacks this automatic feedback loop, every syntax error counts as a generic "failure" to the user.

---

## 2. Pipeline Gap Analysis

### 2.1. The "Skeleton" Strategy (Grounding)
**Log Evidence:** `[DIRECTOR] Selected skeleton: impulse_physics`

*   **Current Project:** The AI does not start from a blank slate. It selects from 17 pre-defined "Skeletons" (architectural templates). This pre-loads the context with specific physics rules (gravity, impulse, friction) *before* the code generation starts.
*   **Low-Success Project:** Likely asks the AI to "Write a game about X" from scratch. This forces the AI to hallucinate an architecture *and* the gameplay logic simultaneously, increasing the chance of structural collapse.

### 2.2. The Architect Step (Intermediate Representation)
**Log Evidence:** `[ArchitectService] Spec Generated. Length: 12944 chars`

*   **Current Project:** Before writing a single line of code, an "Architect Agent" generated a **12,000-character** technical specification. This document defined the State Schema, the exact variable names (`rocket.fuel`, `barge.width`), and the math formulas.
*   **Low-Success Project:** Likely goes directly from `User Prompt` -> `Code`.
*   **Impact:** By the time the "Engineer Agent" writes code, it isn't "thinking"—it is simply **translating** a detailed spec. This creates a massive reduction in logic errors.

### 2.3. The "Fixer" Agent (The Safety Net)
**Log Evidence:**
> `[API/FIX] Error: Vector is not defined`
> `[FIXER] Calling AI for bug fix...`

*   **Current Project:**
    1.  The Host (`GamePreview.tsx`) captures `window.onerror`.
    2.  It sends the *Code* + *Error Message* back to a specialized AI model.
    3.  The model injects the missing dependencies (in this case, the `Vector` helper functions).
*   **Low-Success Project:** Usually displays the error in the browser console or crashes the canvas, leaving the user with a frozen screen and no recourse.

---

## 3. Structural Comparison

| Component | Your Low-Success Project (Hypothesis) | Current Benchmark Project |
| :--- | :--- | :--- |
| **Prompting** | Direct: "Create a [Topic] game code..." | **Staged:** Classify -> Spec -> Code -> Fix |
| **Context** | Generic or Empty | **Injected:** Pre-selected Skeleton (Physics/Grid/Runner) |
| **Cognitive Load** | High (Design + Arch + Syntax) | **Low** (Syntax only; Design is provided by Architect) |
| **Error Handling** | User sees crash | **System sees crash & auto-patches** |
| **Time to First Byte** | Fast | Slower (7-15s) but higher reliability |

---

## 4. Actionable Recommendations

To fix the low success rate in your other project, apply these specific upgrades:

### Priority 1: Implement the "Fixer Loop"
Do not return the code immediately. Run a validation step:
1.  Can you `eval()` the code in a sandbox without it throwing `SyntaxError`?
2.  If it throws, feed the error back to the AI: *"You wrote this code, but it threw [Error]. Fix it."*
3.  **This alone will likely double your success rate.**

### Priority 2: Adopt the "Architect" Pattern
Split your prompt into two calls:
1.  **Call A:** "Don't write code. Write a JSON object describing the `state` variables and the `update` logic steps for a [Topic] game."
2.  **Call B:** "Implement this JSON spec into JavaScript."
*Why?* It stops the AI from forgetting variable names halfway through generation.

### Priority 3: Pre-define Helper Classes
The log error `Vector is not defined` happened because the AI assumed a `Vector` class existed in the global scope.
*   **Solution:** In your prompt, explicitly provide the code for `Vector`, `Collision`, and `Input` helpers, or force the AI to include them. The current project *tries* to provide them in the sandbox, but the Fixer ensures they are present if the AI forgets to rely on the global scope correctly.

### Summary
The difference is **Flow Engineering**. You are likely relying on the *Model's Intelligence* to solve structural problems, whereas this project uses *System Architecture* (Skeletons, Specs, Auto-Fixing) to guarantee results.
