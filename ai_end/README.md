# ai_end

`ai_end` 是仓库中的 AI 能力模块，与 `backend/`、`SNCP-app/` 平级。

当前职责：
- 编排 AI 能力调用
- 管理食物目录与本地匹配
- 提供识图、营养分析、食谱推荐等能力入口

目录约定：
- `ai_end/services/`：AI 服务编排与能力入口
- `ai_end/skills/`：可复用的 AI skill 定义与提示词模板
- `ai_end/data/`：食物目录等静态数据

当前后端入口：
- `backend/` 通过 `ai_end.services.ai_service.AIService` 调用 AI 能力

说明：
- AI 配置统一由 `backend/config.py` 加载
- 本次仅做目录整理，不改变现有功能与调用逻辑
