CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE TYPE "public"."membership" AS ENUM('regular', 'pro');
--> statement-breakpoint
CREATE TABLE "agents" (
	"userid" uuid PRIMARY KEY NOT NULL,
	"agency_name" varchar(255) NOT NULL,
	"about" text NOT NULL,
	"rating" numeric(8, 2) DEFAULT '0',
	"verified" boolean DEFAULT false,
	"membership" "membership" DEFAULT 'regular',
	"services_offered" text [] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"location" geometry(point) NOT NULL,
	"label" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstname" varchar(255) NOT NULL,
	"lastname" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"picture" varchar DEFAULT '' NOT NULL,
	"country_code" varchar(255) DEFAULT 'IN',
	"government_id" varchar(255),
	"is_agent" boolean DEFAULT false NOT NULL,
	"is_member" boolean DEFAULT false NOT NULL,
	"dateOfBirth" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "stays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"host_id" uuid NOT NULL,
	"title" varchar(255),
	"location" geometry(point),
	"display_images" json [] DEFAULT '{}',
	"perks" text [] DEFAULT '{}',
	"base_guest" integer DEFAULT 1,
	"bedrooms" integer,
	"bathrooms" integer,
	"price_per_night" numeric(8, 2),
	"per_person_increment" numeric(8, 2),
	"max_occupancy" integer,
	"amenities" text [] DEFAULT '{}',
	"availability" boolean,
	"type_of_stay" char,
	"property_access" char,
	"rating" numeric(8, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(8, 2) DEFAULT '0',
	"address" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents"
ADD CONSTRAINT "agents_userid_users_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_locations"
ADD CONSTRAINT "agent_locations_agent_id_agents_userid_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("userid") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stays"
ADD CONSTRAINT "stays_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "agent_userid_index" ON "agents" USING btree ("userid");
--> statement-breakpoint
CREATE INDEX "agent_id_index" ON "agent_locations" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX "agent_locations_spatial_index" ON "agent_locations" USING gist ("location");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_id_phone_number_email_index" ON "users" USING btree ("id", "email");
--> statement-breakpoint
CREATE INDEX "stays_spatial_index" ON "stays" USING gist ("location");
--> statement-breakpoint
CREATE INDEX "stays_id_index" ON "stays" USING btree ("id");
--> statement-breakpoint
CREATE INDEX "stays_hostid_index" ON "stays" USING btree ("host_id");