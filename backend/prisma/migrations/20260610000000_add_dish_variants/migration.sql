CREATE TYPE "DishVariantType" AS ENUM ('HOME_RECIPE', 'TAKEOUT', 'DINE_IN', 'OTHER');

CREATE TABLE "dish_variants" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dishId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "DishVariantType" NOT NULL DEFAULT 'OTHER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "dish_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dish_variants_dishId_name_key" ON "dish_variants"("dishId", "name");
CREATE INDEX "dish_variants_workspaceId_idx" ON "dish_variants"("workspaceId");
CREATE INDEX "dish_variants_dishId_idx" ON "dish_variants"("dishId");

ALTER TABLE "dish_variants" ADD CONSTRAINT "dish_variants_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_variants" ADD CONSTRAINT "dish_variants_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_records" ADD COLUMN "variantId" TEXT;
CREATE INDEX "meal_records_variantId_idx" ON "meal_records"("variantId");
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "dish_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
