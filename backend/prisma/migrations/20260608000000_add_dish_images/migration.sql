-- CreateTable
CREATE TABLE "dish_images" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dish_images_workspaceId_idx" ON "dish_images"("workspaceId");

-- CreateIndex
CREATE INDEX "dish_images_dishId_idx" ON "dish_images"("dishId");

-- AddForeignKey
ALTER TABLE "dish_images" ADD CONSTRAINT "dish_images_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_images" ADD CONSTRAINT "dish_images_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
