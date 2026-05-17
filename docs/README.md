# SNCP 开发文档

更新时间：2026-04-28

本文档面向第一次接手 `SNCP` 的开发者，目标不是写成“论文”，而是把项目的业务闭环、技术栈、接口约定和日常开发方式讲清楚，让新人能尽快上手并避免踩坑。

当前文档结构参考了另一个项目 `ResumeGenius/docs` 的组织方式，但内容已经按本项目的真实代码实现重新整理。

## 文档体系

```text
docs/
  README.md
  01-product/
    functional-breakdown.md      # 功能拆解与模块职责
    tech-stack.md                # 技术栈与外部依赖
    api-conventions.md           # 统一接口约定与协议
    dev-work-breakdown.md        # 本地开发流程与验证方式
  02-data-models/
    core-data-model.md           # 核心数据模型与表结构
  api_documentation.md           # 详细接口清单
  ai-visual-recognition-skill.md # AI 识图规则补充说明
  yolo-glm-food-recognition-integration.md # YOLO + GLM 食物识别融合方案
  food_catalog_sources.md        # 手动食物库的数据来源说明
```

## 建议阅读顺序

1. 先读 [01-product/functional-breakdown.md](./01-product/functional-breakdown.md)，理解项目到底在解决什么问题。
2. 再读 [01-product/tech-stack.md](./01-product/tech-stack.md)，知道前后端、数据库、AI 和外部依赖分别是什么。
3. 接着读 [01-product/api-conventions.md](./01-product/api-conventions.md)，避免接口联调时因为约定不一致反复返工。
4. 然后读 [02-data-models/core-data-model.md](./02-data-models/core-data-model.md)，建立数据层认知。
5. 真正开始开发前，再读 [01-product/dev-work-breakdown.md](./01-product/dev-work-breakdown.md) 和 [api_documentation.md](./api_documentation.md)。

## 项目总览

`SNCP` 是一个面向中老年用户与慢病人群的饮食营养管理应用。当前代码已经覆盖以下主线能力：

- 手机号注册、登录、刷新令牌、退出登录
- 饮食记录与餐次历史查询
- 健康档案与营养目标配置
- 今日健康看板与长期趋势统计
- 食谱库浏览、个人食谱维护、管理员公共食谱维护
- 提醒事项管理
- 管理后台：用户列表、用户详情、管理员权限、健康禁忌规则
- AI 识图记餐、营养分析、食谱推荐、食谱草稿抽取

## 系统总图

```text
Expo React Native App
  ├─ 页面路由：expo-router
  ├─ 本地存储：SecureStore / AsyncStorage / localStorage
  └─ 服务层：SNCP-app/services/*.ts
              │
              ▼
Flask API (/api)
  ├─ auth / profile / meals / dashboard
  ├─ recipes / reminders / admin / ai
  ├─ repository 直接访问 PostgreSQL
  ├─ Redis：缓存 + 限流存储
  └─ AIService：智谱 / 外部 AI 接口 / 本地规则兜底
              │
              ├─ PostgreSQL：业务主数据
              ├─ Redis：用户状态版本、推荐缓存、看板缓存
              ├─ TheMealDB：外部食谱灵感源
              └─ backend/static/uploads：食谱封面文件
```

## 文档和代码的关系

- 这套文档以“当前仓库里的真实实现”为准，不以设想中的未来架构为准。
- 当前后端接口没有单独的 `/v1` 版本前缀，所有接口都直接挂在 `/api` 下，因此改接口时必须同步更新文档。
- 后端没有引入独立 migration 工具，数据库结构由 `backend/db.py` 里的 `init_db()` 在启动时幂等创建；这意味着字段变更时要同时关注历史兼容和启动逻辑。
- 认证、时区、角色和缓存策略对业务结果影响很大，不能只看页面表象，必须同时读接口约定。

## 整理依据

本次文档整理主要基于以下文件：

- 文档结构参考：`D:\Github file\ResumeGenius\docs\README.md`
- 技术栈与开发文档写法参考：`D:\Github file\ResumeGenius\docs\01-product\tech-stack.md`、`api-conventions.md`、`dev-work-breakdown.md`
- 当前项目事实来源：
  - `SNCP-app/package.json`
  - `SNCP-app/app/_layout.tsx`
  - `SNCP-app/app/(tabs)/_layout.tsx`
  - `SNCP-app/services/*.ts`
  - `backend/app.py`
  - `backend/config.py`
  - `backend/db.py`
  - `backend/routes/*.py`
  - `backend/repository/*.py`
  - `backend/docker-compose.yml`
  - `backend/Dockerfile`
  - `ai_end/services/ai_service.py`

## 补充资料

- [api_documentation.md](./api_documentation.md)：详细到接口级别的清单。
- [ai-visual-recognition-skill.md](./ai-visual-recognition-skill.md)：说明 AI 识图为什么会优先拆食材、酱汁和油脂。
- [yolo-glm-food-recognition-integration.md](./yolo-glm-food-recognition-integration.md)：说明 YOLO 作为第二评委接入 GLM 食物识别的生产落地方案。
- [food_catalog_sources.md](./food_catalog_sources.md)：说明前端手动食物库的营养数据从哪里来。
