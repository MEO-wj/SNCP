# 食伴后端 API 文档

基础路径：`/api`

## 认证

### 注册
- `POST /auth/register`
- body: `{ "phone": "13800138000", "password": "******", "display_name": "张三" }`

### 登录
- `POST /auth/token`
- body: `{ "phone": "13800138000", "password": "******" }`

### 刷新令牌
- `POST /auth/token/refresh`

### 退出
- `POST /auth/logout`

### 当前用户
- `GET /auth/me`

## 健康看板

### 今日概览
- `GET /dashboard/today`
- 返回：热量、三大营养素占比、目标检查、健康提醒、建议、评分

### 趋势
- `GET /dashboard/trend?days=30`
- 返回：按日统计的营养汇总

## 饮食记录

### 新增餐次
- `POST /meals`
- body 示例：
```json
{
  "meal_type": "breakfast",
  "eaten_at": "2026-01-25T08:30:00",
  "items": [
    { "food_name": "清蒸鱼", "weight_g": 120, "source": "manual", "nutrition": {} }
  ]
}
```

### 查询某日
- `GET /meals?date=2026-01-25`

### 查询区间
- `GET /meals/range?start=2026-01-01&end=2026-01-31`

## 健康档案 & 目标

### 获取/更新档案
- `GET /profile`
- `PUT /profile`

### 获取/更新目标
- `GET /profile/goals`
- `PUT /profile/goals`

## 食谱

### 列表
- `GET /recipes?keyword=&tag=`

### 新增/更新/删除（管理员）
- `POST /recipes`
- `PUT /recipes/{id}`
- `DELETE /recipes/{id}`

## 提醒

### 列表
- `GET /reminders`

### 新增/更新/删除
- `POST /reminders`
- `PUT /reminders/{id}`
- `DELETE /reminders/{id}`

## 管理员：健康禁忌规则

### 列表
- `GET /admin/health_rules`

### 新增/更新
- `POST /admin/health_rules`

### 删除
- `DELETE /admin/health_rules/{id}`

## AI 能力

### 食物识别
- `POST /ai/recognize`
- body: `{ "image_base64": "...", "image_url": "...", "hint_text": "..." }`

### 营养分析
- `POST /ai/analyze`
- body: `{ "items": [ ... ] }`

### 食谱推荐
- `POST /ai/recommend`
