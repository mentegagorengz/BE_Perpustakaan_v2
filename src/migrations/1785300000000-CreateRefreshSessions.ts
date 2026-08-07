import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P5 — Refresh Token Rotation: sesi berupa turnaround token random yang di-hash
 * (SHA-256) sehingga raw token tidak pernah tersimpan. `previous_token_hash`
 * menampung token hasil rotasi sebelumnya untuk mendukung grace period.
 */
export class CreateRefreshSessions1785300000000 implements MigrationInterface {
  name = 'CreateRefreshSessions1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token_hash" character varying(64) NOT NULL,
        "previous_token_hash" character varying(64),
        "user_id" integer,
        "expires_at" TIMESTAMP NOT NULL,
        "grace_expires_at" TIMESTAMP,
        "revoked_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_refresh_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_previous_token_hash" ON "refresh_sessions" ("previous_token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_sessions_user_id" ON "refresh_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions"
       ADD CONSTRAINT "FK_refresh_sessions_user"
       FOREIGN KEY ("user_id") REFERENCES "users"("id")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" DROP CONSTRAINT IF EXISTS "FK_refresh_sessions_user"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_sessions_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_sessions_previous_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
  }
}
