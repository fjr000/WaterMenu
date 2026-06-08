# 前端类型安全规范

> 基于 `frontend/src/api/types.ts` 的真实源码，记录当前类型系统、类型组织方式和校验策略。

---

## 当前状态

- TypeScript 5.8
- Zod 4 用于表单校验
- 类型定义集中在 `src/api/types.ts`
- 后端 DTO + class-validator 是最终校验防线

---

## 类型组织

### API 类型（`src/api/types.ts`）

所有 API 相关类型集中定义：

```typescript
// 枚举类型
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

// 实体类型
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface Dish {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  mealTypes: MealType[];
  isActive: boolean;
  coverImage: DishImage | null;
  mealRecordCount: number;
  feedbackRatingAverage: number | null;
  createdAt: string;
  updatedAt: string;
}

// API 请求/响应类型
export interface MeResponse {
  user: User;
  workspace: Workspace;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateDishRequest {
  name: string;
  description?: string;
  mealTypes?: MealType[];
  isActive?: boolean;
}

export interface RecommendationCandidate {
  dish: Dish;
  score: number;
  weight: number;
  reasons: string[];
}

export interface RecommendationResponse {
  items: RecommendationCandidate[];
}

export interface BlindBoxResponse {
  item: RecommendationCandidate | null;
}

export interface RecommendationRequest {
  mealType?: MealType;
}

// 错误类型
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
```

---

## 表单校验（Zod）

### 登录表单

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type FormValues = z.infer<typeof schema>;
```

### 新增菜品表单

```typescript
const schema = z.object({
  name: z.string().min(1, "请输入菜品名称"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
```

---

## 类型使用模式

### API 调用类型

```typescript
// 查询
useQuery<MeResponse>({ queryFn: () => apiFetch<MeResponse>("/auth/me") });

// 变更
useMutation({
  mutationFn: (body: CreateDishRequest) =>
    apiFetch<Dish>("/dishes", { method: "POST", body: JSON.stringify(body) }),
});
```

### Props 类型

```typescript
interface Props {
  mealType: MealType | "";
  onMealTypeChange: (mt: MealType | "") => void;
  onRecommend: () => void;
  onBlindBox: () => void;
  // ... 其他 props
}

export function RecommendationPanel({ mealType, onMealTypeChange, ... }: Props)
```

---

## Good / Base / Bad Cases

- Good：API 类型集中在 `types.ts`，便于查找和维护
- Good：使用 Zod 做前端即时校验，后端 DTO 是最终防线
- Good：API 调用使用泛型确保类型安全
- Base：复杂表单可以使用 React Hook Form + Zod 组合
- Bad：在组件中定义 API 类型
- Bad：使用 `any` 或 `as any` 绕过类型检查
- Bad：前端类型与后端 DTO 不一致

---

## 常见错误

### 错误：类型定义分散

```typescript
// Bad: 在组件中定义类型
type Dish = { id: string; name: string; ... };

// Good: 集中在 types.ts
import type { Dish } from "../api/types.ts";
```

### 错误：使用 any 绕过检查

```typescript
// Bad
const data: any = await apiFetch("/dishes");

// Good
const data: Dish[] = await apiFetch("/dishes");
```
