CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

CREATE TABLE "workspace_invites" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "usedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_invites_tokenHash_key" ON "workspace_invites"("tokenHash");
CREATE INDEX "workspace_invites_workspaceId_idx" ON "workspace_invites"("workspaceId");
CREATE INDEX "workspace_invites_createdByUserId_idx" ON "workspace_invites"("createdByUserId");
CREATE INDEX "workspace_invites_usedByUserId_idx" ON "workspace_invites"("usedByUserId");

ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
