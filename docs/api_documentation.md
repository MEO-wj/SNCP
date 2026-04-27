# SNCP API 文档

更新时间：2026-04-28

本文档按“当前代码真实实现”整理，覆盖接口路径、鉴权要求、核心请求字段、返回结构和关键注意事项。默认基础路径为 `/api`。

## 1. 全局说明

### 1.1 基础路径

- 所有业务接口都挂在 `/api`
- 健康检查接口：`GET /api/health`

### 1.2 鉴权

- 未标明“公开”的接口都需要 `Authorization: Bearer <access_token>`
- 刷新令牌接口使用 `refresh_token` 字段，不靠 `Authorization` 头
- 管理后台接口区分 `admin` 和 `webmaster`

### 1.3 时区相关请求头

前端通常会带这两个头：

```http
X-Timezone-Offset-Minutes: -480
X-Client-Timezone: Asia/Shanghai
```

它们会影响：

- 餐次按天查询
- 今日看板
- 趋势统计
- 管理后台的部分时间聚合

### 1.4 错误响应

失败时通常返回：

```json
{
  "error": "错误信息"
}
```

## 2. 健康检查

### `GET /api/health`

- 鉴权：否
- 作用：确认后端是否启动
- 响应：

```json
{
  "status": "ok",
  "service": "nutrition-api",
  "version": "0.1.0"
}
```

## 3. 认证与账号

## 3.1 `POST /api/auth/token`

- 鉴权：否
- 作用：登录
- 请求体：

```json
{
  "phone": "13800138000",
  "password": "******"
}
```

兼容写法：

- 登录标识可传 `phone`
- 也兼容 `account`
- 也兼容 `username`

