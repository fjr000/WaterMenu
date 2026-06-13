-- CreateTable: WorkspaceMember (多对多关系表)
CREATE TABLE "workspace_members" (
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("userId","workspaceId")
);

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing User data to WorkspaceMember
INSERT INTO "workspace_members" ("userId", "workspaceId", "role", "createdAt", "updatedAt")
SELECT "id", "workspaceId", "role", "createdAt", "updatedAt"
FROM "users";

-- DropForeignKey: Remove old User -> Workspace relation
ALTER TABLE "users" DROP CONSTRAINT "users_workspaceId_fkey";

-- DropIndex: Remove old workspace index
DROP INDEX "users_workspaceId_idx";

-- AlterTable: Remove workspaceId and role from users
ALTER TABLE "users" DROP COLUMN "workspaceId";
ALTER TABLE "users" DROP COLUMN "role";

-- AlterTable: Add deletedAt to dishes (soft delete)
ALTER TABLE "dishes" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add version and isActive to recipes
ALTER TABLE "recipes" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "recipes" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Add unique constraint on recipes (dishId, version)
CREATE UNIQUE INDEX "recipes_dishId_version_key" ON "recipes"("dishId", "version");
