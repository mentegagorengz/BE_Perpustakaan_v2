import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2 — Integritas Data:
 * 1. Normalisasi nilai enum `book_items.condition` ke Bahasa Inggris.
 * 2. `transactions.status` dari varchar → enum TransactionStatus.
 * 3. Soft delete: kolom `deleted_at` di users, books, book_items.
 * 4. Partial unique index `users.email` & `users.identification_number`
 *    (hanya untuk data aktif) sehingga user soft-deleted bisa mendaftar ulang.
 */
export class SoftDeleteAndEnums1785200000000 implements MigrationInterface {
  name = 'SoftDeleteAndEnums1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename enum values (aman bila sudah ke-rename / enum belum ada).
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_tab text := 'public.book_items_condition_enum';
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'book_items_condition_enum' AND n.nspname = 'public'
        ) THEN
          EXECUTE format('ALTER TYPE %s RENAME VALUE %L TO %L', enum_tab, 'BAIK', 'GOOD');
          EXECUTE format('ALTER TYPE %s RENAME VALUE %L TO %L', enum_tab, 'RUSAK_RINGAN', 'SLIGHTLY_DAMAGED');
          EXECUTE format('ALTER TYPE %s RENAME VALUE %L TO %L', enum_tab, 'RUSAK_BERAT', 'HEAVILY_DAMAGED');
        END IF;
      END
      $$;
    `);

    // 2. transactions.status menjadi enum TransactionStatus.
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_status_enum" AS ENUM('BORROWED', 'RETURNED', 'OVERDUE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "public"."transactions_status_enum" USING "status"::"public"."transactions_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'BORROWED'::"public"."transactions_status_enum"`,
    );

    // 3. Soft delete columns.
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_items" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );

    // 4. Partial unique index. Drop constraint unik lama yang mengunci
    //    email & identification_number agar user terhapus bisa daftar ulang.
    //    (Index dari constraint unik tidak bisa di-drop langsung; drop constraint-nya.)
    await queryRunner.query(`
      DO $$
      DECLARE
        r record;
      BEGIN
        FOR r IN
          SELECT c.conname FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON t.relnamespace = n.oid
          WHERE n.nspname = 'public'
            AND t.relname = 'users'
            AND c.contype = 'u'
            AND (
              pg_get_constraintdef(c.oid) ILIKE '%email%'
              OR pg_get_constraintdef(c.oid) ILIKE '%identification_number%'
            )
        LOOP
          EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END
      $$;
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email_active"
       ON "users" ("email")
       WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_identification_number_active"
       ON "users" ("identification_number")
       WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_identification_number_active"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email_active"`);

    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "status" TYPE character varying USING "status"::character varying`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."transactions_status_enum"`,
    );

    await queryRunner.query(
      `ALTER TABLE "book_items" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`,
    );

    // Rename balik enum condition (guard bila enumerated tidak ada).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE t.typname = 'book_items_condition_enum' AND n.nspname = 'public'
        ) THEN
          EXECUTE format('ALTER TYPE public.book_items_condition_enum RENAME VALUE %L TO %L', 'GOOD', 'BAIK');
          EXECUTE format('ALTER TYPE public.book_items_condition_enum RENAME VALUE %L TO %L', 'SLIGHTLY_DAMAGED', 'RUSAK_RINGAN');
          EXECUTE format('ALTER TYPE public.book_items_condition_enum RENAME VALUE %L TO %L', 'HEAVILY_DAMAGED', 'RUSAK_BERAT');
        END IF;
      END
      $$;
    `);
  }
}
