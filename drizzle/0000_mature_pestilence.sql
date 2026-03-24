CREATE TYPE "public"."agent_type" AS ENUM('sales_agent', 'rsr');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('corporation', 'partnership', 'sole_proprietor', 'cooperative', 'other');--> statement-breakpoint
CREATE TYPE "public"."cis_status" AS ENUM('draft', 'submitted', 'pending_endorsement', 'pending_legal_review', 'pending_finance_review', 'pending_approval', 'approved', 'erp_encoded', 'denied', 'returned');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('standard', 'fs_petroleum', 'special');--> statement-breakpoint
CREATE TYPE "public"."notif_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notif_type" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('sales_agent', 'rsr', 'sales_manager', 'rsr_manager', 'finance_reviewer', 'legal_approver', 'senior_approver', 'sales_support', 'admin');--> statement-breakpoint
CREATE TYPE "public"."workflow_action" AS ENUM('submitted', 'endorsed', 'returned', 'forwarded_to_legal', 'forwarded_to_finance', 'forwarded_to_approver', 'approved', 'denied', 'erp_encoded');--> statement-breakpoint
CREATE TABLE "cis_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"agent_code" varchar(50) NOT NULL,
	"agent_type" "agent_type" NOT NULL,
	"customer_type" "customer_type" NOT NULL,
	"status" "cis_status" DEFAULT 'draft' NOT NULL,
	"trade_name" varchar(255),
	"contact_person" varchar(255),
	"contact_number" varchar(50),
	"email_address" varchar(255),
	"business_address" text,
	"city_municipality" varchar(255),
	"business_type" "business_type",
	"tin_number" varchar(50),
	"additional_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cis_submissions_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cis_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" "notif_type" DEFAULT 'in_app' NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"status" "notif_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'sales_agent' NOT NULL,
	"agent_code" varchar(50),
	"agent_type" "agent_type",
	"manager_id" uuid,
	"is_active" boolean DEFAULT false NOT NULL,
	"avatar_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cis_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" "workflow_action" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD CONSTRAINT "cis_submissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_cis_id_cis_submissions_id_fk" FOREIGN KEY ("cis_id") REFERENCES "public"."cis_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_cis_id_cis_submissions_id_fk" FOREIGN KEY ("cis_id") REFERENCES "public"."cis_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;