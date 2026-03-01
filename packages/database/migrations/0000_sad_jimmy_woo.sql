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
ALTER TABLE "channel" ADD CONSTRAINT "channel_guild_id_guild_guild_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guild"("guild_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_guild_id_idx" ON "channel" USING btree ("guild_id");
