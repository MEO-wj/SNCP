<div align="center">

# SNCP

### 面向中老年与慢病饮食管理场景的智能饮食营养管理应用仓库
![Product](https://img.shields.io/badge/Product-Nutrition%20Care%20Platform-0F766E)
![Workflow](https://img.shields.io/badge/Workflow-Record%20to%20Insight%20to%20Recommendation-1D4ED8)
![Stack](https://img.shields.io/badge/Stack-Expo%20%2B%20Flask%20%2B%20PostgreSQL-16A34A)
![Status](https://img.shields.io/badge/Status-V1%20Feature%20Complete-475569)

</div>

这个仓库服务于一个很明确的目标：把“吃了什么、吃得是否合理、接下来该怎么吃、长期是否在改善”串成一条可以持续使用的完整闭环。
当前重点不是做一个只会记录热量的轻量工具页，而是把 `健康档案 -> 饮食记录 -> AI 分析 -> 食谱推荐 -> 长期趋势 -> 后台管理` 这条产品链路真正打通。

> 这个项目的核心定位不是“卡路里记录器”，而是“围绕健康背景、饮食行为和可执行建议展开的营养管理工作台”。

## 快速导航
- [项目简介](#project-overview)
- [核心体验目标](#experience-goals)
- [业务闭环](#workflow-design)
- [功能设计](#feature-design)
- [AI 工作流](#ai-workflow)
- [数据设计](#data-design)
- [技术方向](#tech-direction)
- [快速开始](#quick-start)
- [当前状态](#status)
- [仓库结构](#structure)
- [已有文档](#docs)
- [后续计划](#roadmap)
- [说明](#notes)

<a id="project-overview"></a>
## 项目简介

`SNCP` 不是传统意义上“记一顿饭就结束”的工具，而是一套围绕饮食健康决策展开的完整应用。

当前仓库可以拆成四个核心层次：

1. `用户层`
   负责注册、登录、账号信息、头像、角色权限、健康档案和营养目标。
2. `记录层`
   负责手动记餐、AI 识图记餐、餐次历史和提醒事项。
3. `分析层`
   负责今日看板、长期趋势、AI 营养分析和规则校验。
4. `推荐与管理层`
   负责食谱库、个性化推荐、健康禁忌规则、后台用户管理和公共食谱维护。

项目当前最重要的概念，是把“饮食输入”和“健康反馈”明确连成一个闭环：

- `健康档案` 提供用户背景
- `饮食记录` 提供真实行为数据
- `规则与 AI` 负责解释当前状态
- `推荐结果` 给出下一步可执行动作

这样做的目标是：不是只告诉用户“今天吃了多少”，而是进一步回答“是否合适”“为什么”“下一顿怎么调整”。

<a id="experience-goals"></a>
## 核心体验目标

本项目希望同时满足四件事：

1. `记录要足够轻`
   用户可以手动录入，也可以用拍照识别快速进入记餐流程。
2. `反馈要足够清楚`
   每一餐和每天的结果都要能落到热量、三大营养素、风险提示和建议上。
3. `建议要足够可执行`
   推荐不能停留在抽象判断，而是要结合健康档案和食谱库给出下一步选择。
4. `长期使用要有复盘价值`
   用户不是只看当天数据，还要能看到趋势变化、长期习惯和后台管理结果。

理想使用顺序：
`注册登录 -> 完善档案 -> 记录饮食 -> 获取分析 -> 查看推荐 -> 追踪趋势`

<a id="workflow-design"></a>
## 业务闭环

当前仓库支持一条已经基本完整的主业务链路：

### 1. 用户初始化
1. 手机号注册或登录
2. 完善健康档案
3. 设置营养目标

### 2. 每日饮食记录
1. 手动录入一餐
2. 或通过拍照 / 选图识别食物
3. 生成餐次与食物项数据

### 3. 当日分析反馈
1. 聚合当天餐次营养值
2. 对比营养目标
3. 结合慢病标签和健康规则生成风险提示
4. 由 AI 补充总结、优点、风险和下一步建议

### 4. 推荐与调整
1. 读取用户档案、目标与规则
2. 从私有食谱、公共食谱和内置食谱中挑选候选
3. 返回推荐食谱和推荐理由

### 5. 长期复盘
1. 按时间区间聚合营养趋势
2. 在趋势页观察长期变化
3. 配合提醒功能建立持续使用习惯

### 6. 后台维护
1. 查看用户总量与活跃情况
2. 查看 AI 调用统计
3. 管理健康禁忌规则
4. 管理公共食谱和管理员权限

<a id="feature-design"></a>
## 功能设计

### 1. 账号与权限体系
- 支持手机号注册、登录、刷新令牌和退出登录
- 支持当前用户信息查看与更新
- 支持头像上传与密码修改
- 支持 `admin` 与 `webmaster` 角色分级

### 2. 健康档案与营养目标
- 维护性别、出生年份、身高、体重
- 维护慢病标签、过敏原、口味偏好
- 维护热量、蛋白质、脂肪、碳水、钠、糖等营养目标

### 3. 饮食记录
- 支持早餐、午餐、晚餐、加餐分类
- 支持按天查询和按区间查询
- 支持幂等创建，避免重复提交同一餐
- 支持删除餐次并联动刷新统计

### 4. 今日看板
- 汇总当天营养摄入
- 计算三大营养素供能占比
- 生成目标达成情况
- 输出风险提示、建议和综合评分
- 结合 AI 给出文字总结与行动建议

### 5. 长期趋势
- 支持查看最近 7 到 90 天的营养趋势
- 支持按日聚合热量和主要营养值
- 为长期饮食变化提供复盘入口

### 6. 食谱库与推荐
- 支持私有食谱、公共食谱、内置默认食谱
- 支持关键字、标签和作用域筛选
- 支持食谱封面、来源、标签、适宜人群、步骤和营养信息
- 支持基于用户档案、目标和规则生成推荐

### 7. AI 能力
- 支持食物识别
- 支持营养分析
- 支持推荐理由增强
- 支持从食物图片抽取食谱草稿

### 8. 提醒系统
- 支持提醒事项的增删改查
- 支持提醒类型、时间、重复日期和备注

### 9. 管理后台
- 支持后台总览
- 支持用户列表和用户详情
- 支持管理员权限授予与撤销
- 支持健康禁忌规则管理
- 支持公共食谱管理

<a id="ai-workflow"></a>
## AI 工作流

本项目的 AI 设计重点不是“绑定某一个模型”，而是保证主流程稳定。

当前仓库采用多级回退策略：

### 1. 识图与分析入口统一
- 后端统一通过 `AIService` 调用 AI 能力
- 前端只关心 `/api/ai/*` 接口，不直接感知底层模型差异

### 2. 模型与服务回退顺序
1. 优先走独立远端 `AI_*` 接口
2. 否则优先走智谱
3. 再退到 OpenAI
4. 最后退到本地规则或本地食物目录匹配

### 3. 设计目标
- 避免业务强绑定单一供应商
- 开发环境没有完整模型配置时仍可工作
- 模型不可用时不让主流程直接中断

### 4. 已实现 AI 能力
- `POST /api/ai/recognize`
- `POST /api/ai/recipe-draft`
- `POST /api/ai/analyze`
- `POST /api/ai/recommend`

<a id="data-design"></a>
## 数据设计

项目当前的数据设计目标，是让“用户状态”“饮食行为”“分析结果”“推荐输入”之间保持清晰关系。

核心数据实体如下：

| 实体 | 作用 |
| --- | --- |
| `users` | 账号、角色、头像、最近登录 |
| `sessions` | refresh token 会话 |
| `health_profiles` | 健康档案 |
| `nutrition_goals` | 营养目标 |
| `meals` | 餐次主记录 |
| `meal_items` | 一餐内的食物项 |
| `recipes` | 私有食谱与公共食谱 |
| `health_rules` | 健康禁忌规则 |
| `reminders` | 提醒事项 |
| `ai_usage_logs` | AI 调用日志 |
| `ai_token_quotas` | AI 额度配置 |

关键约束：

- 餐次时间统一以 UTC 存储，但按用户本地日期聚合
- 食谱的公共 / 私有作用域通过 `user_id is null` 与 `user_id = 当前用户` 区分
- 今日看板和推荐结果会进入 Redis 缓存
- 用户档案、目标、餐次和食谱变更会触发状态版本更新

完整数据结构说明见：
- [核心数据模型文档](./docs/02-data-models/core-data-model.md)

<a id="tech-direction"></a>
## 技术方向

当前采用一套以“跨端前端 + 轻量后端 + 可插拔 AI”为核心的组合：

- `Expo + React Native`
  负责 Android、iOS、Web 三端统一客户端实现。
- `expo-router`
  负责文件路由与页面组织。
- `Flask`
  负责 API 服务和业务编排。
- `PostgreSQL`
  负责主业务数据存储。
- `Redis`
  负责缓存、限流存储和状态版本。
- `psycopg`
  负责直连数据库，不额外引入 ORM 复杂度。
- `PyJWT + bcrypt`
  负责认证和密码安全。
- `Zhipu / OpenAI / 远端 AI 接口`
  负责视觉识别、营养分析和推荐增强。
- `Docker Compose`
  负责本地一键拉起后端依赖。

<a id="quick-start"></a>
## 快速开始

### 1. 准备后端环境变量

```bash
cd backend
copy .env.example .env
```

如果你要在宿主机直接运行后端，而不是跑在 Docker 容器里，请把 `.env` 中的数据库和 Redis 主机改成 `localhost`：

```env
DATABASE_URL=postgresql://sncp:change-me-db-password@localhost:5432/sncp
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 2. 启动数据库和 Redis

```bash
cd backend
docker compose up -d db redis
```

### 3. 启动后端

```bash
cd backend
uv sync
uv run python app.py
```

### 4. 启动前端

```bash
cd SNCP-app
npm install
copy .env.example .env
npm run start
```

### 5. 常用平台启动命令

```bash
cd SNCP-app
npm run android
npm run ios
npm run web
```

### 6. 推荐使用顺序

1. 先登录或注册账号
2. 完善健康档案和营养目标
3. 录入一餐或走 AI 识图
4. 查看首页看板结果
5. 查看推荐页和趋势页
6. 如需后台能力，再用管理员账号进入管理页面

<a id="status"></a>
## 当前状态

| 标签 | 内容 |
| --- | --- |
| 当前阶段 | 初版功能完成，可用于完整流程验证 |
| 产品闭环 | 注册登录 -> 档案目标 -> 记餐 -> 分析 -> 推荐 -> 趋势 -> 后台 |
| 已完成重点 | 认证、档案、目标、餐次、看板、趋势、提醒、食谱、后台、AI |
| AI 能力 | 识图记餐、营养分析、推荐、食谱草稿抽取 |
| 当前重点 | 稳定性打磨、文档完善、体验优化 |

<a id="structure"></a>
## 仓库结构

```text
SNCP/
|-- SNCP-app/                  # Expo React Native 客户端
|   |-- app/                   # 页面路由
|   |-- components/            # 共享组件
|   |-- services/              # API 调用封装
|   |-- storage/               # 本地存储
|   |-- types/                 # 前端类型定义
|-- backend/                   # Flask API 服务
|   |-- routes/                # 路由入口
|   |-- repository/            # SQL 访问层
|   |-- services/              # 业务服务
|   |-- scripts/               # 辅助脚本
|-- ai_end/                    # AI 能力编排层
|   |-- services/
|   |-- skills/
|   |-- data/
|-- docs/                      # 开发文档体系
|   |-- 01-product/
|   |-- 02-data-models/
|   |-- api_documentation.md
|-- .github/
|-- AGENTS.md
|-- README.md
```

<a id="docs"></a>
## 已有文档

- [开发文档入口](./docs/README.md)
- [功能拆解](./docs/01-product/functional-breakdown.md)
- [技术栈说明](./docs/01-product/tech-stack.md)
- [接口约定](./docs/01-product/api-conventions.md)
- [开发流程](./docs/01-product/dev-work-breakdown.md)
- [核心数据模型](./docs/02-data-models/core-data-model.md)
- [详细 API 文档](./docs/api_documentation.md)
- [AI 识图规则说明](./docs/ai-visual-recognition-skill.md)
- [食物库来源说明](./docs/food_catalog_sources.md)
- [前端模块说明](./SNCP-app/README.md)
- [后端模块说明](./backend/README.md)
- [AI 模块说明](./ai_end/README.md)

推荐阅读顺序：
1. 先看本 README，理解项目定位与完整闭环
2. 再看 `docs/README.md`，建立开发导航
3. 再按需进入前端、后端或 AI 子模块 README

<a id="roadmap"></a>
## 后续计划

### 近期待办
- 优化前端交互细节与异常提示
- 增强后台统计与管理体验
- 补充更多本地验证和测试覆盖

### 中期规划
- 完善提醒与持续使用机制
- 继续丰富食谱库与推荐质量
- 优化 AI 识图与分析稳定性

### 长期方向
- 构建更完整的个性化营养管理闭环
- 打通更多可视化统计与健康规则能力
- 为后续更强的智能建议和自动化能力预留稳定契约

<a id="notes"></a>
## 说明

这个仓库最重要的价值，不是“把饮食数据存下来”，而是“把健康背景、饮食行为、规则判断和 AI 建议组织成一条可持续演进的产品链路”：

- 为什么不仅要记餐，还要有档案和目标
- 为什么推荐不能脱离食谱库与慢病规则
- 为什么 AI 必须可回退，而不是成为单点依赖
- 为什么后台管理要和用户侧闭环一起建设

当这条链路稳定以后，后续无论是继续增强前端体验、扩展后台能力，还是接入更强的 AI 模型，都会有一套明确且可复用的地基。
