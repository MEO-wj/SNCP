# Backend

`backend` 是项目的 Flask API 服务，负责认证、餐次、健康档案、看板、食谱、提醒、后台管理和 AI 接口编排。

## 目录作用

```text
backend/
├── app.py         # Flask 入口
├── config.py      # 配置加载
├── db.py          # 数据库连接与初始化建表
├── routes/        # API 路由
├── repository/    # SQL 访问层
├── services/      # 认证、缓存、营养计算等领域逻辑
├── models/        # 轻量数据模型
├── data/          # 内置默认数据
├── scripts/       # 辅助脚本
├── Dockerfile
└── docker-compose.yml
```

## 技术栈

- Python 3.11
- Flask 3.1
- psycopg 3
- PostgreSQL
- Redis
- bcrypt + PyJWT
- Pillow

## 主要接口模块

- `routes/auth.py`：登录、注册、刷新令牌、当前用户、密码修改
- `routes/profile.py`：健康档案、营养目标
- `routes/meals.py`：餐次创建、查询、删除
- `routes/dashboard.py`：今日看板、趋势统计
- `routes/recipes.py`：食谱库
- `routes/reminders.py`：提醒
- `routes/admin.py`：后台管理
- `routes/ai.py`：AI 能力入口

## 本地启动

### 方式 A：只用 Docker 跑依赖

先准备环境变量：

```bash
copy .env.example .env
```

如果你打算在宿主机直接运行 Flask，请把 `.env` 里的以下配置改成本机地址：

```env
DATABASE_URL=postgresql://sncp:change-me-db-password@localhost:5432/sncp
REDIS_HOST=localhost
REDIS_PORT=6379
```

启动 PostgreSQL 和 Redis：

```bash
docker compose up -d db redis
```

安装依赖并启动服务：

```bash
uv sync
uv run python app.py
```

### 方式 B：后端全走 Docker

```bash
copy .env.example .env
docker compose up --build
```

## 环境变量重点

### 必填

- `DATABASE_URL`
- `AUTH_JWT_SECRET`
- `AUTH_REFRESH_HASH_KEY`

### 常用

- `REDIS_HOST`
- `REDIS_PORT`
- `ADMIN_PHONE`
- `ADMIN_PASSWORD`
- `ADMIN_PHONES`

### AI 相关

- `ZHIPU_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_FOOD_RECOGNITION_URL`
- `AI_NUTRITION_ANALYSIS_URL`
- `AI_RECIPE_RECOMMEND_URL`

## 数据层说明

- 数据库结构由 `db.py` 中的 `init_db()` 在启动时幂等创建
- 当前没有独立 migration 工具
- Redis 主要用于缓存和状态版本，不是主事实来源

## 常用脚本

创建或更新管理员账号：

```bash
uv run python scripts/create_admin_user.py
```

## 新人最该先看哪些文件

1. `app.py`
2. `config.py`
3. `db.py`
4. `routes/auth.py`
5. `routes/meals.py`
6. `services/auth_service.py`
7. `services/cache_service.py`

## 开发注意点

- 路由层负责鉴权和响应，SQL 尽量放在 `repository/`
- 所有按天统计都受请求时区头影响
- 餐次、档案、目标、食谱修改后会触发缓存版本号变化
- 公共食谱与私有食谱共用一张表，用 `user_id is null` 区分

## 相关文档

- [`../docs/README.md`](../docs/README.md)
- [`../docs/api_documentation.md`](../docs/api_documentation.md)
- [`../docs/02-data-models/core-data-model.md`](../docs/02-data-models/core-data-model.md)
