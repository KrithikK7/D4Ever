ALTER TABLE "sections"
  ADD COLUMN "published_at" timestamp with time zone DEFAULT now(),
  ADD COLUMN "published_date_manual" boolean NOT NULL DEFAULT false;

ALTER TABLE "pages"
  ADD COLUMN "updated_at" timestamp with time zone NOT NULL DEFAULT now();
