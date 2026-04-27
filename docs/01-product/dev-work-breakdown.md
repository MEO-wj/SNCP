# SNCP 开发流程

更新时间：2026-04-28

本文档面向新人本地开发，重点讲“怎么跑起来、怎么改、怎么验证”，不展开多人协作分工。

## 1. 建议先读什么

正式动手前，建议先按这个顺序看：

1. [functional-breakdown.md](./functional-breakdown.md)
2. [tech-stack.md](./tech-stack.md)
3. [api-conventions.md](./api-conventions.md)
4. [../02-data-models/core-data-model.md](../02-data-models/core-data-model.md)
5. [../api_documentation.md](../api_documentation.md)

## 2. 本地环境准备

### 2.1 必备依赖

| 依赖 | 建议版本 | 用途 |
|---|---|---|
| Node.js | 18+ | Expo 前端 |
| npm | 跟随 Node | 安装前端依赖 |
| Python | 3.11+ | Flask 后端 |
| uv | 最新稳定版 | 安装/运行后端依赖 |
| Docker Desktop | 最新稳定版 | 启动 PostgreSQL / Redis / 容器化后端 |
| Android Studio | 最新稳定版 | 安卓模拟器调试 |

### 2.2 环境变量文件

前端：

- 模板：`SNCP-app/.env.example`
- 本地文件：`SNCP-app/.env`

后端：

- 模板：`backend/.env.example`
- 本地文件：`backend/.env`

## 3. 推荐启动方式

## 3.1 方式 A：开发时最方便

这个方式最适合频繁改代码。

### 第一步：只用 Docker 拉基础设施

```bash
cd backend
cp .env.example .env
docker compose up -d db redis
```

### 第二步：把后端 `.env` 改成本机地址

`backend/.env.example` 默认是给 Docker 容器内使用的，所以如果你打算在宿主机直接跑 Flask，需要把：

- `DATABASE_URL` 的主机从 `db` 改成 `localhost`
- `REDIS_HOST` 从 `redis` 改成 `localhost`

例如：

```env
DATABASE_URL=postgresql://sncp:change-me-db-password@localhost:5432/sncp
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 第三步：本机启动后端

```bash
cd backend
uv sync
uv run python app.py
```

### 第四步：启动前端

```bash
cd SNCP-app
npm install
cp .env.example .env
npm run start
```

如果你是安卓模拟器调试，也可以直接：

```bash
cd SNCP-app
npm run android
```

## 3.2 方式 B：后端全放 Docker

如果你暂时不改后端代码，只想快速联调前端，可以直接：

```bash
cd backend
cp .env.example .env
docker compose up --build
```

这时 `.env.example` 里的 `DATABASE_URL=@db` 和 `REDIS_HOST=redis` 可以保持不变。

## 4. 前端开发注意点

### 4.1 API 地址选择

前端 API 基础地址逻辑写在 `SNCP-app/services/api.ts`：

- 开发环境优先读 `EXPO_PUBLIC_API_BASE_URL`
- Android 模拟器访问 `localhost` 时会自动改写成 `10.0.2.2`
- 生产包若未注入环境变量，会兜底到写死的线上地址

所以本地开发最简单的前端 `.env` 一般是：

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4420/api
```

### 4.2 本地存储

- App 端 token：`SecureStore`
- Web 端 token：`localStorage`
- 用户资料缓存：`AsyncStorage` 或 `localStorage`

改登录逻辑时，别只改接口调用，还要同步检查存储层和前端 auth 状态管理。

## 5. 后端开发注意点

### 5.1 数据库不是 migration 驱动

项目当前没有 Alembic 一类工具。数据库结构变化需要同时改：

- `backend/db.py` 的 `init_db()`
- 对应 `repository`
- 对应接口文档

### 5.2 路由层和仓储层职责要分开

新增接口建议遵循现有模式：

1. `routes` 负责鉴权、参数读取、状态码返回
2. `repository` 负责 SQL
3. `services` 负责通用业务能力

不要把复杂 SQL 直接堆进路由，也不要把 HTTP 请求对象一路传进仓储层。

