CREATE TABLE "channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filter_mode" text DEFAULT 'any' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE "guild" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
CREATE TABLE "paddle_customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_customer_discord_user_id_unique" UNIQUE("discord_user_id"),
	CONSTRAINT "paddle_customer_paddle_customer_id_unique" UNIQUE("paddle_customer_id")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"subscriber_discord_user_id" text NOT NULL,
	"status" text NOT NULL,
	"paddle_price_id" text,
	"billing_interval" text,
	"current_period_ends_at" timestamp with time zone,
	"scheduled_change_action" text,
	"scheduled_change_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"last_event_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_guild_id_unique" UNIQUE("guild_id"),
	CONSTRAINT "subscription_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_guild_id_guild_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("guild_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_guild_id_idx" ON "channel" USING btree ("guild_id");