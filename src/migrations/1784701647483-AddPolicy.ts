import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPolicy1784701647483 implements MigrationInterface {
    name = 'AddPolicy1784701647483'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "policy" ("id" SERIAL NOT NULL, "fine_per_day" numeric(10,2) NOT NULL DEFAULT '5000', "loan_duration_days" integer NOT NULL DEFAULT '7', "max_books_per_user" integer NOT NULL DEFAULT '3', CONSTRAINT "PK_9917b0c5e4286703cc656b1d39f" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "policy"`);
    }

}
