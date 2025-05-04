ALTER TABLE "users" DROP CONSTRAINT "users_phone_number_unique";--> statement-breakpoint
DROP INDEX "user_id_phone_number_email_index";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "country_code" SET DEFAULT 'IN';--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_phone_number_email_index" ON "users" USING btree ("id","email");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_number";