import type { IconWeight } from "@phosphor-icons/react";
import { Anchor, Fire, Lightning, Waves } from "@phosphor-icons/react/dist/ssr";
import type { TraderStyle } from "@draftweek/shared";

const ICONS = { degen: Fire, scalper: Lightning, swing: Waves, steady: Anchor } as const;

export function StyleIcon({ style, size = 16, weight = "fill" }: { style: TraderStyle; size?: number; weight?: IconWeight }) {
  const Icon = ICONS[style];
  return <Icon size={size} weight={weight} aria-hidden />;
}
