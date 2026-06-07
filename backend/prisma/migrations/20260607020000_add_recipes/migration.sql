CREATE TABLE "recipes" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dishId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recipes_workspaceId_idx" ON "recipes"("workspaceId");

CREATE INDEX "recipes_dishId_idx" ON "recipes"("dishId");

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
