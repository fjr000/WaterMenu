-- CreateIndex: Dish list sorting optimization
CREATE INDEX "dishes_workspaceId_updatedAt_createdAt_id_idx" ON "dishes"("workspaceId", "updatedAt" DESC, "createdAt" DESC, "id" DESC);

-- CreateIndex: DishImage sorting optimization
CREATE INDEX "dish_images_dishId_sortOrder_createdAt_idx" ON "dish_images"("dishId", "sortOrder", "createdAt");

-- CreateIndex: DishVariant sorting optimization
CREATE INDEX "dish_variants_dishId_isActive_createdAt_id_idx" ON "dish_variants"("dishId", "isActive" DESC, "createdAt", "id");

-- CreateIndex: MealRecord list sorting optimization
CREATE INDEX "meal_records_workspaceId_eatenAt_createdAt_id_idx" ON "meal_records"("workspaceId", "eatenAt" DESC, "createdAt" DESC, "id" DESC);

-- CreateIndex: MealRecord date range query optimization
CREATE INDEX "meal_records_workspaceId_eatenAt_idx" ON "meal_records"("workspaceId", "eatenAt");

-- CreateIndex: Feedback rating filter optimization
CREATE INDEX "feedbacks_mealRecordId_rating_idx" ON "feedbacks"("mealRecordId", "rating");

-- CreateIndex: Feedback workspace rating filter optimization
CREATE INDEX "feedbacks_workspaceId_rating_idx" ON "feedbacks"("workspaceId", "rating");
