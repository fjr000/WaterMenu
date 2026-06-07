CREATE TYPE "FeedbackRating" AS ENUM ('GOOD', 'OK', 'BAD');

CREATE TABLE "meal_records" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dishId" TEXT,
  "title" TEXT NOT NULL,
  "mealType" "MealType" NOT NULL,
  "eatenAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedbacks" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "mealRecordId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" "FeedbackRating" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meal_records_workspaceId_idx" ON "meal_records"("workspaceId");

CREATE INDEX "meal_records_dishId_idx" ON "meal_records"("dishId");

CREATE UNIQUE INDEX "feedbacks_mealRecordId_userId_key" ON "feedbacks"("mealRecordId", "userId");

CREATE INDEX "feedbacks_workspaceId_idx" ON "feedbacks"("workspaceId");

CREATE INDEX "feedbacks_userId_idx" ON "feedbacks"("userId");

ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_mealRecordId_fkey" FOREIGN KEY ("mealRecordId") REFERENCES "meal_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
