# SNCP 核心数据模型

更新时间：2026-04-28

本文档基于 `backend/db.py` 的 `init_db()`、各 `repository` 以及前端类型定义整理，目标是帮助新人快速建立“数据到底存在哪、谁在读写它”的整体认知。

## 1. 存储总览

当前项目的数据分四层：

- PostgreSQL：业务主数据
- Redis：缓存、状态版本、限流存储
- 本地文件：食谱封面上传文件
- 代码内置数据：默认食谱、手动食物库、AI 识图规则

## 2. 关系总图

```text
users
  ├─ 1:1 health_profiles
  ├─ 1:1 nutrition_goals
  ├─ 1:N sessions
  ├─ 1:N meals
  │      └─ 1:N meal_items
  ├─ 1:N reminders
  ├─ 1:N recipes            (仅私有食谱；公共食谱 user_id 为空)
  └─ 1:N ai_usage_logs

health_rules                 (全局表)
ai_token_quotas              (全局表)
```

## 3. 核心表说明

## 3.1 `users`

用途：账号、角色、头像、最近登录时间。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `UUID` | 主键 |
| `phone` | `TEXT UNIQUE` | 登录手机号 |
| `display_name` | `TEXT` | 展示名 |
| `password_hash` | `TEXT` | bcrypt 哈希 |
| `password_algo` | `TEXT` | 当前实现固定为 `bcrypt` |
| `password_cost` | `INT` | bcrypt rounds |
| `roles` | `TEXT[]` | 角色数组，可能含 `admin`、`webmaster` |
| `avatar_data` | `TEXT` | 头像 data URL |
| `last_login_at` | `TIMESTAMPTZ` | 最近登录时间 |

设计备注：

- 头像不走单独文件表，而是直接存成 base64 data URL。
- 特殊管理员登录名 `admin` 最终也会落到这张表里。

## 3.2 `sessions`

用途：保存 refresh token 对应的会话。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `UUID` | 主键 |
| `user_id` | `UUID` | 关联 `users.id` |
| `refresh_token_sha` | `TEXT UNIQUE` | refresh token 的哈希值 |
| `expires_at` | `TIMESTAMPTZ` | 过期时间 |
| `user_agent` | `TEXT` | 登录设备信息 |
| `ip` | `TEXT` | 登录 IP |
| `revoked_at` | `TIMESTAMPTZ` | 撤销时间 |

设计备注：

- 数据库不存明文 refresh token。
- 刷新令牌时，旧 session 会被撤销并创建新 session。

## 3.3 `health_profiles`

用途：保存用户健康档案。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | `UUID` | 主键，同时关联 `users.id` |
| `gender` | `TEXT` | 性别 |
| `birth_year` | `INT` | 出生年份 |
| `height_cm` | `NUMERIC` | 身高 |
| `weight_kg` | `NUMERIC` | 体重 |
| `chronic_conditions` | `TEXT[]` | 慢病标签 |
| `allergies` | `TEXT[]` | 过敏原 |
| `taste_preferences` | `TEXT[]` | 口味偏好 |

## 3.4 `nutrition_goals`

用途：保存营养目标范围。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | `UUID` | 主键，同时关联 `users.id` |
| `calories_min/max` | `INT` | 热量目标 |
| `protein_min/max` | `INT` | 蛋白质目标 |
| `fat_min/max` | `INT` | 脂肪目标 |
| `carbs_min/max` | `INT` | 碳水目标 |
| `sodium_max` | `INT` | 钠上限 |
| `sugar_max` | `INT` | 糖上限 |

## 3.5 `meals`

用途：一条餐次主记录。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `user_id` | `UUID` | 归属用户 |
| `meal_type` | `TEXT` | `breakfast/lunch/dinner/snack` |
| `eaten_at` | `TIMESTAMPTZ` | 实际进餐时间，统一存 UTC |
| `client_request_id` | `TEXT` | 幂等请求 ID |
| `note` | `TEXT` | 备注 |

设计备注：

- `(user_id, client_request_id)` 有唯一索引，用于防止重复创建。
- 看板和趋势统计并不直接读 `meals` 本身，而是会继续拆到 `meal_items`。

## 3.6 `meal_items`

用途：一餐里的食物项。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `meal_id` | `BIGINT` | 关联 `meals.id` |
| `food_name` | `TEXT` | 食物名称 |
| `food_category` | `TEXT` | 食物类别 |
| `weight_g` | `NUMERIC` | 克重 |
| `source` | `TEXT` | 数据来源，如手动录入、AI 识别 |
| `nutrition` | `JSONB` | 营养值对象 |

`nutrition` 当前主要字段与前端 `NutritionValues` 对齐：

- `calories`
- `protein`
- `fat`
- `carbs`
- `fiber`
- `sodium`
- `sugar`

