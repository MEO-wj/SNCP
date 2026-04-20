# 柠芯食伴

面向中老年人与慢性病人群的个性化膳食营养管理应用，覆盖「饮食记录、营养分析、健康提醒、食谱推荐、长期趋势」等核心场景。

## ✨ 已实现功能

- 手机号注册/登录，普通用户与管理员两类角色
- 饮食记录（餐次分类、手动录入）
- 健康档案与营养目标配置
- 今日看板：营养汇总、三大营养素占比、健康提醒与建议
- 长期趋势（默认30天能量趋势）
- 食谱推荐与管理（管理员维护食谱库）
- 健康禁忌规则管理（管理员配置、用户端提醒）
- AI 拍照识别记餐：前端支持拍照/选图，后端支持 OpenAI 视觉识别并映射到本地营养库
- AI 营养分析与个性化食谱推荐：支持 OpenAI 直连，也支持保留独立 AI_* 接口

## 🧱 项目结构

```
SNCP/
├── SNCP-app/          # Expo React Native 客户端
├── backend/           # Flask API 服务
└── docs/              # 设计与接口文档
```

## 🚀 快速开始

### 后端

```bash
cd backend
cp .env.example .env
python app.py
```

### 客户端

```bash
cd SNCP-app
npm install
cp .env.example .env
npm run start
```

> 客户端需要设置 `EXPO_PUBLIC_API_BASE_URL` 指向后端 API。

### AI 识别快速启用

如果你想直接启用拍照识别，而不是自己先训练 YOLO 模型，可以先走大模型方案：

```bash
# backend/.env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
```

如果未配置 `OPENAI_API_KEY`，后端仍然可以用 `hint_text` 做本地食物匹配，适合联调和演示。

## 📚 设计文档

- `docs/食伴程序设计.docx`
- `docs/程序UI.docx`

## 🧩 主要接口

详细接口请见 `docs/api_documentation.md`，以下为概览：

- 认证：`POST /api/auth/register`、`POST /api/auth/token`、`POST /api/auth/token/refresh`、`POST /api/auth/logout`、`GET /api/auth/me`
- 看板：`GET /api/dashboard/today`、`GET /api/dashboard/trend`
- 饮食记录：`GET /api/meals`、`POST /api/meals`
- 健康档案/目标：`GET/PUT /api/profile`、`GET/PUT /api/profile/goals`
- 食谱：`GET /api/recipes`、`POST /api/recipes`
- 提醒：`GET/POST/PUT/DELETE /api/reminders`
- 管理员：`GET/POST /api/admin/health_rules`
- AI：`POST /api/ai/recognize`、`POST /api/ai/analyze`、`POST /api/ai/recommend`

## 🔐 环境变量

- 后端：`backend/.env`（模板 `backend/.env.example`）
- 客户端：`SNCP-app/.env`（模板 `SNCP-app/.env.example`）

## 📄 许可证

版权所有 © 2024 [陈子俊](https://git.handywote.top/MEOwj/SNCP)
本项目采用非商业许可证，仅允许学习与研究用途。
