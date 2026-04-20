DROP TABLE "paddle_customer";--> statement-breakpoint
CREATE TABLE "stripe_customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customer_discord_user_id_unique" UNIQUE("discord_user_id"),
	CONSTRAINT "stripe_customer_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "paddle_subscription_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "paddle_customer_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "paddle_product_id";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "paddle_price_id";--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripe_price_id" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "billing_interval" text DEFAULT 'month';--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");