## 3.7 `recipes`

用途：用户私有食谱 + 服务端公共食谱。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `user_id` | `UUID NULL` | `NULL` 表示公共食谱；非空表示用户私有食谱 |
| `name` | `TEXT` | 食谱名称 |
| `cuisine` | `TEXT` | 菜系 |
| `cover_url` | `TEXT` | 封面地址 |
| `source_url` | `TEXT` | 原始来源 URL |
| `source_provider` | `TEXT` | 来源方，如 `themealdb` |
| `tags` | `TEXT[]` | 标签 |
| `ingredients` | `JSONB` | 食材数组 |
| `steps` | `JSONB` | 步骤数组 |
| `nutrition` | `JSONB` | 营养信息 |
| `suitable_for` | `TEXT[]` | 适宜人群/标签 |

设计备注：

- 这张表只存数据库中的食谱。
- 实际“服务端食谱库”还要再加上 `backend/data/default_recipes.py` 里的内置默认食谱。
- 查询时，后端会附加 `library_scope` 字段区分 `local` 和 `server`。

## 3.8 `health_rules`

用途：健康禁忌规则，全局生效。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `tag` | `TEXT UNIQUE` | 规则标签，通常和慢病标签对应 |
| `forbidden_foods` | `TEXT[]` | 禁忌食物 |
| `tips` | `TEXT[]` | 饮食建议 |

## 3.9 `reminders`

用途：提醒设置。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `user_id` | `UUID` | 归属用户 |
| `reminder_type` | `TEXT` | 提醒类型 |
| `time_of_day` | `TEXT` | 时间字符串 |
| `repeat_days` | `INT[]` | 重复周几 |
| `enabled` | `BOOLEAN` | 是否启用 |
| `note` | `TEXT` | 备注 |

## 3.10 `ai_usage_logs`

用途：记录 AI 调用量和模型使用情况，供后台统计。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `BIGSERIAL` | 主键 |
| `user_id` | `UUID` | 触发调用的用户 |
| `endpoint` | `TEXT` | 调用来自哪个 API |
| `provider` | `TEXT` | 提供方 |
| `model_name` | `TEXT` | 模型名 |
| `model_kind` | `TEXT` | `text` 或 `image` |
| `prompt_tokens` | `INT` | 输入 token |
| `completion_tokens` | `INT` | 输出 token |
| `total_tokens` | `INT` | 总 token |

## 3.11 `ai_token_quotas`

用途：记录各类模型的总额度配置，供后台展示。

关键字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `model_kind` | `TEXT` | 主键，当前为 `text` / `image` |
| `total_tokens` | `BIGINT` | 总额度 |

## 4. Redis 中的状态数据

Redis 不是主数据库，但对结果有明显影响。当前关键 key 类型如下：

| Key 前缀 | 作用 |
|---|---|
| `nutrition:state-version:{user_id}` | 用户状态版本号 |
| `nutrition:recipe-library:global-version` | 公共食谱库版本号 |
| `nutrition:dashboard:today:*` | 今日看板缓存 |
| `nutrition:recommend:*` | 推荐结果缓存 |

设计备注：

- 缓存不要求强一致，但要求“写后尽快失效”。
- 相关版本号在餐次、档案、目标、食谱变更时会递增。

## 5. 文件存储

当前仓库有两类“文件数据”：

### 5.1 食谱封面

- 存储目录：`backend/static/uploads/recipe-covers`
- 来源：前端上传的 `cover_url` data URL
- 数据库里只保存相对路径或规范化后的 URL

### 5.2 用户头像

- 不单独落盘
- 处理后直接存到 `users.avatar_data`

## 6. 代码内置数据

有几类数据不在数据库里，而是直接跟代码发布：

- `backend/data/default_recipes.py`
  - 内置公共食谱
- `SNCP-app/constants/food-catalog.ts`
  - 手动录入食物的营养库
- `docs/food_catalog_sources.md`
  - 手动营养库数据来源说明
- `docs/ai-visual-recognition-skill.md`
  - AI 识图拆分规则说明

## 7. 当前数据层设计的关键取舍

- 简单优先：直接 SQL + 启动时建表，减少框架复杂度。
- 灵活优先：`nutrition`、`ingredients`、`steps` 用 `JSONB`，降低小步迭代成本。
- 读写分离意识明确：路由不直接写 SQL，统一经过 `repository`。
- 缓存是“性能层”，不是“事实层”：任何关键业务数据都必须能从 PostgreSQL 重建。

## 8. 信息来源

- 表结构：`backend/db.py`
- SQL 访问：`backend/repository/*.py`
- 前端类型：`SNCP-app/types/*.ts`
- 文件上传：`backend/services/recipe_cover_service.py`
- 缓存：`backend/services/cache_service.py`
