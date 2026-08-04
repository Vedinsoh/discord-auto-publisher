CREATE TABLE "bot_presence" (
	"guild_id" text NOT NULL,
	"edition" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "bot_presence_guild_id_edition_pk" PRIMARY KEY("guild_id","edition"),
	CONSTRAINT "bot_presence_edition_check" CHECK ("bot_presence"."edition" IN ('free', 'premium'))
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"channel_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filter_mode" text DEFAULT 'all' NOT NULL,
	"paused_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"migrated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"subscriber_discord_user_id" text,
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
ALTER TABLE "bot_presence" ADD CONSTRAINT "bot_presence_guild_id_guild_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("guild_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_guild_id_guild_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("guild_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_guild_id_idx" ON "channel" USING btree ("guild_id");