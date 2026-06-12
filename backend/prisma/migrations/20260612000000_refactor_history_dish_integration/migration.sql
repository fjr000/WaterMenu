-- AlterTable: Add description column to dish_variants
ALTER TABLE "dish_variants" ADD COLUMN "description" TEXT;

-- Data cleanup: Delete meal records without dishId
DELETE FROM "meal_records" WHERE "dishId" IS NULL;

-- AlterTable: Make dishId NOT NULL and remove title column from meal_records
ALTER TABLE "meal_records" DROP COLUMN "title";
ALTER TABLE "meal_records" ALTER COLUMN "dishId" SET NOT NULL;

-- Update foreign key constraint: dish should be Restrict instead of SetNull
ALTER TABLE "meal_records" DROP CONSTRAINT "meal_records_dishId_fkey";
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_dishId_fkey"
  FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
