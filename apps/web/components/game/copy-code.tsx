"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="group inline-flex items-center gap-3 rounded-chip border border-line-strong bg-fill px-4 py-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard refused (some in-app browsers): the code is on screen to copy by hand.
        }
      }}
      aria-label={`Copy invite code ${code}`}
    >
      <span className="t-num text-[22px] tracking-[0.12em]">{code}</span>
      {copied ? <Check size={18} weight="bold" className="text-success" aria-hidden /> : <Copy size={18} weight="duotone" className="text-fg-mute group-hover:text-fg" aria-hidden />}
      <span className="t-label">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
