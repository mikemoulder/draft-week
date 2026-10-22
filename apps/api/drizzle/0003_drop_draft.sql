DROP TABLE "lineups" CASCADE;--> statement-breakpoint
DROP TABLE "picks" CASCADE;--> statement-breakpoint
ALTER TABLE "league_members" ADD COLUMN "budget_bonus" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "traders" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "strike_account_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "strike_address" text;--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "draft_started_at";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "draft_completed_at";