ALTER TABLE "stays" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stays" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;