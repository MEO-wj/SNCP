# ai_end

`ai_end` 是仓库中的 AI 能力模块，和 `backend/`、`SNCP-app/` 平级。

当前包含：

- 食物识别
- 营养分析
- 食谱推荐
- 食物目录与本地提示词匹配

职责边界：

- `ai_end/` 负责 AI 能力编排、模型调用、本地兜底与食物目录匹配
- `backend/` 负责 Flask 路由、鉴权、数据库访问与业务聚合

当前入口：

- 后端路由通过 `ai_end.services.ai_service.AIService` 调用 AI 能力

说明：

- AI 配置仍由 `backend/config.py` 统一加载，避免项目里出现两套环境变量入口
- 当前已优先接入智谱，保留独立 `AI_*` 远程服务和 OpenAI 兼容兜底
