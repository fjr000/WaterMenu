-- AlterTable: Add instructions column, migrate data, then drop old columns
-- This migration is idempotent - it checks for column existence before operations

DO $$
BEGIN
  -- Add instructions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'recipes'
    AND column_name = 'instructions'
  ) THEN
    ALTER TABLE "recipes" ADD COLUMN "instructions" TEXT;

    -- Migrate data: combine title and content into instructions
    -- Format: "# {title}\n\n{content}"
    -- Handle edge cases: empty title or content
    UPDATE "recipes"
    SET "instructions" =
      CASE
        -- Both title and content exist
        WHEN TRIM(COALESCE("title", '')) != '' AND TRIM(COALESCE("content", '')) != ''
        THEN '# ' || TRIM("title") || E'\n\n' || TRIM("content")
        -- Only title exists
        WHEN TRIM(COALESCE("title", '')) != '' AND TRIM(COALESCE("content", '')) = ''
        THEN '# ' || TRIM("title")
        -- Only content exists
        WHEN TRIM(COALESCE("title", '')) = '' AND TRIM(COALESCE("content", '')) != ''
        THEN TRIM("content")
        -- Both empty (should not happen due to constraints, but handle it)
        ELSE '# 做法记录'
      END;

    -- Make instructions column NOT NULL
    ALTER TABLE "recipes" ALTER COLUMN "instructions" SET NOT NULL;

    -- Drop old columns
    ALTER TABLE "recipes" DROP COLUMN "title";
    ALTER TABLE "recipes" DROP COLUMN "content";
  END IF;
END $$;
