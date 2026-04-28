# SNCP 技术栈

更新时间：2026-04-28

本文档不是泛泛罗列框架名，而是说明“当前项目为什么是这套技术组合”，以及新人应该先把注意力放在哪些依赖上。

## 1. 选型原则

当前项目的技术栈主要遵循四个原则：

- 一套前端代码尽量同时覆盖 Android、iOS、Web
- 后端实现简单直接，优先保证业务推进速度
- 能复用成熟服务就复用，不在仓库内重复发明基础设施
- AI 能力允许多供应商接入，并且必须有本地兜底

## 2. 前端技术栈

| 类别 | 方案 | 用途 |
|---|---|---|
| 应用框架 | Expo 54 | 统一 React Native 工程能力、构建与调试 |
| UI 运行时 | React 19 + React Native 0.81 | 页面、状态与跨端渲染 |
| 路由 | expo-router 6 | 文件路由、Tab 和 Stack 组合 |
| 语言 | TypeScript 5.9 | 类型约束、接口联调 |
| 导航 | @react-navigation/* | 路由底层依赖 |
| 本地安全存储 | expo-secure-store | App 端保存 access token / refresh token |
| 本地普通存储 | AsyncStorage / localStorage | 用户资料、主题等非敏感数据 |
| 媒体与图像 | expo-image、expo-image-picker | 图片展示与选图/拍照 |
| 动画与手势 | react-native-reanimated、gesture-handler | 基础交互支持 |
| 构建发布 | EAS Build | Android 打包配置 |

### 为什么前端这样选

- `Expo + React Native` 让项目可以用一套代码兼顾移动端和 Web，而不是拆成多个前端工程。
- `expo-router` 非常适合当前这种页面数量较多、但层级仍然清晰的应用。
- token 存储做了双端适配：App 用 `SecureStore`，Web 用 `localStorage`，避免把安全策略写死在单一平台。

## 3. 后端技术栈

| 类别 | 方案 | 用途 |
|---|---|---|
| 语言 | Python 3.11 | 后端主语言 |
| Web 框架 | Flask 3.1 | API 服务 |
| 跨域 | flask-cors | 允许前端跨域访问 API |
| 限流 | flask-limiter | 可选限流，存储可落 Redis |
| 数据访问 | psycopg 3 | 直连 PostgreSQL |
| 认证 | PyJWT + bcrypt | JWT 令牌、密码哈希 |
| 图像处理 | Pillow | 头像裁剪与压缩 |
| HTTP 调用 | requests | 调 AI 服务、调外部食谱 API |

### 为什么后端这样选

- 当前后端并没有用 ORM，而是直接在 `repository` 层写 SQL。这样做的代价是抽象更少，但可读性高、排查问题直接，也很适合当前项目规模。
- `Flask` 足够轻，配合蓝图拆分路由后，业务结构已经能保持清晰。
- 认证相关逻辑集中在 `auth_service.py`，避免把 JWT 细节散落在每个接口里。

## 4. 数据与基础设施

| 类别 | 方案 | 用途 |
|---|---|---|
| 主数据库 | PostgreSQL 16 | 用户、餐次、食谱、规则等业务数据 |
| 缓存/状态 | Redis 7 | 今日看板缓存、推荐缓存、限流、用户状态版本 |
| 容器编排 | Docker Compose | 一键拉起 `db`、`redis`、`backend` |
| 文件存储 | 本地目录 `backend/static/uploads` | 食谱封面文件 |

### 数据层的几个现实约束

- 项目没有单独 migration 框架，数据库结构由 `backend/db.py` 的 `init_db()` 在启动时创建和补字段。
- 食谱封面不是走对象存储，而是直接保存在服务端本地目录中。
- 头像没有单独文件存储，而是处理后直接保存在 `users.avatar_data` 里。

## 5. AI 与外部能力

| 类别 | 方案 | 用途 |
|---|---|---|
| 视觉模型 | 智谱 `glm-4.6v` | 识图记餐、食谱图片转草稿 |
| 文本模型 | 智谱 `glm-4.7` | 营养分析、推荐理由生成 |
| 备用策略 | 本地规则兜底 | 智谱不可用时的快速回退 |
| 远端 AI 接口 | `AI_*` 环境变量 | 若已有独立 AI 服务，可直接复用 |
| 外部食谱源 | TheMealDB | 外部食谱灵感补充 |
| 本地营养食物库 | `SNCP-app/constants/food-catalog.ts` | 手动录入食物的基础营养值 |

### AI 调用顺序

不同能力的优先顺序略有区别，但大体原则一致：

- 能走专用远端接口就优先走专用接口
- 没有专用接口时先走智谱
- 智谱不可用再走本地规则
- 如果连模型都没有，就退到本地规则或提示词匹配

这样做的好处是：

- 业务逻辑不被单一供应商绑定
- 演示环境和开发环境都能工作
- 没有模型额度时项目也不会整体瘫痪

## 6. 构建与部署

### 6.1 后端

- 本地开发推荐 `uv`
- 容器运行由 `backend/Dockerfile` + `backend/docker-compose.yml` 管理
- 默认对外端口：`4420`

### 6.2 前端

- 本地开发使用 `expo start`
- Android 调试一般走模拟器或真机
- EAS 配置写在 `SNCP-app/eas.json`

## 7. 当前技术栈的优点与代价

### 优点

- 上手快，前后端结构都比较直观
- AI 接入灵活，能接智谱或已有远端服务
- 单仓库里就能完成完整闭环，不需要额外拆微服务

### 代价

- 没有 migration 工具，数据库演进需要更谨慎
- 没有统一响应包裹结构，接口文档必须维护到位
- 前端跨端兼容要时刻考虑 Web、Android 和 iOS 的差异

## 8. 信息来源

- 前端依赖：`SNCP-app/package.json`
- 应用配置：`SNCP-app/app.json`、`SNCP-app/eas.json`
- 后端依赖：`backend/pyproject.toml`
- 容器与部署：`backend/docker-compose.yml`、`backend/Dockerfile`
- AI 配置：`backend/config.py`、`ai_end/services/ai_service.py`
