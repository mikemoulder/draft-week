CREATE TABLE "squads" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"captain_id" text NOT NULL,
	"starters" text[] NOT NULL,
	"bench" text[] NOT NULL,
	"spent" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_member_id_league_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."league_members"("id") ON DELETE cascade ON UPDATE no action;