import Image from "next/image";
import type { TraderStyle } from "@draftweek/shared";
import { cx } from "@/components/primitives";
import { Crest } from "./crest";

/** The trader's own Strike avatar when they have one, otherwise their generated crest. */
export function TraderAvatar({
  accountId,
  style,
  avatarUrl,
  size = 40,
  className,
}: {
  accountId: string;
  style: TraderStyle;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (!avatarUrl) return <Crest accountId={accountId} style={style} size={size * 0.86} className={className} />;
  return (
    <Image
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      className={cx("shrink-0 rounded-full object-cover ring-2 ring-[var(--card-style,var(--line-strong))]", className)}
      style={{ width: size, height: size }}
    />
  );
}
