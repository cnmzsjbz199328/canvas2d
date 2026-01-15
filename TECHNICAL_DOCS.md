# Canvas 2D 游戏生成器开发文档

## 1. 核心架构设计 (Architecture)

本项目采用 **"Agentic Loop" (代理循环)** 模式，并将代码生成架构升级为 **"Host + Script" (宿主+脚本)** 引擎模式。

### 1.1 宿主引擎模式 (The Host Engine Pattern)
系统不再生成完整的 HTML 文件，而是生成纯 JavaScript 逻辑对象。

*   **Host (宿主)**: `GamePreview.tsx` 中内置了一个固定的 HTML 模板。它负责：
    *   管理 `<canvas>` DOM 元素。
    *   归一化输入事件 (Mouse/Touch/Keyboard) 为统一的 `input` 对象。
    *   运行 `requestAnimationFrame` 游戏循环。
    *   错误捕获与显示。
*   **Script (脚本)**: Gemini 生成的仅仅是游戏逻辑，必须包含三个核心方法：
    *   `init(state, width, height)`: 初始化状态。
    *   `update(state, input, dt)`: 处理逻辑更新。
    *   `draw(state, ctx, width, height)`: 处理渲染。

*   **优势**：
    *   **Token 效率**：模型不再需要重复生成 CSS、HTML 样板和基础事件监听代码。
    *   **统一体验**：所有游戏共享相同的输入系统和循环逻辑，确保手感一致。
    *   **兼容性**：支持混合模式，既可以运行新的脚本对象，也能向后兼容旧的 HTML 完整文件（通过检测 `<!DOCTYPE html>`）。

### 1.2 状态隔离的沙箱 (Stateless Sandboxing)
尽管迁移到了脚本模式，预览组件仍使用 `iframe` 的 `srcDoc` 属性进行渲染。

*   **技术细节**：每当代码更新版本号 (`version`) 增加时，React 会重新构建 `srcDoc` 字符串（将 AI 脚本注入到 Host 模板中），并销毁重建 iframe。
*   **必要性**：确保旧的 JS 对象、内存和闭包被彻底清理，防止游戏逻辑重叠。

---

## 2. Gemini 模型策略 (Gemini Strategy)

本项目的高成功率主要归功于对 **Gemini 3 Pro** 特性的深度利用。

### 2.1 Thinking Budget (思维预算)
在 `services/geminiService.ts` 中，我们配置了 `thinkingConfig: { thinkingBudget: 2048 }`。

*   **原理**：Canvas 游戏开发属于复杂的逻辑任务。Gemini 3 Pro 在 Thinking 阶段会预先规划状态结构（`state` 对象的设计），然后再编写具体的 `update` 逻辑。
*   **效果**：显著减少了变量未定义的错误，并提高了物理计算的准确性。

### 2.2 结构化输出 (Structured Output via Prompting)
提示词严格限制模型只输出 JS 对象字面量。

*   **Prompt 示例**：
    > "DO NOT output HTML. Output ONLY a valid JavaScript object literal... The object MUST strictly adhere to this interface: { init, update, draw }"
*   **鲁棒性**：即使模型偶尔输出了 Markdown 代码块，前端服务层也会自动清洗，提取纯代码。

---

## 3. 数据库集成 (Database Integration)

项目集成了 Neon (Serverless PostgreSQL) 用于持久化存储。

*   **表结构**：`SavedGame` 表存储了游戏的元数据和代码字符串。
*   **混合存储**：`code` 字段既可以是旧版的 HTML 字符串，也可以是新版的 JS 对象字符串。前端根据内容自动判断渲染模式。

## 4. UI/UX 设计理念

*   **左侧终端 (Agent Terminal)**：展示"思考过程"，强化 AI 代理感。
*   **右侧即时反馈 (Preview)**：代码与视觉的一一对应。
*   **Code Mode**：现在展示的是干净的业务逻辑代码，而非杂乱的 HTML 标签，方便开发者阅读和学习。