### 5.3 Redis 不是强依赖

后端连接 Redis 失败时，核心业务仍能继续，只是：

- 缓存失效
- 部分限流能力失效或退回内存

排障时不要因为 Redis 报错就直接判断“整个系统不可用”。

## 6. AI 功能开发流程

### 6.1 先看哪里

AI 相关改动通常需要同时看：

- `ai_end/services/ai_service.py`
- `docs/ai-visual-recognition-skill.md`
- `docs/food_catalog_sources.md`
- 对应前端 `SNCP-app/services/ai.ts`

### 6.2 建议改法

如果你要改 AI 能力，建议按这个顺序动手：

1. 先确认是“识图规则”“模型调用”“返回结构”还是“前端展示”哪一层要改
2. 如果只是识图拆分策略，优先复用现有 skill 和本地食物库，不要直接另起一套提示词
3. 如果改返回结构，先改 `types`、再改服务层、最后改页面
4. 改完后至少验证“有模型配置”和“无模型配置”两条路径

## 7. 后台权限调试

### 7.1 `admin` 特殊登录名

认证服务支持一个特殊管理员登录名，默认是：

```text
admin
```

它对应的密码来自后端环境变量：

- `ADMIN_PASSWORD`

只要环境变量配置好，使用 `admin + ADMIN_PASSWORD` 登录时，系统会自动确保这个账号具备 `webmaster` 和 `admin` 角色。

### 7.2 普通手机号管理员

如果要把某些手机号登录后自动视为管理员，可以在后端 `.env` 中配置：

```env
ADMIN_PHONES=13800138000,13900139000
```

这些账号登录后会自动带 `admin` 角色。

## 8. 日常开发闭环

### 8.1 改页面时

建议顺序：

1. 改 `app/` 页面
2. 如需新字段，补 `types/`
3. 如需新请求，补 `services/`
4. 联调验证页面跳转、状态和异常提示

### 8.2 改接口时

建议顺序：

1. 先查现有 `routes` 和 `repository` 是否已有近似实现
2. 再补或修改 SQL
3. 再改前端服务层
4. 最后同步更新 `docs/api_documentation.md`

### 8.3 改数据模型时

建议顺序：

1. 先改 `backend/db.py`
2. 再改 `repository`
3. 再改接口返回结构
4. 再改前端类型与页面
5. 最后更新 [core-data-model.md](../02-data-models/core-data-model.md)

## 9. 本地验证方式

当前仓库没有完整自动化测试套件，所以验证主要依赖本地运行。

### 9.1 前端静态检查

```bash
cd SNCP-app
npm run lint
```

### 9.2 建议至少手动走通的业务

- 注册或登录
- 进入首页，看 token 是否生效
- 录入一餐，确认餐次、首页看板、趋势能联动变化
- 修改健康档案和目标，确认推荐与分析结果变化
- 打开食谱列表，确认 `local/server/all` 视图正常
- 如果改了后台，确认管理员账号能进入后台页面
- 如果改了 AI，分别验证“模型可用”和“模型不可用”两条路径

## 10. 常见坑

- `backend/.env.example` 默认是给 Docker 容器内使用的，不改主机名就直接本机跑 Flask 会连不上数据库。
- 安卓模拟器里不能直接访问宿主机 `127.0.0.1`，但当前前端服务层已经做了 `10.0.2.2` 自动改写。
- 今日看板和推荐有 Redis 缓存，改逻辑后如果页面没变化，先检查缓存命中。
- 餐次按本地日期聚合，不带时区头时很容易出现“明明是今天吃的，却跑到昨天/明天”的错觉。

## 11. 信息来源

- 环境变量与 API 地址：`SNCP-app/services/api.ts`、`SNCP-app/.env.example`、`backend/.env.example`
- 启动方式：`backend/Dockerfile`、`backend/docker-compose.yml`、`backend/pyproject.toml`
- 认证与权限：`backend/services/auth_service.py`
- 缓存与时区：`backend/services/cache_service.py`、`backend/utils/timezone_context.py`
