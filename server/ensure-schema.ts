import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./vite";

async function addColumnIfMissing(query: string, description: string) {
  try {
    await db.execute(sql.raw(query));
  } catch (error) {
    log(`failed to ensure ${description}: ${(error as Error).message}`, "db");
    throw error;
  }
}

export async function ensureSchemaColumns() {
  await addColumnIfMissing(
    `ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    "sections.published_at",
  );

  await addColumnIfMissing(
    `ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "published_date_manual" boolean NOT NULL DEFAULT false`,
    "sections.published_date_manual",
  );

  await addColumnIfMissing(
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    "pages.updated_at",
  );

  await addColumnIfMissing(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_create_sections" boolean NOT NULL DEFAULT false`,
    "users.can_create_sections",
  );

  await addColumnIfMissing(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_edit_sections" boolean NOT NULL DEFAULT false`,
    "users.can_edit_sections",
  );

  await addColumnIfMissing(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_edit_own_sections" boolean NOT NULL DEFAULT false`,
    "users.can_edit_own_sections",
  );

  await addColumnIfMissing(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_delete_sections" boolean NOT NULL DEFAULT false`,
    "users.can_delete_sections",
  );

  await addColumnIfMissing(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_delete_own_sections" boolean NOT NULL DEFAULT false`,
    "users.can_delete_own_sections",
  );

  await addColumnIfMissing(
    `ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL`,
    "sections.created_by",
  );

  await addColumnIfMissing(
    `ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "created_by" varchar REFERENCES "users"("id") ON DELETE SET NULL`,
    "pages.created_by",
  );
}
