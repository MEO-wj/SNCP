# AI End

`ai_end` 是仓库里的 AI 能力层，职责不是单独提供 HTTP 服务，而是作为 `backend/` 的内部模块，为识图、营养分析和推荐提供统一入口。

## 目录作用

```text
ai_end/
├── services/
│   ├── ai_service.py            # AI 能力总入口
│   └── food_catalog_service.py  # 本地食物库匹配与整理
├── skills/
│   ├── recognition_skill.py
│   └── recipe_recommendation_skill.py
├── data/
│   └── food_catalog.py
└── README.md
```

## 当前职责

- 统一编排 AI 调用顺序
- 管理识图与推荐相关的提示词结构
- 复用本地食物目录做匹配和兜底
- 在模型不可用时，尽量返回可继续使用的降级结果

## 能力入口

当前后端通过 `ai_end.services.ai_service.AIService` 调用以下能力：

- 食物识别 `recognize_foods`
- 食谱草稿抽取 `extract_recipe_draft`
- 营养分析 `analyze_nutrition`
- 食谱推荐 `recommend_recipes`

## 调用优先级

AI 能力不是硬绑定单一模型，当前整体策略是：

1. 如果配置了独立 `AI_*` 远端接口，优先走远端服务
2. 否则优先走智谱
3. 最后退到本地规则或本地目录匹配

这个设计的目标是两件事：

- 尽量复用现成稳定能力
- 即使模型不可用，主流程也不要直接断掉

## 与后端的关系

- 路由入口在 `backend/routes/ai.py`
- 配置统一由 `backend/config.py` 提供
- AI 调用量记录由 `backend/repository/admin_dashboard_repository.py` 落库

也就是说，`ai_end` 自己不管用户、数据库和 HTTP 状态码，它只负责“拿到输入后尽量产出稳定结果”。

## 新人最该先看哪些文件

1. `services/ai_service.py`
2. `services/food_catalog_service.py`
3. `skills/recognition_skill.py`
4. `skills/recipe_recommendation_skill.py`

## 开发注意点

- 改返回结构时，要同步看前端 `SNCP-app/types/ai.ts`
- 改识图规则时，优先复用本地食物目录和现有 skill
- 改推荐逻辑时，注意缓存和 `library_only` 语义
- 任何私有 `_meta_*` 字段都不应该直接暴露给前端

## 相关文档

- [`../docs/ai-visual-recognition-skill.md`](../docs/ai-visual-recognition-skill.md)
- [`../docs/food_catalog_sources.md`](../docs/food_catalog_sources.md)
- [`../docs/api_documentation.md`](../docs/api_documentation.md)
