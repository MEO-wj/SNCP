# SNCP 接口约定

更新时间：2026-04-28

本文档定义当前项目已经落地的接口协议。新人联调时，优先以这里和 `backend/routes/*.py` 为准，不要凭印象猜字段。

## 1. 基础规则

### 1.1 基础路径

- 所有接口都挂在 `/api` 下
- 当前项目没有显式 `/v1` 版本前缀
- 健康检查接口：`GET /api/health`

### 1.2 编码与内容类型

- 请求与响应统一使用 UTF-8
- 默认 `Content-Type` 为 `application/json`

### 1.3 命名风格

- JSON 字段统一使用 `snake_case`
- Query 参数也统一使用 `snake_case`
- 时间字段使用 ISO 8601 字符串
- “按天查询”类参数使用 `YYYY-MM-DD`

## 2. 认证协议

### 2.1 令牌类型

登录和注册成功后会返回两种令牌：

- `access_token`：短期访问令牌，请放到 `Authorization: Bearer <token>`
- `refresh_token`：刷新会话用，前端需要安全保存

### 2.2 鉴权方式

受保护接口统一读取：

```http
Authorization: Bearer <access_token>
```

后端通过装饰器分三档权限：

- `login_required`
- `admin_required`
- `webmaster_required`

### 2.3 角色约定

- 普通用户：没有额外角色或角色数组为空
- `admin`：可访问管理后台与公共食谱维护
- `webmaster`：可授予/撤销其他用户的管理员权限

## 3. 时区协议

这个项目的“按天统计”是按用户本地日期算的，不是简单按服务器时间算。

前端请求头会带：

```http
X-Timezone-Offset-Minutes: -480
X-Client-Timezone: Asia/Shanghai
```

说明：

- `X-Timezone-Offset-Minutes` 使用 JS `Date.getTimezoneOffset()` 的语义
- 后端优先使用 `X-Client-Timezone`
- 如果时区名不可用，再退回到 offset
- 餐次时间最终统一存成 UTC

影响范围：

- `GET /api/meals`
- `GET /api/meals/range`
- `GET /api/dashboard/today`
- `GET /api/dashboard/trend`
- 管理后台的部分时间统计

## 4. 响应格式

### 4.1 成功响应

当前项目没有统一的 `{ code, data, message }` 包裹，成功响应直接返回业务对象，例如：

```json
{
  "profile": {
    "gender": "female"
  }
}
```

或：

```json
{
  "access_token": "...",
  "refresh_token": "..."
}
```

### 4.2 失败响应

失败时通常返回：

```json
{
  "error": "错误信息"
}
```

配合 HTTP 状态码使用，常见情况：

- `400` 参数错误
- `401` 未登录 / token 无效
- `403` 权限不足
- `404` 资源不存在
- `500` 服务端错误

### 4.3 特殊响应

- `DELETE /api/meals/{meal_id}` 成功时返回 `204 No Content`

## 5. 字段与业务语义约定

### 5.1 ID 类型

- 用户 ID：UUID 字符串
- 餐次、提醒、健康规则：整数 ID
- 食谱：
  - 数据库食谱通常是整数 ID
  - 外部食谱或内置食谱可能是字符串 ID

### 5.2 `scope` 语义

食谱相关接口使用：

- `all`：公共 + 本地
- `local`：只看当前用户私有食谱
- `server`：只看公共食谱

同时约定：

- `recipes.user_id IS NULL` 表示公共食谱
- `recipes.user_id = 当前用户` 表示私有食谱

### 5.3 记餐幂等

`POST /api/meals` 支持 `client_request_id`：

- 同一用户、同一个 `client_request_id` 重复提交时，不会重复创建餐次
- 返回体中的 `created` 会告诉前端本次是否真的新建了记录

### 5.4 图片字段

项目里与图片相关的常见字段有三类：

- `image_base64`：AI 识图、食谱草稿抽取输入
- `avatar_image`：用户头像输入，后端会裁剪并压缩
- `cover_url`：食谱封面，可传远端 URL 或 `data:image/...;base64,...`

其中 `cover_url` 如果传的是 data URL，后端会把图片落盘到 `backend/static/uploads/recipe-covers/`。

## 6. 缓存与一致性协议

### 6.1 Redis 用途

Redis 在当前项目里主要有三类用途：

- 接口缓存
- 用户状态版本号
- 限流存储

### 6.2 用户状态版本号

以下数据变更后，后端会递增用户状态版本号：

- 餐次
- 健康档案
- 营养目标
- 用户私有食谱

公共食谱变更则会递增“全局食谱库版本号”。

### 6.3 缓存命中对象

- 今日看板：按用户 + 本地日期 + 状态版本缓存
- 食谱推荐：按用户 + 状态版本 + 推荐参数哈希缓存

## 7. AI 协议

### 7.1 能力入口

当前 AI 接口有四个：

- `/api/ai/recognize`
- `/api/ai/recipe-draft`
- `/api/ai/analyze`
- `/api/ai/recommend`

### 7.2 调用优先级

不同能力会根据环境变量选择不同提供方：

- 优先：独立远端 `AI_*` 接口
- 次选：智谱
- 再次：本地规则兜底
- 最后：本地规则 / 本地匹配

### 7.3 返回结果特点

AI 返回的数据里会被清掉私有 `_meta_*` 字段后再响应给前端，但后端会尽可能记录模型用量到 `ai_usage_logs`。

## 8. 当前接口风格的注意点

- 项目没有统一响应包裹，所以不同接口的根字段名可能不同，例如 `profile`、`goals`、`recipes`、`rule`。
- 不是所有“更新”都严格区分 `PUT` 和 `POST` 的语义，例如健康规则使用 `POST /api/admin/health_rules` 做新增或更新。
- 当前没有真正意义上的 REST 版本管理，接口字段一旦变更，前后端和文档必须同步修改。

## 9. 信息来源

- 入口与全局配置：`backend/app.py`
- 认证：`backend/routes/auth.py`、`backend/services/auth_service.py`
- 时区：`backend/utils/timezone_context.py`、`SNCP-app/services/api.ts`
- 缓存：`backend/services/cache_service.py`
- 具体接口：`backend/routes/*.py`
