CREATE TABLE "fills" (
	"id" bigint PRIMARY KEY NOT NULL,
	"trade_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"account_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"role" text NOT NULL,
	"price" double precision NOT NULL,
	"size" double precision NOT NULL,
	"realized_pnl" double precision NOT NULL,
	"fee" double precision NOT NULL,
	"leverage" integer,
	"auto_close_type" text,
	"is_copy" boolean DEFAULT false NOT NULL,
	"ts" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingest_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"traders" integer,
	"fills_inserted" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "ingest_state" (
	"account_id" text PRIMARY KEY NOT NULL,
	"last_trade_id" bigint,
	"last_run_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "trader_days" (
	"week_id" text NOT NULL,
	"account_id" text NOT NULL,
	"day" smallint NOT NULL,
	"pnl" double precision NOT NULL,
	"trades" integer NOT NULL,
	"closes" integer NOT NULL,
	"wins" integer NOT NULL,
	"liquidations" integer NOT NULL,
	"first_liquidation_at" timestamp with time zone,
	"avg_leverage" double precision,
	"equity_ref" double precision NOT NULL,
	"points" integer NOT NULL,
	"scoring_version" smallint NOT NULL,
	CONSTRAINT "trader_days_week_id_account_id_day_pk" PRIMARY KEY("week_id","account_id","day")
);
--> statement-breakpoint
CREATE TABLE "trader_equity" (
	"account_id" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"equity" double precision NOT NULL,
	CONSTRAINT "trader_equity_account_id_observed_at_pk" PRIMARY KEY("account_id","observed_at")
);
--> statement-breakpoint
CREATE TABLE "traders" (
	"account_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ada_handle" text,
	"nickname" text,
	"blockchain_address" text,
	"opted_out" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fills_account_ts_idx" ON "fills" USING btree ("account_id","ts");--> statement-breakpoint
CREATE INDEX "trader_days_account_idx" ON "trader_days" USING btree ("account_id");