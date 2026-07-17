ALTER TABLE "searches" ALTER COLUMN "must_haves" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "searches" ALTER COLUMN "must_haves" SET NOT NULL;