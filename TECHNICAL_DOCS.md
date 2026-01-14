# Canvas 2D 游戏生成器开发文档

## 1. 核心架构设计 (Architecture)

本项目采用 **"Agentic Loop" (代理循环)** 模式，而非传统的 Chat 模式。核心在于将用户的自然语言指令转化为完整的、自包含的代码交付物。

### 1.1 单文件策略 (The Single-File Constraint)
最关键的设计决策是强制模型输出**包含 HTML、CSS 和 JavaScript 的单文件**。

*   **解决的问题**：大语言模型（LLM）在处理多文件模块化（Import/Export）时，常因无法准确预测文件路径或依赖关系而导致 `ReferenceError`。
*   **优势**：
    *   **上下文完整性**：模型在生成游戏主循环（Game Loop）时，能直接看到全局变量的定义。
    *   **预览零延迟**：前端无需进行 Webpack/Vite 打包，直接通过 `iframe srcDoc` 即可渲染，实现了秒级预览。

### 1.2 状态隔离的沙箱 (Stateless Sandboxing)
预览组件 (`GamePreview.tsx`) 使用了 `iframe` 的 `srcDoc` 属性，配合 React 的 `key` 属性强制重渲染。

*   **技术细节**：每当代码更新版本号 (`version`) 增加时，React 会销毁旧的 iframe 并创建新的。
*   **必要性**：HTML5 Canvas 游戏通常依赖 `requestAnimationFrame`。如果不彻底销毁 DOM 环境，旧的循环会在后台继续运行，导致游戏速度加倍或内存泄漏。这种"销毁重建"策略保证了每次运行都是干净的环境。

---

## 2. Gemini 模型策略 (Gemini Strategy)

本项目的高成功率主要归功于对 **Gemini 3 Pro** 特性的深度利用。

### 2.1 Thinking Budget (思维预算)
在 `services/geminiService.ts` 中，我们配置了 `thinkingConfig: { thinkingBudget: 2048 }`。

*   **原理**：Canvas 游戏开发属于复杂的逻辑任务，涉及碰撞检测、状态机和渲染循环。普通的 LLM 往往"边写边想"，容易导致代码结构混乱。
*   **效果**：Gemini 3 Pro 会在输出代码前，在思维链中预演游戏逻辑（例如："我需要先定义玩家对象，再定义子弹数组，最后写更新函数"）。这种"谋定而后动"的能力显著降低了语法错误和逻辑死锁。

### 2.2 上下文迭代 (Contextual Iteration)
在 `iterateGameCode` 函数中，我们将**旧的完整代码**作为 Prompt 的一部分回传给模型。

```typescript
// 伪代码逻辑
const fullPrompt = `
  Here is existing code:
  ${currentCode}
  ---
  Task: ${userModification}
  Return the FULL updated file.
`;
```

*   **经验**：不要让模型只返回"修改片段"（Diff）。让模型重写整个文件虽然消耗更多 Token，但能确保它不会破坏现有的闭包作用域或丢失全局变量引用，这是保证代码 100% 可运行的关键。

---

## 3. Prompt Engineering (提示词工程)

在 `SYSTEM_INSTRUCTION` 中，我们注入了针对 Canvas 开发的特定规则：

1.  **全局命名空间控制**：虽然是单文件，但提示词引导模型使用闭包或 `Game` 对象，防止变量污染。
2.  **生命周期钩子**：强制要求使用 `window.onload` 或 `DOMContentLoaded`，防止脚本在 `<canvas>` 元素渲染前执行（这是导致白屏最常见的原因）。
3.  **输入设备标准化**：强制绑定键盘（Arrow Keys/WASD）事件，确保生成的游戏立即可玩。

## 4. UI/UX 设计理念

受到 Claude Code 等现代开发工具的启发：

*   **左侧终端 (Agent Terminal)**：展示"思考过程"而非单纯的聊天气泡，强化"Agent 正在为你工作"的心理暗示。
*   **右侧即时反馈 (Preview)**：代码与视觉的一一对应，让用户能迅速验证 AI 的修改结果。
*   **极简主义**：去除了所有不必要的配置项，让用户专注于"描述游戏想法"。
