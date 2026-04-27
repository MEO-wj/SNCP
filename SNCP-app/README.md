# SNCP App

`SNCP-app` 是项目的客户端，基于 Expo React Native 构建，当前同时面向 Android、iOS 和 Web。

## 目录作用

```text
SNCP-app/
├── app/         # 页面路由
├── components/  # 共享组件
├── constants/   # 常量与本地食物库
├── hooks/       # 共享 hooks
├── services/    # API 调用层
├── storage/     # 本地存储封装
├── types/       # 前端类型定义
├── utils/       # 纯工具函数
└── assets/      # 静态资源
```

## 技术栈

- Expo 54
- React 19
- React Native 0.81
- expo-router 6
- TypeScript 5.9
- SecureStore / AsyncStorage

## 页面结构

### 认证入口

- `app/login.tsx`
- `app/register.tsx`

### 主功能 Tab

- `app/(tabs)/index.tsx`：今日看板
- `app/(tabs)/record.tsx`：记餐
- `app/(tabs)/recommend.tsx`：推荐
- `app/(tabs)/trend.tsx`：趋势
- `app/(tabs)/settings/index.tsx`：个人中心

### 业务页面

- `app/ai-recognize.tsx`
- `app/meal-history.tsx`
- `app/reminders.tsx`
- `app/recipes/[postId].tsx`

### 管理页

- `app/admin/health-rules.tsx`
- `app/admin/recipes.tsx`
- `app/admin/users/[userId].tsx`

## 服务层约定

前端不直接拼业务逻辑到页面里，接口请求统一收敛到 `services/`：

- `services/auth.ts`：前台会话刷新
- `services/account.ts`：当前用户信息和密码修改
- `services/profile.ts`：健康档案与目标
- `services/meals.ts`：餐次
- `services/dashboard.ts`：看板与趋势
- `services/recipes.ts`：食谱
- `services/reminders.ts`：提醒
- `services/admin-dashboard.ts`：后台接口
- `services/ai.ts`：AI 能力调用

## 本地启动

### 安装依赖

```bash
npm install
```

### 环境变量

复制：

```bash
copy .env.example .env
```

核心变量：

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4420/api
```

说明：

- Android 模拟器里如果配置成 `127.0.0.1`，服务层会自动改写成 `10.0.2.2`
- 生产构建若未注入该变量，会回退到代码中的线上默认地址

### 启动命令

```bash
npm run start
```

也可以直接：

```bash
npm run android
npm run ios
npm run web
```

## 常用开发检查

```bash
npm run lint
```

## 新人最该先看哪些文件

1. `app/_layout.tsx`
2. `app/(tabs)/_layout.tsx`
3. `services/api.ts`
4. `services/meals.ts`
5. `services/ai.ts`

## 开发注意点

- 认证状态由 `hooks/use-auth-token.ts` 管理
- token 在 App 端放 `SecureStore`，Web 端放 `localStorage`
- 页面日期相关请求会自动带时区头，别把这些头删掉
- 如果你改了接口字段，记得同步改 `types/` 和 `services/`

## 相关文档

- [`../docs/README.md`](../docs/README.md)
- [`../docs/api_documentation.md`](../docs/api_documentation.md)
- [`../docs/01-product/api-conventions.md`](../docs/01-product/api-conventions.md)
