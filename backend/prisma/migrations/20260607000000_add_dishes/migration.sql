CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

CREATE TABLE "dishes" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "mealTypes" "MealType"[] NOT NULL DEFAULT ARRAY['LUNCH', 'DINNER']::"MealType"[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dishes_workspaceId_name_key" ON "dishes"("workspaceId", "name");

CREATE INDEX "dishes_workspaceId_idx" ON "dishes"("workspaceId");

ALTER TABLE "dishes" ADD CONSTRAINT "dishes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
