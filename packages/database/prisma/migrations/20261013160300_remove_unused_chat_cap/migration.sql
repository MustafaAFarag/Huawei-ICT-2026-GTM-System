-- Remove an unused column introduced during member-cap implementation.
-- Abort rather than discard data if any writer unexpectedly used it.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ChatMessage" WHERE "creditCap" IS NOT NULL) THEN
    RAISE EXCEPTION 'Unused chat creditCap contains data; review before removal';
  END IF;
END $$;
ALTER TABLE "ChatMessage" DROP COLUMN "creditCap";
