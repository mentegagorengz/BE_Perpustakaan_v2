import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1784556864414 implements MigrationInterface {
  name = 'InitSchema1784556864414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'STAFF', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_category_enum" AS ENUM('STUDENT', 'LECTURER', 'LIBRARY_STAFF', 'PUBLIC')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "identification_number" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "full_name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "category" "public"."users_category_enum" NOT NULL DEFAULT 'STUDENT', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bad68fff2dd56b25a1f4c15006c" UNIQUE ("identification_number"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "publishers" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "address" text, CONSTRAINT "UQ_39082806f986a63cd7dcf1782a5" UNIQUE ("name"), CONSTRAINT "PK_9d73f23749dca512efc3ccbea6a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "languages" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(10), CONSTRAINT "UQ_9c0e155475f0aa782e4a6178969" UNIQUE ("name"), CONSTRAINT "UQ_7397752718d1c9eb873722ec9b2" UNIQUE ("code"), CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "authors" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "bio" text, CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "books" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "sub_title" text, "isbn_13" character varying(13), "isbn_10" character varying(10), "published_year" integer, "description" text, "image_url" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "category_id" integer, "publisher_id" integer, "language_id" integer, CONSTRAINT "UQ_1080c2fda97cd9d763cd08638fa" UNIQUE ("isbn_13"), CONSTRAINT "UQ_a0dfb182cee6516fa43b81c3a80" UNIQUE ("isbn_10"), CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."book_items_status_enum" AS ENUM('AVAILABLE', 'RESERVED', 'BORROWED', 'LOST', 'DAMAGED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."book_items_condition_enum" AS ENUM('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "book_items" ("id" SERIAL NOT NULL, "barcode" character varying NOT NULL, "status" "public"."book_items_status_enum" NOT NULL DEFAULT 'AVAILABLE', "condition" "public"."book_items_condition_enum" NOT NULL DEFAULT 'BAIK', "added_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "book_id" integer, CONSTRAINT "UQ_3e83077f3abf115a0cbc52b0bcd" UNIQUE ("barcode"), CONSTRAINT "PK_d347f7337df5bc6312fbd576b39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" SERIAL NOT NULL, "borrowed_at" TIMESTAMP NOT NULL DEFAULT now(), "due_date" TIMESTAMP, "returned_at" TIMESTAMP, "fine_amount" numeric(10,2) NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'BORROWED', "user_id" integer, "book_item_id" integer, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "articles" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "image_url" character varying, "is_published" boolean NOT NULL DEFAULT true, "author_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_logs" ("id" SERIAL NOT NULL, "action" character varying NOT NULL, "module" character varying NOT NULL, "details" text, "ip_address" character varying, "device_info" text, "status" character varying NOT NULL DEFAULT 'SUCCESS', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "book_authors" ("book_id" integer NOT NULL, "author_id" integer NOT NULL, CONSTRAINT "PK_75172094a131109db714f4f2bc7" PRIMARY KEY ("book_id", "author_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d68802baf370cd6818cad7a50" ON "book_authors" ("book_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6fb8ac32a0a0bbca076b2cf7c5" ON "book_authors" ("author_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_46f5b35b90175a660f99810bc97" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_370ec5bbafd46f74b23a20a5298" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" ADD CONSTRAINT "FK_3164a2958d73d8cdebe5204c838" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_items" ADD CONSTRAINT "FK_d94922c63a4327f344e904901f7" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_e7796b52bb53cca7085813d3eec" FOREIGN KEY ("book_item_id") REFERENCES "book_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d54f841fa5478e4734590d44036" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" ADD CONSTRAINT "FK_1d68802baf370cd6818cad7a503" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" ADD CONSTRAINT "FK_6fb8ac32a0a0bbca076b2cf7c5a" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "book_authors" DROP CONSTRAINT "FK_6fb8ac32a0a0bbca076b2cf7c5a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_authors" DROP CONSTRAINT "FK_1d68802baf370cd6818cad7a503"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d54f841fa5478e4734590d44036"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_e7796b52bb53cca7085813d3eec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "book_items" DROP CONSTRAINT "FK_d94922c63a4327f344e904901f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" DROP CONSTRAINT "FK_3164a2958d73d8cdebe5204c838"`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" DROP CONSTRAINT "FK_370ec5bbafd46f74b23a20a5298"`,
    );
    await queryRunner.query(
      `ALTER TABLE "books" DROP CONSTRAINT "FK_46f5b35b90175a660f99810bc97"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6fb8ac32a0a0bbca076b2cf7c5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1d68802baf370cd6818cad7a50"`,
    );
    await queryRunner.query(`DROP TABLE "book_authors"`);
    await queryRunner.query(`DROP TABLE "activity_logs"`);
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "book_items"`);
    await queryRunner.query(`DROP TYPE "public"."book_items_condition_enum"`);
    await queryRunner.query(`DROP TYPE "public"."book_items_status_enum"`);
    await queryRunner.query(`DROP TABLE "books"`);
    await queryRunner.query(`DROP TABLE "authors"`);
    await queryRunner.query(`DROP TABLE "languages"`);
    await queryRunner.query(`DROP TABLE "publishers"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
