import Image from "next/image";
import type { Me } from "@draftweek/shared";
import { Crest } from "@/components/cards/crest";
import { cx } from "@/components/primitives";

/** The signed-in player: their Strike picture when FTL has seen one, otherwise their crest in a circle. */
export function ManagerAvatar({ me, size = 34, className }: { me: Me; size?: number; className?: string }) {
  const url = me.strike?.avatarUrl ?? null;
  if (url) {
    return <Image src={url} alt="" width={size} height={size} className={cx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-full bg-fill-strong", className)} style={{ width: size, height: size }}>
      <Crest accountId={me.strike?.accountId ?? me.id} style="steady" size={size * 0.62} />
    </span>
  );
}
