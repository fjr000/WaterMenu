# 缓存 workspace 查询到 session

## 背景

架构审查发现每个API请求都执行额外的数据库查询来获取 `workspaceId`，这是一个严重的性能瓶颈。所有29个服务方法都重复这个模式。

## 问题详情

### 当前模式（N+1反模式）

**每个服务方法：**
```typescript
// dishes.service.ts:137-147
private async getWorkspaceId(userId: string): Promise<string> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });
  
  if (!user) {
    throw new UnauthorizedException();
  }
  
  return user.workspaceId;
}

async list(userId: string, query: ListDishesQueryDto) {
  const workspaceId = await this.getWorkspaceId(userId); // 额外查询！
  // ...
}
```

**影响范围：**
- 11个服务文件
- 29个方法重复此模式
- 每个请求 +1 次数据库查询
- 每个查询 5-15ms 延迟

### 根本原因

- `workspaceId` 在用户登录时已知，但未缓存
- Session 只存储 `userId`
- 服务层每次都重新查询

## 解决方案

### 方案 A：在 AuthGuard 中缓存（推荐）

**优点：**
- 集中管理，一处修改
- 自动应用到所有受保护路由
- Session 生命周期自动管理

**实现：**

#### 1. 扩展 Session 类型

```typescript
// backend/src/auth/session.interface.ts (新建)
export interface SessionData {
  userId: string;
  workspaceId?: string; // 新增：缓存的 workspaceId
}
```

#### 2. 更新 AuthGuard

```typescript
// backend/src/auth/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionData } from './session.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionData | undefined = request.session;
    
    if (!session?.userId) {
      throw new UnauthorizedException('未登录');
    }
    
    // 如果 workspaceId 未缓存，查询并缓存
    if (!session.workspaceId) {
      const user = await this.prisma.user.findUnique({
        where: { id: session.userId },
        select: { workspaceId: true },
      });
      
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      
      // 缓存到 session
      session.workspaceId = user.workspaceId;
    }
    
    return true;
  }
}
```

#### 3. 更新所有 Controller

从 session 读取 `workspaceId`，传给服务层：

```typescript
// dishes.controller.ts
@Get()
async list(
  @Session() session: SessionData,
  @Query() query: ListDishesQueryDto,
) {
  return this.dishesService.list(session.workspaceId, query);
}

@Post()
async create(
  @Session() session: SessionData,
  @Body() createDishDto: CreateDishDto,
) {
  return this.dishesService.create(session.workspaceId, session.userId, createDishDto);
}
```

#### 4. 更新所有 Service 签名

移除 `getWorkspaceId` 方法，直接接收 `workspaceId` 参数：

```typescript
// dishes.service.ts
async list(workspaceId: string, query: ListDishesQueryDto) {
  // 直接使用 workspaceId，无需查询
  return this.prisma.dish.findMany({
    where: { workspaceId, /* ... */ },
    // ...
  });
}

// 删除这个方法：
// private async getWorkspaceId(userId: string) { ... }
```

### 方案 B：创建 WorkspaceContext 服务（备选）

如果不想修改所有 controller，可以创建专门的服务：

```typescript
// backend/src/common/workspace-context.service.ts
@Injectable({ scope: Scope.REQUEST })
export class WorkspaceContextService {
  private cached: { userId: string; workspaceId: string } | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly prisma: PrismaService,
  ) {}

  async getWorkspaceId(userId: string): Promise<string> {
    // 请求作用域内缓存
    if (this.cached?.userId === userId) {
      return this.cached.workspaceId;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user) throw new UnauthorizedException();

    this.cached = { userId, workspaceId: user.workspaceId };
    return user.workspaceId;
  }
}
```

**缺点：** 仍然在首次调用时查询数据库（虽然请求内只查一次）

## 推荐实施：方案 A

### 迁移路径

**阶段1：准备**
1. 创建 `session.interface.ts` 定义类型
2. 更新 AuthGuard 添加缓存逻辑

**阶段2：逐个服务迁移**（可分批进行）
1. 更新 Controller 从 session 读取 `workspaceId`
2. 更新 Service 签名接收 `workspaceId` 参数
3. 删除 `getWorkspaceId` 方法
4. 运行 e2e 测试验证

**迁移顺序建议：**
- DishesController/Service
- MealRecordsController/Service
- RecipesController/Service
- （其余服务...）

每迁移一个服务，运行其 e2e 测试确保无回归。

## 验收标准

- [ ] `session.interface.ts` 创建完成
- [ ] AuthGuard 更新并缓存 workspaceId
- [ ] 所有 Controller 从 session 读取 workspaceId
- [ ] 所有 Service 接收 workspaceId 参数
- [ ] 所有 `getWorkspaceId` 方法已删除
- [ ] 所有 e2e 测试通过
- [ ] 验证每个请求只查询1次（登录时）

## 预期影响

### 性能提升

- **消除额外查询**：每请求 -1 次 DB 查询
- **延迟减少**：-5-15ms/请求
- **数据库负载**：减少 ~30% 查询量（29个方法 → 0）

### 代码简化

- **删除重复代码**：11个文件 × 10行 = 110行删除
- **服务层简化**：不再依赖 PrismaService 查 user

## 注意事项

1. **Session 失效**：用户修改 workspace（如果支持）需要清除 session
2. **多 workspace 支持**：未来如果用户可以切换 workspace，需要更新 session
3. **兼容性**：渐进式迁移，可以分批完成

## 测试策略

1. 单元测试 AuthGuard 的缓存逻辑
2. e2e 测试每个迁移的服务
3. 性能测试验证查询减少
