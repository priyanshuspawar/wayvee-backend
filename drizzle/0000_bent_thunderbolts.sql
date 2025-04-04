CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE "agents" (
	"userid" uuid PRIMARY KEY NOT NULL,
	"agency_name" varchar(255) NOT NULL,
	"about" text NOT NULL,
	"rating" numeric(8, 2) DEFAULT '0',
	"verified" boolean DEFAULT false,
	"membership" "membership" DEFAULT 'regular',
	"services_offered" text [] NOT NULL,
	"location" geometry(point) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstname" varchar(255) NOT NULL,
	"lastname" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"phone_number" varchar NOT NULL,
	"picture" varchar DEFAULT '' NOT NULL,
	"country_code" varchar(255) NOT NULL,
	"government_id" varchar(255),
	"is_agent" boolean DEFAULT false NOT NULL,
	"is_member" boolean DEFAULT false NOT NULL,
	"dateOfBirth" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"location" geometry(point) NOT NULL,
	"display_images" text [] NOT NULL,
	"rooms_description" json [] NOT NULL,
	"perks" text [] NOT NULL,
	"base_guest" integer NOT NULL,
	"price_per_night" numeric(8, 2) NOT NULL,
	"per_person_increment" numeric(8, 2) NOT NULL,
	"max_occupancy" integer NOT NULL,
	"amenities" text [] NOT NULL,
	"availability" boolean NOT NULL,
	"key_points" json NOT NULL,
	"rating" numeric(8, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(8, 2) DEFAULT '0'
);
--> statement-breakpoint
ALTER TABLE "agents"
ADD CONSTRAINT "agents_userid_users_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stays"
ADD CONSTRAINT "stays_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "agent_userid_index" ON "agents" USING btree ("userid");
--> statement-breakpoint
CREATE INDEX "agents_spatial_index" ON "agents" USING gist ("location");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_phone_number_email_index" ON "users" USING btree ("id", "phone_number", "email");
--> statement-breakpoint
CREATE INDEX "stays_spatial_index" ON "stays" USING gist ("location");
--> statement-breakpoint
CREATE INDEX "stays_id_index" ON "stays" USING btree ("id");
--> statement-breakpoint
CREATE INDEX "stays_hostid_index" ON "stays" USING btree ("host_id");