响应：

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 604800,
  "user": {
    "id": "uuid",
    "phone": "13800138000",
    "display_name": "张三",
    "roles": ["admin"]
  }
}
```

说明：

- 特殊管理员登录名默认支持 `admin`
- `expires_in` 来自后端 `AUTH_ACCESS_TOKEN_TTL`

## 3.2 `POST /api/auth/register`

- 鉴权：否
- 作用：注册并自动登录
- 请求体：

```json
{
  "phone": "13800138000",
  "password": "******",
  "display_name": "张三"
}
```

- 成功状态码：`201`
- 返回结构：与登录接口基本一致

## 3.3 `POST /api/auth/token/refresh`

- 鉴权：否
- 作用：用 `refresh_token` 换新会话
- 请求体：

```json
{
  "refresh_token": "..."
}
```

- 返回结构：与登录接口一致

## 3.4 `POST /api/auth/logout`

- 鉴权：否
- 作用：撤销 refresh token 对应的 session
- 请求体：

```json
{
  "refresh_token": "..."
}
```

- 响应：

```json
{
  "message": "已退出"
}
```

## 3.5 `GET /api/auth/me`

- 鉴权：登录用户
- 作用：获取当前登录用户信息
- 响应：

```json
{
  "user_id": "uuid",
  "display_name": "张三",
  "phone": "13800138000",
  "roles": ["admin"],
  "avatar_url": "data:image/jpeg;base64,..."
}
```

## 3.6 `PUT /api/auth/me`

- 鉴权：登录用户
- 作用：修改当前用户基础资料
- 请求体字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `display_name` | `string` | 新昵称 |
| `avatar_image` | `string` | 头像图片，支持 base64 或 data URL |

- 响应：

```json
{
  "user": {
    "id": "uuid",
    "phone": "13800138000",
    "display_name": "张三",
    "roles": [],
    "avatar_url": "data:image/jpeg;base64,..."
  }
}
```

## 3.7 `PUT /api/auth/me/password`

- 鉴权：登录用户
- 作用：修改密码
- 请求体：

```json
{
  "current_password": "旧密码",
  "new_password": "新密码"
}
```

- 响应：

```json
{
  "message": "密码已更新"
}
```

## 4. 健康档案与目标

## 4.1 `GET /api/profile`

- 鉴权：登录用户
- 作用：获取健康档案
- 响应：

```json
{
  "profile": {
    "gender": "female",
    "birth_year": 1958,
    "height_cm": 160,
    "weight_kg": 58,
    "chronic_conditions": ["高血压"],
    "allergies": [],
    "taste_preferences": ["清淡"]
  }
}
```

## 4.2 `PUT /api/profile`

- 鉴权：登录用户
- 作用：新增或更新健康档案
- 请求体字段：

| 字段 | 类型 |
|---|---|
| `gender` | `string \| null` |
| `birth_year` | `number \| null` |
| `height_cm` | `number \| null` |
| `weight_kg` | `number \| null` |
| `chronic_conditions` | `string[]` |
| `allergies` | `string[]` |
| `taste_preferences` | `string[]` |

- 响应：`{ "profile": ... }`

## 4.3 `GET /api/profile/goals`

- 鉴权：登录用户
- 作用：获取营养目标
- 响应：

```json
{
  "goals": {
    "calories_min": 1400,
    "calories_max": 1800,
    "protein_min": 60,
    "protein_max": 90,
    "fat_min": 35,
    "fat_max": 55,
    "carbs_min": 180,
    "carbs_max": 260,
    "sodium_max": 2000,
    "sugar_max": 40
  }
}
```

## 4.4 `PUT /api/profile/goals`

- 鉴权：登录用户
- 作用：新增或更新营养目标
- 请求体字段：与 `goals` 响应体结构一致
- 响应：`{ "goals": ... }`

## 5. 餐次记录

### 通用餐次对象

```json
{
  "id": 1,
  "meal_type": "breakfast",
  "eaten_at": "2026-04-28T08:00:00+00:00",
  "client_request_id": "mobile-123",
  "note": "早餐",
  "items": [
    {
      "id": 1,
      "meal_id": 1,
      "food_name": "燕麦",
      "food_category": "主食",
      "weight_g": 50,
      "source": "manual",
      "nutrition": {
        "calories": 190,
        "protein": 7,
        "fat": 3,
        "carbs": 33,
        "fiber": 5,
        "sodium": 2,
        "sugar": 1
      }
    }
  ]
}
```

## 5.1 `POST /api/meals`

- 鉴权：登录用户
- 作用：创建一餐
- 请求体：

```json
{
  "meal_type": "breakfast",
  "eaten_at": "2026-04-28T08:00:00+08:00",
  "client_request_id": "mobile-123",
  "note": "早餐",
  "items": [
    {
      "food_name": "燕麦",
      "food_category": "主食",
      "weight_g": 50,
      "source": "manual",
      "nutrition": {
        "calories": 190,
        "protein": 7,
        "fat": 3,
        "carbs": 33,
        "fiber": 5,
        "sodium": 2,
        "sugar": 1
      }
    }
  ]
}
```

约束：

- `meal_type` 只能是 `breakfast`、`lunch`、`dinner`、`snack`
- `eaten_at` 可省略，省略时后端用“当前请求时区下的现在”
- `client_request_id` 可选，但建议移动端传，便于防重

- 响应：

```json
{
  "meal_id": 1,
  "created": true
}
```

说明：

- 如果同一个 `client_request_id` 已存在，接口会返回已有 `meal_id`，并把 `created` 置为 `false`

## 5.2 `GET /api/meals?date=YYYY-MM-DD`

- 鉴权：登录用户
- 作用：查询某一天的餐次
- 响应：

```json
{
  "date": "2026-04-28",
  "meals": [ ... ]
}
```

说明：

- 如果没传 `date`，后端会按请求时区取“今天”

## 5.3 `DELETE /api/meals/{meal_id}`

- 鉴权：登录用户
- 作用：删除餐次
- 成功状态码：`204`
- 成功时无响应体

## 5.4 `GET /api/meals/range?start=YYYY-MM-DD&end=YYYY-MM-DD`

- 鉴权：登录用户
- 作用：按日期区间查询餐次
- 响应：

```json
{
  "start": "2026-04-01",
  "end": "2026-04-30",
  "meals": [ ... ]
}
```

## 6. 今日看板与趋势

## 6.1 `GET /api/dashboard/today`

- 鉴权：登录用户
- 作用：获取当前本地日期的健康看板
- 响应：

```json
{
  "date": "2026-04-28",
  "meal_count": 3,
  "totals": {
    "calories": 1650,
    "protein": 82,
    "fat": 49,
    "carbs": 210,
    "fiber": 26,
    "sodium": 1750,
    "sugar": 29
  },
  "macro_ratio": {
    "protein": 20,
    "fat": 27,
    "carbs": 53
  },
  "goal_checks": [
    {
      "name": "calories",
      "value": 1650,
      "min": 1400,
      "max": 1800,
      "status": "ok"
    }
  ],
  "warnings": ["今日钠摄入偏高"],
  "suggestions": ["晚餐适当减少盐和酱汁"],
  "score": 82,
  "score_breakdown": {
    "rule_score": 76,
    "ai_score": 86,
    "rule_weight": 0.4,
    "ai_weight": 0.6
  },
  "ai": {
    "provider": "zhipu",
    "score": 86,
    "summary": "整体较均衡",
    "strengths": ["蛋白质摄入较稳定"],
    "risks": ["钠偏高"],
    "next_actions": ["下一餐选择清蒸或水煮"]
  }
}
```

说明：

- 没有任何餐次时也会返回结构完整的空看板
- 结果会按用户状态版本缓存到 Redis

## 6.2 `GET /api/dashboard/trend?days=30`

- 鉴权：登录用户
- 作用：获取趋势数据
- 参数：
  - `days`：默认 `30`，最小按 `7` 处理，最大按 `90` 处理
- 响应：

```json
{
  "start": "2026-04-01",
  "end": "2026-04-30",
  "trend": [
    {
      "date": "2026-04-01",
      "totals": {
        "calories": 1500,
        "protein": 70,
        "fat": 42,
        "carbs": 205,
        "fiber": 22,
        "sodium": 1600,
        "sugar": 20
      }
    }
  ]
}
```

## 7. 食谱库

### 通用食谱对象

```json
{
  "id": 1001,
  "name": "清蒸鲈鱼",
  "source": "library",
  "library_scope": "server",
  "cuisine": "中式",
  "tags": ["低油", "高蛋白"],
  "ingredients": [
    { "name": "鲈鱼", "amount": "1 条" }
  ],
  "steps": ["处理食材", "上锅蒸熟"],
  "nutrition": {
    "calories": 260,
    "protein": 36,
    "fat": 8,
    "carbs": 4,
    "fiber": 0,
    "sodium": 320,
    "sugar": 1
  },
  "suitable_for": ["高血压"],
  "cover_url": "http://127.0.0.1:4420/static/uploads/recipe-covers/xxx.jpg",
  "source_url": null,
  "source_provider": null
}
```

## 7.1 `GET /api/recipes`

- 鉴权：登录用户
- 作用：查询食谱
- Query 参数：

| 参数 | 说明 |
|---|---|
| `keyword` | 关键字搜索 |
| `tag` | 标签筛选 |
| `scope` | `all` / `local` / `server` |

- 响应：

```json
{
  "recipes": [ ... ]
}
```

说明：

- `all` 会返回“公共食谱 + 当前用户私有食谱”
- `server` 不仅包含数据库公共食谱，也包含代码内置默认食谱

## 7.2 `POST /api/recipes`

- 鉴权：登录用户
- 作用：新增食谱
- 请求体字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | `string` | 必填 |
| `scope` | `string` | `local` 或 `server`，默认 `local` |
| `cuisine` | `string \| null` | 菜系 |
| `cover_url` | `string \| null` | 远端 URL 或 data URL |
| `source_url` | `string \| null` | 来源链接 |
| `source_provider` | `string \| null` | 来源方 |
| `tags` | `string[]` | 标签 |
| `ingredients` | `object[]` | 食材 |
| `steps` | `string[]` | 步骤 |
| `nutrition` | `object` | 营养信息 |
| `suitable_for` | `string[]` | 适宜人群 |

- 响应：

```json
{
  "recipe": { ... },
  "created": true
}
```

说明：

- 同一作用域下按名称去重，已存在时不会重复创建
- `scope=server` 需要管理员权限

## 7.3 `PUT /api/recipes/{recipe_id}`

- 鉴权：登录用户
- 作用：更新食谱
- 请求体：与创建食谱类似
- 响应：

```json
{
  "recipe": { ... }
}
```

说明：

- 更新公共食谱需要 `scope=server` 且当前用户具备管理员权限

## 7.4 `DELETE /api/recipes/{recipe_id}?scope=local|server`

- 鉴权：登录用户
- 作用：删除食谱
- 响应：

```json
{
  "deleted": true
}
```

## 8. 提醒事项

### 通用提醒对象

```json
{
  "id": 1,
  "reminder_type": "drink_water",
  "time_of_day": "08:30",
  "repeat_days": [1, 2, 3, 4, 5],
  "enabled": true,
  "note": "早餐后"
}
```

## 8.1 `GET /api/reminders`

- 鉴权：登录用户
- 作用：查询提醒列表
- 响应：

```json
{
  "reminders": [ ... ]
}
```

## 8.2 `POST /api/reminders`

- 鉴权：登录用户
- 作用：创建提醒
- 请求体：

```json
{
  "reminder_type": "drink_water",
  "time_of_day": "08:30",
  "repeat_days": [1, 2, 3, 4, 5],
  "enabled": true,
  "note": "早餐后"
}
```

约束：

- `reminder_type` 必填
- `time_of_day` 必填

- 响应：

```json
{
  "reminder": { ... }
}
```

## 8.3 `PUT /api/reminders/{reminder_id}`

- 鉴权：登录用户
- 作用：更新提醒
- 请求体：与创建提醒类似
- 响应：`{ "reminder": ... }`

## 8.4 `DELETE /api/reminders/{reminder_id}`

- 鉴权：登录用户
- 作用：删除提醒
- 响应：

```json
{
  "deleted": true
}
```

## 9. 管理后台

## 9.1 `GET /api/admin/dashboard?days=7&users_limit=10`

- 鉴权：`admin`
- 作用：后台概览
- 响应根字段：

| 字段 | 说明 |
|---|---|
| `summary` | 用户数、活跃用户、AI 调用数 |
| `tokens` | 文本/图片额度与已用量 |
| `daily_ai_calls` | 折线图数据 |
| `users` | 最近活跃用户列表 |
| `users_meta` | 用户列表分页元信息 |

`summary` 主要字段：

- `total_users`
- `active_users_30d`
- `daily_active_users`
- `ai_calls_total`
- `ai_calls_today`

`tokens.text` / `tokens.image` 主要字段：

- `quota_total`
- `used_total`
- `used_today`
- `call_total`
- `call_today`
- `primary_model`
- `remaining_total`

## 9.2 `GET /api/admin/dashboard/users?limit=10&offset=0`

- 鉴权：`admin`
- 作用：分页查询后台用户列表
- 响应：

```json
{
  "users": [
    {
      "id": "uuid",
      "display_name": "张三",
      "phone": "13800138000",
      "roles": ["admin"],
      "avatar_url": null,
      "created_at": "2026-04-28T10:00:00+00:00",
      "last_login_at": "2026-04-28T10:10:00+00:00",
      "last_active_at": "2026-04-28T12:00:00+00:00",
      "meal_count": 12,
      "ai_call_count": 7
    }
  ],
  "users_meta": {
    "limit": 10,
    "offset": 0,
    "returned": 1,
    "has_more": false,
    "total_users": 1
  }
}
```

## 9.3 `GET /api/admin/users/{user_id}`

- 鉴权：`admin`
- 作用：获取指定用户详情
- 响应：

```json
{
  "user": {
    "id": "uuid",
    "display_name": "张三",
    "phone": "13800138000",
    "roles": ["admin"],
    "role_labels": ["管理员"],
    "avatar_url": null,
    "created_at": "2026-04-28T10:00:00+00:00",
    "last_login_at": "2026-04-28T10:10:00+00:00",
    "last_active_at": "2026-04-28T12:00:00+00:00",
    "meal_count": 12,
    "ai_call_count": 7
  },
  "profile": { },
  "goals": { },
  "permissions": {
    "viewer_can_manage_roles": true,
    "can_promote_to_admin": false,
    "can_revoke_admin": true
  }
}
```

## 9.4 `PUT /api/admin/users/{user_id}/promote-admin`

- 鉴权：`webmaster`
- 作用：授予管理员权限
- 响应：

```json
{
  "user": {
    "id": "uuid",
    "roles": ["admin"],
    "role_labels": ["管理员"]
  },
  "message": "已设置为管理员"
}
```

## 9.5 `PUT /api/admin/users/{user_id}/revoke-admin`

- 鉴权：`webmaster`
- 作用：撤销管理员权限
- 响应：

```json
{
  "user": {
    "id": "uuid",
    "roles": [],
    "role_labels": ["成员"]
  },
  "message": "已撤销管理员权限"
}
```

## 9.6 `GET /api/admin/health_rules`

- 鉴权：`admin`
- 作用：查询健康禁忌规则
- 响应：

```json
{
  "rules": [
    {
      "id": 1,
      "tag": "高血压",
      "forbidden_foods": ["腌制食品"],
      "tips": ["控制钠摄入"]
    }
  ]
}
```

## 9.7 `POST /api/admin/health_rules`

- 鉴权：`admin`
- 作用：新增或更新健康禁忌规则
- 请求体：

```json
{
  "tag": "高血压",
  "forbidden_foods": ["腌制食品"],
  "tips": ["控制钠摄入"]
}
```

- 响应：

```json
{
  "rule": {
    "id": 1,
    "tag": "高血压",
    "forbidden_foods": ["腌制食品"],
    "tips": ["控制钠摄入"]
  }
}
```

说明：

- 当前接口以 `tag` 为主键语义，调用同一个 `tag` 时会走 upsert

## 9.8 `DELETE /api/admin/health_rules/{rule_id}`

- 鉴权：`admin`
- 作用：删除健康禁忌规则
- 响应：

```json
{
  "deleted": true
}
```

## 10. AI 能力

### 10.1 输入约定

`/api/ai/recognize` 和 `/api/ai/recipe-draft` 至少要提供以下三者之一：

- `image_base64`
- `image_url`
- `hint_text`

### 10.2 `POST /api/ai/recognize`

- 鉴权：登录用户
- 作用：食物识别
- 请求体：

```json
{
  "image_base64": "...",
  "image_url": null,
  "hint_text": "清蒸鱼和一碗米饭"
}
```

- 响应：

```json
{
  "items": [
    {
      "name": "米饭",
      "food_name": "米饭",
      "canonical_name": "rice",
      "display_name": "米饭",
      "category": "主食",
      "food_category": "主食",
      "confidence": 0.92,
      "weight_g": 150,
      "source": "ai",
      "nutrition": {
        "calories": 174,
        "protein": 3,
        "fat": 0,
        "carbs": 39,
        "fiber": 0,
        "sodium": 2,
        "sugar": 0
      },
      "matched": true,
      "notes": "根据提示词与图像推断"
    }
  ],
  "provider": "zhipu",
  "message": "已完成识别",
  "scene_summary": "一份家常午餐"
}
```

## 10.3 `POST /api/ai/recipe-draft`

- 鉴权：登录用户
- 作用：从食物图片抽取食谱草稿
- 请求体：与识图接口相同
- 响应：

```json
{
  "recipe": {
    "name": "清蒸鲈鱼",
    "cuisine": "中式",
    "summary": "清淡蒸制",
    "tags": ["清淡", "高蛋白"],
    "suitable_for": ["高血压"],
    "ingredients": [
      { "name": "鲈鱼", "amount": "1 条" }
    ],
    "steps": ["处理食材", "上锅蒸熟"],
    "source_provider": "zhipu"
  },
  "provider": "zhipu",
  "message": "已根据图片生成食谱草稿"
}
```

## 10.4 `POST /api/ai/analyze`

- 鉴权：登录用户
- 作用：营养分析
- 请求体：

```json
{
  "items": [
    {
      "food_name": "米饭",
      "weight_g": 150,
      "nutrition": {
        "calories": 174,
        "protein": 3,
        "fat": 0,
        "carbs": 39,
        "fiber": 0,
        "sodium": 2,
        "sugar": 0
      }
    }
  ]
}
```

- 响应根字段：

| 字段 | 说明 |
|---|---|
| `totals` | 汇总营养值 |
| `macro_ratio` | 三大营养素供能占比 |
| `goal_checks` | 与目标的比较 |
| `warnings` | 风险提示 |
| `suggestions` | 规则建议 |
| `ai` | AI 分析结果 |

说明：

- 这个接口会结合当前用户的健康档案、目标和健康规则一起计算
- 即使没有可用模型，也会返回本地规则分析结果

## 10.5 `POST /api/ai/recommend`

- 鉴权：登录用户
- 作用：生成食谱推荐
- 请求体常用字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `keyword` | `string` | 关键字筛选 |
| `tag` | `string` | 标签筛选 |
| `exclude_names` | `string[]` | 需要排除的食谱名 |
| `refresh_round` | `number` | 换一批时递增 |
| `ai_enhance` | `boolean` | 是否启用 AI 强化推荐理由 |

- 响应：

```json
{
  "items": [
    {
      "recipe_id": 1001,
      "name": "清蒸鲈鱼",
      "library_scope": "server",
      "cuisine": "中式",
      "summary": "高蛋白、低油",
      "reason": "适合当前控盐目标",
      "tags": ["清淡", "高蛋白"],
      "suitable_for": ["高血压"],
      "nutrition": {
        "calories": 260,
        "protein": 36,
        "fat": 8,
        "carbs": 4,
        "fiber": 0,
        "sodium": 320,
        "sugar": 1
      },
      "source": "library",
      "cover_url": null,
      "source_url": null,
      "source_provider": null,
      "ingredients": [
        { "name": "鲈鱼", "amount": "1 条" }
      ],
      "steps": ["处理食材", "上锅蒸熟"]
    }
  ],
  "recipes": [ ... ],
  "local_recipes": [ ... ],
  "server_recipes": [ ... ],
  "provider": "rules",
  "message": "已使用本地规则快速推荐"
}
```

说明：

- 当前路由固定以“食谱库内候选”为主，不直接把外部食谱作为公开返回主结果
- 如果不传 `ai_enhance`，默认偏向规则推荐
- 推荐结果会按用户状态与请求参数缓存

## 11. 信息来源

- 路由定义：`backend/routes/auth.py`
- 路由定义：`backend/routes/profile.py`
- 路由定义：`backend/routes/meals.py`
- 路由定义：`backend/routes/dashboard.py`
- 路由定义：`backend/routes/recipes.py`
- 路由定义：`backend/routes/reminders.py`
- 路由定义：`backend/routes/admin.py`
- 路由定义：`backend/routes/ai.py`
- 前端类型对照：`SNCP-app/types/*.ts`
- 前端请求封装：`SNCP-app/services/*.ts`
