CREATE TYPE "public"."content_status" AS ENUM('idea', 'approved', 'scheduled', 'published');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"source_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"sector" text,
	"notes" text,
	"lead_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"publish_on" date NOT NULL,
	"channel" text NOT NULL,
	"segment" text,
	"title" text NOT NULL,
	"caption" text NOT NULL,
	"visual_brief" text,
	"proof_type" text,
	"cta" text,
	"status" "content_status" DEFAULT 'idea' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"source" text NOT NULL,
	"segment" text,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"value_cents" integer,
	"is_repeat" boolean DEFAULT false NOT NULL,
	"first_contact_on" date NOT NULL,
	"closed_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"client_id" uuid NOT NULL,
	"month" text NOT NULL,
	"commentary" jsonb,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_client_id_month_pk" PRIMARY KEY("client_id","month")
);
--> statement-breakpoint
CREATE TABLE "spend" (
	"client_id" uuid NOT NULL,
	"month" text NOT NULL,
	"amount_cents" integer NOT NULL,
	CONSTRAINT "spend_client_id_month_pk" PRIMARY KEY("client_id","month")
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend" ADD CONSTRAINT "spend_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;