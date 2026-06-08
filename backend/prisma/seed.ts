import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaceName = process.env.SEED_WORKSPACE_NAME ?? 'WaterMenu';
  const email = (process.env.SEED_USER_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? 'Admin';

  if (!password) {
    throw new Error('缺少 SEED_USER_PASSWORD，无法创建初始用户');
  }

  const workspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace' },
    update: { name: workspaceName },
    create: { id: 'seed-workspace', name: workspaceName },
  });

  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, workspaceId: workspace.id, role: UserRole.ADMIN },
    create: { email, name, passwordHash, workspaceId: workspace.id, role: UserRole.ADMIN },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    throw new Error(`Seed 执行失败：${error instanceof Error ? error.message : String(error)}`);
  });
