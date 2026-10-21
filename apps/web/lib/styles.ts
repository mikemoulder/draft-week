import type { CardTier, TraderStyle } from "@draftweek/shared";

export const STYLE_META: Record<TraderStyle, { label: string; blurb: string }> = {
  degen: { label: "Degen", blurb: "High leverage or repeated liquidations" },
  scalper: { label: "Scalper", blurb: "Dozens of trades a day" },
  swing: { label: "Swing", blurb: "A few trades, held longer" },
  steady: { label: "Steady", blurb: "Regular, measured trading" },
};

export const TIER_LABEL: Record<CardTier, string> = {
  legend: "Legend",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};
