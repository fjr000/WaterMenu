# 前端状态管理规范

> 基于 `frontend/` 的真实源码，记录当前状态管理方案、状态分类和数据流。

---

## 当前状态

- 服务端数据：TanStack Query 5 管理
- 本地 UI 状态：React useState/useReducer
- 认证状态：React Context + TanStack Query
- MVP 不引入 Redux/Zustand

---

## 状态分类

### 服务端数据（TanStack Query）

- 当前用户信息：`["auth", "me"]`
- 菜品列表：`["dishes", mealType]`
- 推荐结果：通过 mutation 返回
- 盲盒结果：通过 mutation 返回

### 本地 UI 状态（React 状态）

- 表单输入：React Hook Form 管理
- 当前 tab：`useState`
- 餐次筛选：`useState`
- 新增表单显示/隐藏：`useState`

### 认证状态（Context）

- `AuthProvider`：封装认证逻辑
- `useAuth()`：获取用户信息、workspace、加载状态、logout 函数

---

## 数据流模式

### 服务端数据流

```
组件 -> useDishes() -> TanStack Query -> apiFetch -> 后端 API
                ↓
            缓存 + 自动刷新
```

### 变更数据流

```
组件 -> useCreateDish() -> mutation -> apiFetch -> 后端 API
                ↓
            onSuccess -> invalidateQueries -> 自动刷新列表
```

### 认证数据流

```
App -> AuthProvider -> useQuery(["auth", "me"]) -> apiFetch("/auth/me")
                ↓
            Context -> useAuth() -> 组件
```

---

## Query Key 约定

```typescript
// 带参数的查询
const dishesKey = (mealType?: MealType): QueryKey => [
  "dishes",
  mealType ?? null,
];

// 使用示例
useQuery({ queryKey: dishesKey(mealType), queryFn: ... })

// 失效示例
queryClient.invalidateQueries({ queryKey: ["dishes"] })
```

---

## Good / Base / Bad Cases

- Good：菜品列表、当前用户等服务端数据通过 TanStack Query 获取和刷新
- Good：弹窗开关、当前 tab、筛选状态使用 React 本地状态
- Good：变更成功后失效相关查询，自动刷新列表
- Base：复杂表单状态使用 React Hook Form
- Bad：把菜品列表和用餐记录放入 Redux/Zustand 作为真实数据源
- Bad：在组件中直接调用 apiFetch 管理数据
- Bad：手动管理缓存和刷新逻辑

---

## 常见错误

### 错误：把服务端数据放入全局 store

```typescript
// Bad: Redux/Zustand 管理服务端数据
const useDishStore = create((set) => ({
  dishes: [],
  fetchDishes: async () => {
    const dishes = await apiFetch("/dishes");
    set({ dishes });
  },
}));

// Good: TanStack Query 管理服务端数据
function useDishes() {
  return useQuery({
    queryKey: ["dishes"],
    queryFn: () => apiFetch("/dishes"),
  });
}
```

### 错误：手动管理缓存失效

```typescript
// Bad: 手动更新本地状态
const [dishes, setDishes] = useState([]);
const createDish = async (body) => {
  await apiFetch("/dishes", { method: "POST", body: JSON.stringify(body) });
  const newDishes = await apiFetch("/dishes");
  setDishes(newDishes);
};

// Good: TanStack Query 自动管理
const { data: dishes } = useDishes();
const createDish = useCreateDish(); // 内部自动 invalidateQueries
```
